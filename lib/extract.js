import { LLM_TIMEOUT_MS, withTimeout } from './timeout.js';

const EXTRACT_PROMPT = `You extract bookkeeping guesses from receipt photo(s) and/or a message for a Dutch eenmanszaak Pokémon card ledger (PokeLedger).
Return ONLY JSON, no markdown.
Fields:
{
  "kind": "BUY" | "SELL" | "EXPENSE" | null,
  "scope": "biz" | "priv" | null,
  "date": "YYYY-MM-DD" | null,
  "currency": "EUR" | "TWD" | "USD" | "JPY" | "GBP" | "CNY" | null,
  "originalAmount": number | null,
  "amountEur": number | null,
  "btwEur": number | null,
  "vendor": string | null,
  "desc": string | null,
  "category": "packaging" | "platform_fee" | "grading_fee" | "mileage" | "travel" | "accountant" | "equipment" | "other" | null,
  "productQuery": string | null,
  "quantity": number | null,
  "platform": string | null
}
Rules:
- These are GUESSES for the human to confirm. Prefer null over inventing.
- MULTIPLE IMAGES = ONE ORDER / ONE DRAFT. Treat all photos as pages or items of the same purchase unless the user text says otherwise.
- Amount: prefer a printed GRAND TOTAL / 合計 / Totaal / Total / 实付 / 應付. If several line totals appear across photos and there is no grand total, SUM the distinct line totals that belong to this order (do not double-count the same line shown twice).
- currency: from symbols (€, EUR, NT$, TWD, 元, $, USD, etc.). Taiwan receipts with 元/NT$/TWD are TWD, NOT EUR. If € or EUR, set amountEur AND originalAmount to that total.
- Never assume EUR just because a number is large.
- btwEur: Dutch/Belgian VAT only (BTW/VAT 21%). Taiwan/US sales tax is NOT btwEur — leave null.
- date: invoice date if clearly printed; otherwise null (app defaults to today). Ignore wrong OCR years if obviously impossible.
- kind: BUY = inventory cards/product stock; SELL = sale; EXPENSE = operating cost (shipping, boxes as supplies, fees, equipment). Card storage boxes bought as supplies may be EXPENSE; sealed product for resale is BUY. Prefer null if unsure.
- scope: leave null unless clearly business or private.
- vendor / desc: short plain text. desc can summarize multiple items in one phrase (e.g. "評級卡盒×4").
- category only for expenses.
- productQuery: only for BUY/SELL when a single product name is clear.`;

const MAX_OCR_IMAGES = 6;
const MAX_IMAGE_BYTES = 1_500_000;

export async function extractGuesses({ text, images, fetchFn = fetch }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return {};
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const imgs = (images || [])
    .filter(img => img?.bytes?.length)
    .slice(0, MAX_OCR_IMAGES)
    .map(img => ({
      bytes: img.bytes.length > MAX_IMAGE_BYTES ? img.bytes.subarray(0, MAX_IMAGE_BYTES) : img.bytes,
      mime: img.mime || 'image/jpeg',
    }));
  const n = imgs.length;
  const detail = n >= 3 ? 'low' : 'high';
  const content = [{
    type: 'text',
    text: `${EXTRACT_PROMPT}\n\nImages attached: ${n} (all one order).\nUser text:\n${text || '(none)'}`,
  }];
  for (const img of imgs) {
    const b64 = Buffer.from(img.bytes).toString('base64');
    const mime = img.mime || 'image/jpeg';
    content.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${b64}`, detail } });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await withTimeout(fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content }],
      }),
    }), LLM_TIMEOUT_MS, 'extract');
    if (!res.ok) {
      console.warn('[extract] llm failed', await res.text());
      return {};
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    try {
      const parsed = JSON.parse(raw);
      return sanitizeGuesses(parsed);
    } catch {
      return {};
    }
  } catch (e) {
    console.warn('[extract]', e.message || e);
    return {};
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeGuesses(obj) {
  const out = {};
  const kinds = new Set(['BUY', 'SELL', 'EXPENSE']);
  const scopes = new Set(['biz', 'priv']);
  const cats = new Set(['packaging', 'platform_fee', 'grading_fee', 'mileage', 'travel', 'accountant', 'equipment', 'other']);
  if (kinds.has(obj.kind)) out.kind = obj.kind;
  if (scopes.has(obj.scope)) out.scope = obj.scope;
  if (typeof obj.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.date)) out.date = obj.date;
  if (typeof obj.currency === 'string') out.currency = obj.currency.toUpperCase();
  for (const k of ['originalAmount', 'amountEur', 'btwEur', 'quantity']) {
    const n = Number(obj[k]);
    if (!Number.isNaN(n) && obj[k] != null) out[k] = n;
  }
  // Guard: don't keep EUR amount if currency is clearly foreign
  if (out.currency && out.currency !== 'EUR' && out.amountEur != null && out.originalAmount == null) {
    out.originalAmount = out.amountEur;
    delete out.amountEur;
  }
  if (typeof obj.vendor === 'string' && obj.vendor.trim()) out.vendor = obj.vendor.trim();
  if (typeof obj.desc === 'string' && obj.desc.trim()) out.desc = obj.desc.trim();
  if (cats.has(obj.category)) out.category = obj.category;
  if (typeof obj.productQuery === 'string' && obj.productQuery.trim()) out.productQuery = obj.productQuery.trim();
  if (typeof obj.platform === 'string' && obj.platform.trim()) out.platform = obj.platform.trim();
  return out;
}
