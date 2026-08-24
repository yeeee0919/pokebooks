import { EXPENSE_CATEGORIES, KIND_LABELS, WAIT } from './constants.js';

const KIND_ALIASES = {
  '1': 'BUY', 'buy': 'BUY', '進貨': 'BUY', '買': 'BUY', '成本': 'BUY',
  '2': 'SELL', 'sell': 'SELL', '銷售': 'SELL', '賣': 'SELL', '售出': 'SELL',
  '3': 'EXPENSE', 'expense': 'EXPENSE', '費用': 'EXPENSE', '花費': 'EXPENSE', 'kosten': 'EXPENSE',
};

const SCOPE_ALIASES = {
  '1': 'biz', 'biz': 'biz', '商務': 'biz', '商業': 'biz', '業務': 'biz', '公司': 'biz',
  '2': 'priv', 'priv': 'priv', '私人': 'priv', '個人': 'priv', 'private': 'priv',
};

export function parseKind(text) {
  const t = String(text || '').trim().toLowerCase();
  if (KIND_ALIASES[t]) return KIND_ALIASES[t];
  for (const [k, v] of Object.entries(KIND_LABELS)) {
    if (t.includes(v) || t.includes(k.toLowerCase())) return k;
  }
  if (t.includes('進貨') || t.includes('買入')) return 'BUY';
  if (t.includes('銷售') || t.includes('賣')) return 'SELL';
  if (t.includes('費用') || t.includes('花費')) return 'EXPENSE';
  return null;
}

export function parseScope(text) {
  const t = String(text || '').trim().toLowerCase();
  if (SCOPE_ALIASES[t]) return SCOPE_ALIASES[t];
  if (t.includes('商務') || t.includes('商業') || t.includes('業務')) return 'biz';
  if (t.includes('私人') || t.includes('個人')) return 'priv';
  return null;
}

export function parseYesNo(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return null;
  if (['對', '是', 'yes', 'y', 'ok', '好', '正確', '對的', '確認'].includes(t)) return true;
  if (['不對', '否', 'no', 'n', '錯', '不是', '錯了'].includes(t)) return false;
  // 「不對 是台幣…」→ 否定，後面當修正
  if (/^(不對|不是|錯了|錯)\b/.test(t)) return false;
  return null;
}

/** Detect currency correction without requiring an amount. */
export function parseCurrencyOnly(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  // 「不是歐元／是台幣」
  if (/台幣|新台幣|twd|nt\$/i.test(raw)) return 'TWD';
  if (/美元|美金|\busd\b|us\$/i.test(raw)) return 'USD';
  if (/日元|日圓|\bjpy\b/i.test(raw)) return 'JPY';
  if (/英鎊|\bgbp\b/i.test(raw)) return 'GBP';
  if (/人民幣|\bcny\b|rmb/i.test(raw)) return 'CNY';
  if (/不是\s*(歐元|eur|€)/i.test(raw)) return null; // alone, no target
  if (/(歐元|\beur\b|€)/i.test(lower) && !/不是\s*(歐元|eur|€)/i.test(raw)) return 'EUR';
  return null;
}

export function looksLikeInstruction(text) {
  const t = String(text || '');
  return /幫我|同一筆|很多商品|照片裡|照片有|全部算|算在一起|合併/.test(t);
}

