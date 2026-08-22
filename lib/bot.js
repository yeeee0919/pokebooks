import { randomUUID } from 'crypto';
import { newDraft, WAIT } from './constants.js';
import { applyAnswer, nextQuestion, applyDateDefault, prepareFx } from './conversation.js';
import { extractGuesses } from './extract.js';
import { fetchEcbRate } from './fx.js';
import { postDraftToLedger } from './post.js';
import { smartTurn } from './smartTurn.js';
import { searchProducts, parseKind, parseScope, parseCurrencyAmount } from './parse.js';
import {
  ensureSchema, getActiveDraft, saveDraft, listDrafts, getDraft,
  getLedger, putLedger, getBind, setBind, getPairing, clearPairing,
  savePhoto, listPhotosForDraft,
} from './db.js';
import { sendMessage, downloadTelegramFile, largestPhoto, isAllowedUser } from './telegram.js';

const ALBUM_SETTLE_MS = 2200;

async function fxLookup(currency) {
  try {
    return await fetchEcbRate(currency);
  } catch (e) {
    console.warn('[fx]', e);
    return null;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function handleUpdate(update) {
  const msg = update.message || update.edited_message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const fromId = msg.from?.id;
  const text = (msg.text || msg.caption || '').trim();
  const mediaGroupId = msg.media_group_id || null;

  await ensureSchema();
  const bind = await getBind();

  if (text.startsWith('/start')) {
    await handleStart(chatId, fromId, text);
    return;
  }

  if (!isAllowedUser(bind, fromId)) {
    await sendMessage(chatId, '未授權。請到 PokeLedger 設定產生配對碼，然後傳 /start 配對碼。');
    return;
  }

  const { ledger } = await getLedger();
  const settings = ledger.settings || {};
  const products = ledger.products || [];

  if (text.startsWith('/help')) {
    await sendMessage(chatId, helpText());
    return;
  }
  if (text.startsWith('/later')) {
    await cmdLater(chatId);
    return;
  }
  if (text.startsWith('/cancel')) {
    await cmdCancel(chatId);
    return;
  }
  if (text.startsWith('/pending')) {
    await cmdPending(chatId);
    return;
  }
  if (text.startsWith('/open')) {
    await cmdOpen(chatId, text);
    return;
  }

  const photo = largestPhoto(msg.photo);
  const docImage = msg.document && String(msg.document.mime_type || '').startsWith('image/')
    ? msg.document
    : null;
  const hasImage = !!(photo || docImage);

  let draft = await getActiveDraft();
  if (!draft && (hasImage || text)) {
    draft = newDraft(randomUUID());
    if (text && !text.startsWith('/')) {
      draft.seedText = text;
      draft.guesses = seedGuessesFromText(text);
    }
  }
  if (!draft) {
    await sendMessage(chatId, '傳照片或一句話開始記一筆。同一相簿／連續多張圖算同一單。/help');
    return;
  }

  // Extra photos always attach to the active draft (one order)
  const fileId = photo?.file_id || docImage?.file_id;
  let addedPhoto = false;
  if (fileId) {
    const file = await downloadTelegramFile(fileId);
    if (file) {
      const photoId = randomUUID();
      await savePhoto({ id: photoId, draftId: draft.id, mime: file.mime, bytes: file.bytes });
      draft.photos = draft.photos || [];
      draft.photos.push({ id: photoId, mime: file.mime });
      draft.lastPhotoAt = Date.now();
      if (mediaGroupId) draft.mediaGroupId = mediaGroupId;
      if (text && !text.startsWith('/')) {
        draft.seedText = [draft.seedText, text].filter(Boolean).join('\n');
      }
      addedPhoto = true;
      await saveDraft(draft);
    }
  }

  // Album / burst: wait for siblings, then extract once with ALL photos
  if (addedPhoto && (mediaGroupId || isPhotoBurst(draft))) {
    const countAtSave = (draft.photos || []).length;
    await sleep(ALBUM_SETTLE_MS);
    const latest = await getDraft(draft.id);
    if (!latest || latest.status !== 'active') return;
    if ((latest.photos || []).length !== countAtSave) return; // more photos still coming
    if ((latest.lastExtractPhotoCount || 0) >= countAtSave) return; // already settled
    latest.lastExtractPhotoCount = countAtSave;
    await saveDraft(latest);
    await refreshGuessesFromAllPhotos(latest, products);
    applyDateDefault(latest);
    await prepareFx(latest, fxLookup);
    const q = nextQuestion(latest, settings);
    latest.waitingFor = q.waitingFor;
    await saveDraft(latest);
    await sendMessage(chatId, `已收到 ${countAtSave} 張圖，當作同一單一起看過。\n\n${q.text}`);
    return;
  }

  if (addedPhoto) {
    await refreshGuessesFromAllPhotos(draft, products);
  } else if (text && !draft.fields.kind && draft.waitingFor === WAIT.KIND) {
    const guesses = await extractGuesses({ text, images: [] });
    draft.guesses = { ...(draft.guesses || {}), ...guesses };
  }

  applyDateDefault(draft);
  await prepareFx(draft, fxLookup);

  if (text && !text.startsWith('/')) {
    // Conversational layer for surprises; falls back to rigid Q&A
    let result = null;
    try {
      result = await smartTurn(draft, text, { settings, products, fxLookup });
    } catch (e) {
      console.warn('[smartTurn]', e);
    }
    if (!result) {
      result = await applyAnswer(draft, text, { settings, products, fxLookup });
    }
    draft = result.draft;
    if (result.posted) {
      const posted = await tryPost(draft, chatId);
      if (posted) return;
    }
    await saveDraft(draft);
    await sendMessage(chatId, result.replies.join('\n\n'));
    return;
  }

  if (addedPhoto) {
    const q = nextQuestion(draft, settings);
    draft.waitingFor = q.waitingFor;
    await saveDraft(draft);
    const n = (draft.photos || []).length;
    await sendMessage(chatId, `照片已附在這一筆（共 ${n} 張）。\n\n${q.text}`);
    return;
  }

  await saveDraft(draft);
  await sendMessage(chatId, '傳照片或回覆問題。多張圖請用相簿一次傳，或連續傳，都算同一單。');
}

function isPhotoBurst(draft) {
  const n = (draft.photos || []).length;
  if (n < 2) return false;
  const last = draft.lastPhotoAt || 0;
  return Date.now() - last < ALBUM_SETTLE_MS + 500;
}

async function refreshGuessesFromAllPhotos(draft, products) {
  const files = await listPhotosForDraft(draft.id);
  const images = files.map(f => ({ bytes: f.bytes, mime: f.mime }));
  if (!images.length && !draft.seedText) return;
  const guesses = await extractGuesses({ text: draft.seedText || '', images });
  draft.guesses = { ...(draft.guesses || {}), ...guesses };
  // Don't overwrite fields the user already confirmed
  if (guesses.currency && !draft.fields.amountEur && draft.fields.originalAmount == null) {
    draft.fields.currency = guesses.currency;
  }
  if (guesses.productQuery && !draft.fields.productId) {
    draft.productCandidates = searchProducts(products, guesses.productQuery, 5);
  }
  draft.lastExtractPhotoCount = (draft.photos || []).length;
}

async function tryPost(draft, chatId) {
  const current = await getLedger();
  const result = postDraftToLedger(current.ledger, draft);
  if (!result.ok) {
    draft.status = 'pending';
    await saveDraft(draft);
    await sendMessage(chatId, (result.message || '還不能過帳，已改為待補。') + (result.missing ? `\n缺：${result.missing.join(', ')}` : ''));
    return true;
  }
  const saved = await putLedger(result.ledger, current.version);
  if (!saved.ok) {
    await sendMessage(chatId, '過帳時活帳被網頁同時寫入，請再回「對」一次。');
    return true;
  }
  draft.status = 'posted';
  draft.postedAt = new Date().toISOString();
  draft.postedRef = result.postedRef;
  draft.waitingFor = null;
  await saveDraft(draft);
  await sendMessage(chatId, `已過帳（${result.postedRef.type}）。之後要改請去網頁。`);
  return true;
}

async function handleStart(chatId, fromId, text) {
  const parts = text.split(/\s+/);
  const code = (parts[1] || '').trim().toUpperCase();
  const bind = await getBind();
  if (bind.userId && String(bind.userId) === String(fromId)) {
    await sendMessage(chatId, '已經配對。傳照片開始；多張用相簿一次傳＝同一單。/help');
    return;
  }
  const pairing = await getPairing();
  if (!code || !pairing?.code || pairing.code !== code || (pairing.expiresAt && Date.now() > pairing.expiresAt)) {
    await sendMessage(chatId, '配對碼無效或過期。請到網頁設定重新產生。');
    return;
  }
  if (bind.userId && String(bind.userId) !== String(fromId)) {
    await sendMessage(chatId, '已經綁定另一個 Telegram 帳號。v1 只綁一個人。');
    return;
  }
  await setBind(fromId);
  await clearPairing();
  await sendMessage(chatId, '配對完成。收據可以一次傳多張（相簿），我會當成同一單問你。\n/help');
}

async function cmdLater(chatId) {
  const draft = await getActiveDraft();
  if (!draft) {
    await sendMessage(chatId, '沒有進行中的一筆。');
    return;
  }
  draft.status = 'pending';
  await saveDraft(draft);
  await sendMessage(chatId, `已擱置（待補 ${draft.id.slice(0, 8)}）。下一則訊息會開新的一筆。`);
}

async function cmdCancel(chatId) {
  const draft = await getActiveDraft();
  if (!draft) {
    await sendMessage(chatId, '沒有進行中的一筆。');
    return;
  }
  draft.status = 'cancelled';
  await saveDraft(draft);
  await sendMessage(chatId, '已丟掉這一筆（含照片）。');
}

async function cmdPending(chatId) {
  const list = await listDrafts('pending');
  const active = await getActiveDraft();
  if (!list.length && !active) {
    await sendMessage(chatId, '沒有待補。');
    return;
  }
  const lines = [];
  if (active) lines.push(`進行中 ${active.id.slice(0, 8)} ${label(active)}`);
  for (const d of list) lines.push(`待補 ${d.id.slice(0, 8)} ${label(d)}`);
  lines.push('用 /open 前八碼 繼續待補。');
  await sendMessage(chatId, lines.join('\n'));
}

async function cmdOpen(chatId, text) {
  const prefix = (text.split(/\s+/)[1] || '').trim();
  if (!prefix) {
    await sendMessage(chatId, '用法：/open 前八碼');
    return;
  }
  const active = await getActiveDraft();
  if (active) {
    await sendMessage(chatId, '已有進行中的一筆。先 /later 或問完。');
    return;
  }
  const list = await listDrafts('pending');
  const hit = list.find(d => d.id.replace(/-/g, '').startsWith(prefix.replace(/-/g, '')) || d.id.startsWith(prefix));
  if (!hit) {
    await sendMessage(chatId, '找不到這筆待補。');
    return;
  }
  hit.status = 'active';
  await saveDraft(hit);
  const { ledger } = await getLedger();
  const q = nextQuestion(hit, ledger.settings || {});
  hit.waitingFor = q.waitingFor;
  await saveDraft(hit);
  await sendMessage(chatId, '已拉回進行中。\n\n' + q.text);
}

function seedGuessesFromText(text) {
  const g = {};
  const kind = parseKind(text);
  if (kind) g.kind = kind;
  const scope = parseScope(text);
  if (scope) g.scope = scope;
  const { currency, amount } = parseCurrencyAmount(text);
  if (amount != null) {
    g.originalAmount = amount;
    if (currency) g.currency = currency;
    if ((currency || 'EUR') === 'EUR') g.amountEur = amount;
  }
  return g;
}

function label(d) {
  const f = d.fields || {};
  return [f.kind || '?', f.scope || '?', f.desc || f.productName || f.amountEur || ''].join(' ');
}

function helpText() {
  return [
    'PokeLedger Telegram 擷取',
    '可以正常說話：改台幣、四張同一單、跳過商家、這是私人…',
    '多張圖用相簿一次傳＝同一單。',
    '過帳一定要你明確說「對」／確認；我不會擅自入帳。',
    '/later 擱置  /cancel 丟掉  /pending 待補  /open 前八碼',
  ].join('\n');
}
