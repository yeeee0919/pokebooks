import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { newDraft } from './constants.js';

let _sql = null;

export function sql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = postgres(url, {
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // required for Supabase transaction pooler (port 6543)
  });
  return _sql;
}

export async function ensureSchema() {
  const db = sql();
  await db`CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
  )`;
  await db`CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await db`CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    draft_id TEXT,
    mime TEXT,
    bytes BYTEA,
    telegram_file_id TEXT,
    telegram_message_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await db`CREATE INDEX IF NOT EXISTS drafts_status_idx ON drafts (status)`;
  await db`CREATE TABLE IF NOT EXISTS telegram_updates (
    update_id BIGINT PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await db`ALTER TABLE photos ADD COLUMN IF NOT EXISTS telegram_file_id TEXT`;
  await db`ALTER TABLE photos ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS photos_draft_file_idx
    ON photos (draft_id, telegram_file_id) WHERE telegram_file_id IS NOT NULL`;
}

export async function metaGet(key) {
  const rows = await sql()`SELECT value FROM meta WHERE key = ${key}`;
  return rows[0]?.value ?? null;
}

export async function metaSet(key, value) {
  const db = sql();
  await db`
    INSERT INTO meta (key, value) VALUES (${key}, ${db.json(value)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

const EMPTY_LEDGER = {
  products: [],
  transactions: [],
  expenses: [],
  documents: [],
  settings: {
    company: 'Yi Trading',
    kvk: '42131151',
    companyStart: '2026-08-12',
    korStart: '2026-10-01',
    fiscalYear: 2026,
  },
};

export async function getLedger() {
  await ensureSchema();
  const row = await metaGet('ledger');
  if (!row) return { version: 0, ledger: structuredClone(EMPTY_LEDGER) };
  return { version: row.version || 0, ledger: row.ledger || EMPTY_LEDGER };
}

export async function putLedger(ledger, expectedVersion) {
  await ensureSchema();
  const current = await getLedger();
  if (expectedVersion != null && current.version !== expectedVersion) {
    return { ok: false, conflict: true, version: current.version, ledger: current.ledger };
  }
  const version = current.version + 1;
  await metaSet('ledger', { version, ledger, savedAt: new Date().toISOString() });
  return { ok: true, version, ledger };
}

function parseDraft(data) {
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function getDraft(id) {
  const rows = await sql()`SELECT data FROM drafts WHERE id = ${id}`;
  return parseDraft(rows[0]?.data);
}

export async function saveDraft(draft) {
  draft.updatedAt = new Date().toISOString();
  const db = sql();
  await db`
    INSERT INTO drafts (id, status, data, updated_at)
    VALUES (${draft.id}, ${draft.status}, ${db.json(draft)}, now())
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, data = EXCLUDED.data, updated_at = now()
  `;
  return draft;
}

/** Only one album handler should run OCR for a given photo count. */
export async function tryClaimAlbumExtract(draftId, photoCount) {
  const db = sql();
  const rows = await db`
    UPDATE drafts
    SET data = data || ${db.json({ lastExtractPhotoCount: photoCount })},
        updated_at = now()
    WHERE id = ${draftId}
      AND status = 'active'
      AND COALESCE((data->>'lastExtractPhotoCount')::int, 0) < ${photoCount}
    RETURNING data
  `;
  return parseDraft(rows[0]?.data);
}

export async function listDrafts(status) {
  const rows = status
    ? await sql()`SELECT data FROM drafts WHERE status = ${status} ORDER BY updated_at DESC`
    : await sql()`SELECT data FROM drafts WHERE status IN ('active','pending') ORDER BY updated_at DESC`;
  return rows.map(r => parseDraft(r.data));
}

export async function getActiveDraft(chatId = null) {
  if (chatId != null) return getActiveDraftForChat(chatId);
  const rows = await sql()`SELECT data FROM drafts WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1`;
  return parseDraft(rows[0]?.data);
}

export async function getActiveDraftForChat(chatId) {
  const cid = String(chatId);
  const rows = await sql()`
    SELECT data FROM drafts
    WHERE status = 'active' AND COALESCE(data->>'chatId', '') = ${cid}
    ORDER BY updated_at DESC
  `;
  const drafts = rows.map(r => parseDraft(r.data)).filter(Boolean);
  if (drafts.length <= 1) return drafts[0] || null;
  return reconcileActiveDraftsForChat(chatId);
}

/** Merge duplicate active drafts (concurrent photo webhooks) into one. */
export async function reconcileActiveDraftsForChat(chatId) {
  const cid = String(chatId);
  const rows = await sql()`
    SELECT data FROM drafts
    WHERE status = 'active' AND COALESCE(data->>'chatId', '') = ${cid}
    ORDER BY updated_at DESC
  `;
  const drafts = rows.map(r => parseDraft(r.data)).filter(Boolean);
  if (!drafts.length) return null;
  if (drafts.length === 1) return drafts[0];

  drafts.sort((a, b) => {
    const pa = (a.photos || []).length;
    const pb = (b.photos || []).length;
    if (pb !== pa) return pb - pa;
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
  const keep = drafts[0];
  for (const d of drafts.slice(1)) {
    await mergeDraftPhotos(d.id, keep.id);
    d.status = 'cancelled';
    await saveDraft(d);
  }
  return syncDraftPhotoList(await getDraft(keep.id));
}

export async function mergeDraftPhotos(fromDraftId, toDraftId) {
  if (!fromDraftId || !toDraftId || fromDraftId === toDraftId) return;
  await sql()`
    DELETE FROM photos f
    USING photos t
    WHERE f.draft_id = ${fromDraftId}
      AND t.draft_id = ${toDraftId}
      AND f.telegram_file_id IS NOT NULL
      AND f.telegram_file_id = t.telegram_file_id
  `;
  await sql()`UPDATE photos SET draft_id = ${toDraftId} WHERE draft_id = ${fromDraftId}`;
  await dedupePhotosForDraft(toDraftId);
}

export async function getOrCreateActiveDraft(chatId) {
  const cid = String(chatId);
  const existing = await getActiveDraftForChat(cid);
  if (existing) return existing;

  // Adopt a legacy active draft missing chatId (v1 single-user).
  const legacyRows = await sql()`
    SELECT data FROM drafts
    WHERE status = 'active' AND COALESCE(data->>'chatId', '') = ''
    ORDER BY updated_at DESC LIMIT 1
  `;
  if (legacyRows[0]) {
    const legacy = parseDraft(legacyRows[0].data);
    legacy.chatId = cid;
    await saveDraft(legacy);
    return legacy;
  }

  const draft = newDraft(randomUUID());
  draft.chatId = cid;
  await saveDraft(draft);

  const rows = await sql()`
    SELECT data FROM drafts
    WHERE status = 'active' AND COALESCE(data->>'chatId', '') = ${cid}
    ORDER BY updated_at DESC
  `;
  const drafts = rows.map(r => parseDraft(r.data)).filter(Boolean);
  if (drafts.length > 1) return reconcileActiveDraftsForChat(cid);
  return drafts[0] || draft;
}

export async function countPhotosForDraft(draftId) {
  await dedupePhotosForDraft(draftId);
  const rows = await sql()`SELECT COUNT(*)::int AS n FROM photos WHERE draft_id = ${draftId}`;
  return rows[0]?.n || 0;
}

export async function syncDraftPhotoList(draft) {
  if (!draft?.id) return draft;
  const rows = await sql()`
    SELECT id, mime FROM photos WHERE draft_id = ${draft.id} ORDER BY created_at ASC
  `;
  draft.photos = rows.map(r => ({ id: r.id, mime: r.mime || 'image/jpeg' }));
  return draft;
}

export async function tryConsumeTelegramUpdate(updateId) {
  if (updateId == null) return true;
  const rows = await sql()`
    INSERT INTO telegram_updates (update_id) VALUES (${updateId})
    ON CONFLICT (update_id) DO NOTHING
    RETURNING update_id
  `;
  return rows.length > 0;
}

export async function attachPhotoIfNew({ id, draftId, mime, bytes, telegramFileId, telegramMessageId }) {
  if (telegramFileId) {
    const dup = await sql()`
      SELECT id FROM photos
      WHERE draft_id = ${draftId} AND telegram_file_id = ${telegramFileId}
      LIMIT 1
    `;
    if (dup.length) return { added: false, id: dup[0].id };
  }
  await sql()`
    INSERT INTO photos (id, draft_id, mime, bytes, telegram_file_id, telegram_message_id)
    VALUES (${id}, ${draftId}, ${mime}, ${bytes}, ${telegramFileId || null}, ${telegramMessageId ?? null})
  `;
  return { added: true, id };
}

export async function deletePhotosForDraft(draftId) {
  if (!draftId) return;
  await sql()`DELETE FROM photos WHERE draft_id = ${draftId}`;
}

export async function dedupePhotosForDraft(draftId) {
  await sql()`
    DELETE FROM photos p
    USING photos p2
    WHERE p.draft_id = ${draftId}
      AND p2.draft_id = ${draftId}
      AND p.telegram_file_id IS NOT NULL
      AND p.telegram_file_id = p2.telegram_file_id
      AND p.created_at > p2.created_at
  `;
}

export async function listPhotosForDraft(draftId) {
  const rows = await sql()`
    SELECT id, mime, bytes FROM photos
    WHERE draft_id = ${draftId}
    ORDER BY created_at ASC
  `;
  return rows.map(r => ({
    id: r.id,
    mime: r.mime || 'image/jpeg',
    bytes: Buffer.isBuffer(r.bytes) ? r.bytes : Buffer.from(r.bytes || []),
  }));
}

export async function getPhoto(id) {
  const rows = await sql()`SELECT mime, bytes, draft_id FROM photos WHERE id = ${id}`;
  return rows[0] || null;
}

export async function getBind() {
  return (await metaGet('telegram_bind')) || { userId: null, pairedAt: null };
}

export async function setBind(userId) {
  await metaSet('telegram_bind', { userId: String(userId), pairedAt: new Date().toISOString() });
}

export async function getPairing() {
  return await metaGet('pairing');
}

export async function setPairing(code, expiresAt) {
  await metaSet('pairing', { code, expiresAt });
}

export async function clearPairing() {
  await metaSet('pairing', { code: null, expiresAt: null });
}
