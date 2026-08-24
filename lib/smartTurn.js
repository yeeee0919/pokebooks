import { EXPENSE_CATEGORIES, KIND_LABELS, SCOPE_LABELS, WAIT } from './constants.js';
import { canPost, missingFields, needsBtw, roundEur } from './completeness.js';
import { nextQuestion, prepareFx, confirmSummary, applyDateDefault } from './conversation.js';
import { searchProducts } from './parse.js';

const SYSTEM = `You are the conversational layer for PokeLedger, a Dutch eenmanszaak Pokémon card ledger capture bot on Telegram.
The user may say unexpected things. Handle them helpfully in Traditional Chinese (Taiwan).

Hard rules:
- You NEVER post to the ledger yourself. Set userConfirmedPost=true ONLY if the user clearly confirms posting (對 / 確認過帳 / 入帳吧) after seeing a summary, or explicitly says to post this draft.
- kind (BUY/SELL/EXPENSE) and scope (biz/priv) ONLY from clear user intent in THIS message — never invent.
- Taiwan 元/台幣/TWD is not EUR. If they say 台幣, set currency TWD and move the number to originalAmount; clear amountEur until EUR is known.
- ECB has no TWD — ask user for EUR equivalent; do not invent FX.
- Multiple photos already attached = one order unless user says split.
- Pre-KOR business expenses need BTW answered (number or 沒有).
- Do not create products. For inventory match, set productQuery only.
- Keep replies short (2–5 sentences). Ask at most one clear next question if something is still missing.
- If correcting a wrong vendor that captured instruction text, clear vendor (vendor: "").

Return ONLY JSON:
{
  "reply": "string to send the user",
  "userConfirmedPost": false,
  "updates": {
    "kind": "BUY"|"SELL"|"EXPENSE"|null,
    "scope": "biz"|"priv"|null,
    "date": "YYYY-MM-DD"|null,
    "currency": "EUR"|"TWD"|"USD"|"JPY"|"GBP"|"CNY"|null,
    "originalAmount": number|null,
    "amountEur": number|null,
    "btwEur": number|null,
    "btwAnswered": true|null,
    "desc": string|null,
    "category": "packaging"|"platform_fee"|"grading_fee"|"mileage"|"travel"|"accountant"|"equipment"|"other"|null,
    "vendor": string|null,
    "quantity": number|null,
    "pricePerUnitEUR": number|null,
    "platform": string|null,
    "productQuery": string|null,
    "clearAmountEur": true|null,
    "clearFx": true|null
  }
}
Omit update keys you are not changing. Use null only when explicitly clearing is wrong — prefer omitting. To clear vendor set "vendor": "". To mark no BTW set btwEur:0 and btwAnswered:true.`;

function draftSnapshot(draft, settings) {
  const f = draft.fields || {};
  return {
    waitingFor: draft.waitingFor,
    photoCount: (draft.photos || []).length,
    seedText: draft.seedText || null,
    guesses: draft.guesses || {},
    fields: f,
    missing: missingFields(f, settings),
    needsBtw: needsBtw(f, settings),
    canPost: canPost(f, settings),
    korStart: settings?.korStart,
    today: new Date().toISOString().slice(0, 10),
    categories: EXPENSE_CATEGORIES,
    kindLabels: KIND_LABELS,
    scopeLabels: SCOPE_LABELS,
  };
}

export async function smartTurn(draft, text, { settings, products, fxLookup, fetchFn = fetch }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return null;

  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const payload = {
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          userMessage: text,
          draft: draftSnapshot(draft, settings),
          productSample: (products || []).slice(0, 40).map(p => ({ id: p.id, name: p.name })),
        }),
      },
    ],
  };

  const res = await fetchFn('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.warn('[smartTurn] failed', await res.text());
    return null;
  }
  const data = await res.json();
  let parsed;
  try {
    parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
  } catch {
    return null;
  }

  applySmartUpdates(draft, parsed.updates || {}, products);
  applyDateDefault(draft);
  await prepareFx(draft, fxLookup);

  const replies = [];
  if (parsed.reply) replies.push(String(parsed.reply).trim());

  if (parsed.userConfirmedPost) {
    if (canPost(draft.fields, settings)) {
      return { draft, replies, posted: true, smart: true };
    }
    replies.push(`還不能過帳，缺：${missingFields(draft.fields, settings).join(', ')}`);
  }

  const q = nextQuestion(draft, settings);
  draft.waitingFor = q.waitingFor;
  if (!parsed.reply?.trim()) {
    if (q.waitingFor === WAIT.CONFIRM && !parsed.userConfirmedPost) {
      replies.push(confirmSummary(draft.fields, settings));
    } else {
      replies.push(q.text);
    }
  }

  return { draft, replies: [...new Set(replies.filter(Boolean))], posted: false, smart: true };
}

function applySmartUpdates(draft, updates, products) {
  if (!updates || typeof updates !== 'object') return;
  const f = draft.fields;
  const kinds = new Set(['BUY', 'SELL', 'EXPENSE']);
  const scopes = new Set(['biz', 'priv']);
  const cats = new Set(Object.keys(EXPENSE_CATEGORIES));
  const curs = new Set(['EUR', 'TWD', 'USD', 'JPY', 'GBP', 'CNY']);

  if (kinds.has(updates.kind)) f.kind = updates.kind;
  if (scopes.has(updates.scope)) f.scope = updates.scope;
  if (typeof updates.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(updates.date)) f.date = updates.date;
  if (curs.has(updates.currency)) {
    const prev = f.currency || 'EUR';
    f.currency = updates.currency;
    if (prev === 'EUR' && updates.currency !== 'EUR' && f.amountEur != null && updates.originalAmount == null) {
      f.originalAmount = f.amountEur;
      f.amountEur = null;
      f.fxRate = null;
      f.fxDate = null;
    }
  }
  if (updates.clearAmountEur) f.amountEur = null;
  if (updates.clearFx) {
    f.fxRate = null;
    f.fxDate = null;
  }
  if (updates.originalAmount != null && !Number.isNaN(Number(updates.originalAmount))) {
    f.originalAmount = Number(updates.originalAmount);
  }
  if (updates.amountEur != null && !Number.isNaN(Number(updates.amountEur))) {
    f.amountEur = roundEur(updates.amountEur);
  }
  if (updates.btwEur != null && !Number.isNaN(Number(updates.btwEur))) {
    f.btwEur = roundEur(updates.btwEur);
  }
  if (updates.btwAnswered === true) f.btwAnswered = true;
  if (typeof updates.desc === 'string') f.desc = updates.desc.trim();
  if (cats.has(updates.category)) f.category = updates.category;
  if (typeof updates.vendor === 'string') f.vendor = updates.vendor;
  if (updates.quantity != null && Number(updates.quantity) >= 1) f.quantity = Math.round(Number(updates.quantity));
  if (updates.pricePerUnitEUR != null && !Number.isNaN(Number(updates.pricePerUnitEUR))) {
    f.pricePerUnitEUR = roundEur(updates.pricePerUnitEUR);
  }
  if (typeof updates.platform === 'string') f.platform = updates.platform;
  if (typeof updates.productQuery === 'string' && updates.productQuery.trim() && !f.productId) {
    draft.productCandidates = searchProducts(products, updates.productQuery.trim(), 5);
  }
}
