import postgres from 'postgres';

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await db`CREATE INDEX IF NOT EXISTS drafts_status_idx ON drafts (status)`;
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

export async function getActiveDraft() {
  const rows = await sql()`SELECT data FROM drafts WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1`;
  return parseDraft(rows[0]?.data);
}

export async function savePhoto({ id, draftId, mime, bytes }) {
  await sql()`
    INSERT INTO photos (id, draft_id, mime, bytes)
    VALUES (${id}, ${draftId}, ${mime}, ${bytes})
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