/** Short structured reply for the current step — use rigid Q&A, not smart turn. */
export function isSimpleAnswer(draft, text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (looksLikeInstruction(t)) return false;

  const w = draft?.waitingFor;
  if (parseYesNo(t) !== null) return true;

  if (w === WAIT.KIND && (parseKind(t) || /^[123]$/.test(t))) return true;
  if (w === WAIT.SCOPE && (parseScope(t) || /^[12]$/.test(t))) return true;
  if (w === WAIT.CATEGORY && (parseCategory(t) || /^[1-8]$/.test(t))) return true;
  if (w === WAIT.AMOUNT) {
    if (parseNumber(t) != null && t.length < 24) return true;
    const { amount } = parseCurrencyAmount(t);
    if (amount != null && t.length < 32) return true;
  }
  if (w === WAIT.FX && parseNumber(t) != null) return true;
  if (w === WAIT.BTW && (parseNoneBtw(t) || parseNumber(t) != null)) return true;
  if (w === WAIT.QTY && parseNumber(t) != null) return true;
  if (w === WAIT.UNIT_PRICE && parseNumber(t) != null) return true;
  if (w === WAIT.DATE && (parseDate(t) || t === '今天')) return true;
  if (w === WAIT.PRODUCT && /^[1-9]\d*$/.test(t) && draft?.productCandidates?.length) return true;
  if (w === WAIT.VENDOR && (parseSkip(t) || t.length < 40)) return true;
  if (w === WAIT.DESC && t.length < 80) return true;
  if (w === WAIT.PLATFORM && (parseSkip(t) || t.length < 40)) return true;
  if (w === WAIT.CONFIRM) {
    const multiField = [
      parseCurrencyOnly(t),
      parseScope(t),
      parseCategory(t),
      parseKind(t),
    ].filter(Boolean).length >= 2 || t.split(/\s+/).length >= 4;
    if (multiField) return false;
    if (parseCurrencyOnly(t)) return true;
    if (parseNumber(t) != null && t.length < 20) return true;
    if (t.length < 28 && /^(私人|商務|商家|日期|設備|包裝|類別|金額)/.test(t)) return true;
  }
  if (!w && /^[123]$/.test(t)) return true;

  return false;
}

export function parseSkip(text) {
  const t = String(text || '').trim().toLowerCase();
  return ['無', '沒有', '-', 'skip', '略過', '沒有商家'].includes(t);
}

export function parseNoneBtw(text) {
  const t = String(text || '').trim().toLowerCase();
  return ['沒有', '無', '0', '沒有btw', '沒分開', '沒分開列', '不含稅'].includes(t);
}

export function parseNumber(text) {
  const t = String(text || '').trim().replace(',', '.').replace(/[€$NTD\s]/gi, '');
  const m = t.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isNaN(n) ? null : n;
}

export function parseDate(text) {
  const t = String(text || '').trim();
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const dmy = t.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  if (t === '今天' || t.toLowerCase() === 'today') {
    return new Date().toISOString().slice(0, 10);
  }
  return null;
}

export function parseCategory(text) {
  const t = String(text || '').trim().toLowerCase();
  const keys = Object.keys(EXPENSE_CATEGORIES);
  const idx = parseInt(t, 10);
  if (idx >= 1 && idx <= keys.length) return keys[idx - 1];
  for (const [k, label] of Object.entries(EXPENSE_CATEGORIES)) {
    if (t === k || t.includes(label.replace(/^[^\s]+\s/, '').toLowerCase()) || t.includes(k)) return k;
  }
  const map = {
    '運費': 'packaging', '包材': 'packaging', '郵資': 'packaging',
    '平台': 'platform_fee', '手續費': 'platform_fee',
    '評級': 'grading_fee', 'psa': 'grading_fee',
    '里程': 'mileage', '油錢': 'mileage',
    '出差': 'travel', '交通': 'travel',
    '會計': 'accountant',
    '設備': 'equipment', '監視器': 'equipment',
    '其他': 'other',
  };
  for (const [k, v] of Object.entries(map)) {
    if (t.includes(k)) return v;
  }
  return null;
}

export function parsePick(text, max) {
  const n = parseInt(String(text || '').trim(), 10);
  if (n >= 1 && n <= max) return n;
  return null;
}

export function parseCurrencyAmount(text) {
  const raw = String(text || '');
  let currency = null;
  if (/twd|nt\$|新台幣|台幣/i.test(raw)) currency = 'TWD';
  else if (/usd|us\$|美元/i.test(raw)) currency = 'USD';
  else if (/jpy|日元|日圓/i.test(raw)) currency = 'JPY';
  else if (/gbp|英鎊/i.test(raw)) currency = 'GBP';
  else if (/cny|人民幣/i.test(raw)) currency = 'CNY';
  else if (/€|eur|歐元/i.test(raw)) currency = 'EUR';
  const amount = parseNumber(raw);
  return { currency, amount };
}

export function searchProducts(products, query, limit = 5) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const scored = (products || [])
    .map(p => {
      const name = String(p.name || '').toLowerCase();
      let score = 0;
      if (name === q) score = 100;
      else if (name.includes(q)) score = 80;
      else if (q.split(/\s+/).every(w => name.includes(w))) score = 50;
      return { p, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => ({ id: x.p.id, name: x.p.name }));
  return scored;
}
