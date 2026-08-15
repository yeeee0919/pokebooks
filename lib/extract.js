const EXTRACT_PROMPT = `You extract bookkeeping guesses from a receipt or message for a Dutch eenmanszaak Pokémon card ledger (PokeLedger).
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
- kind: BUY = inventory purchase of cards/product; SELL = sale; EXPENSE = operating cost (shipping, equipment, fees). Do not guess kind unless obvious.
- scope: leave null unless the text clearly says business or private.
- date: use the invoice/receipt date if clearly printed; otherwise null (the app defaults to today).
- Amount: use the FINAL paid / grand total / Totaal / Total / bedrag (incl. VAT if shown as total). Not a line-item alone unless that is the only amount.
- currency: from symbols (€, EUR, NT$, TWD, $, USD, etc.). If € or EUR, set amountEur to that total AND originalAmount to the same number.
- btwEur: Dutch/Belgian VAT line if shown (BTW, VAT, 21%, voorbelasting). Read the VAT amount, not the rate. If the receipt shows only "incl. BTW" with no separate VAT figure, leave btwEur null.
- category only for expenses.
- vendor / desc: short plain text from the receipt when readable.`;

export async function extractGuesses({ text, images, fetchFn = fetch }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return {};
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const content = [{ type: 'text', text: `${EXTRACT_PROMPT}\n\nUser text:\n${text || '(none)'}` }];
  for (const img of images || []) {
    const b64 = Buffer.from(img.bytes).toString('base64');
    const mime = img.mime || 'image/jpeg';
    content.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } });
  }
  const res = await fetchFn('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
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
  });
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
  if (typeof obj.vendor === 'string' && obj.vendor.trim()) out.vendor = obj.vendor.trim();
  if (typeof obj.desc === 'string' && obj.desc.trim()) out.desc = obj.desc.trim();
  if (cats.has(obj.category)) out.category = obj.category;
  if (typeof obj.productQuery === 'string' && obj.productQuery.trim()) out.productQuery = obj.productQuery.trim();
  if (typeof obj.platform === 'string' && obj.platform.trim()) out.platform = obj.platform.trim();
  return out;
}
