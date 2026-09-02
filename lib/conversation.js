import { EXPENSE_CATEGORIES, KIND_LABELS, SCOPE_LABELS, WAIT } from './constants.js';
import { canPost, needsBtw, roundEur, unitPriceEur } from './completeness.js';
import {
  parseKind, parseScope, parseYesNo, parseSkip, parseNoneBtw,
  parseNumber, parseDate, parseCategory, parsePick, parseCurrencyAmount,
  parseCurrencyOnly, looksLikeInstruction, searchProducts,
} from './parse.js';

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Date defaults to today unless the receipt shows a different date (then ask once). */
export function applyDateDefault(draft) {
  if (draft.fields.date) return;
  const today = todayIso();
  const gDate = draft.guesses?.date;
  if (gDate && gDate !== today) return; // nextQuestion will ask DATE
  draft.fields.date = gDate || today;
}

function fmtMoney(amount, currency = 'EUR') {
  if (amount == null) return '—';
  const cur = currency || 'EUR';
  return cur === 'EUR' ? `€${amount}` : `${amount} ${cur}`;
}

function amountGuessPrompt(draft) {
  const g = draft.guesses || {};
  const cur = g.currency || draft.fields.currency || 'EUR';
  const amt = g.amountEur ?? g.originalAmount;
  if (amt == null) {
    return '金額是多少？請含幣別（例如 €12.99 或 TWD 500）。';
  }
  const bits = [`收據上我看到金額 ${fmtMoney(amt, cur)}`];
  if (g.btwEur != null) bits.push(`BTW €${g.btwEur}`);
  if (cur !== 'EUR' && draft.fields.fxRate && g.originalAmount != null) {
    const eur = roundEur(g.originalAmount * draft.fields.fxRate);
    bits.push(`ECB ${draft.fields.fxDate} 換成 €${eur}`);
  }
  return `${bits.join('、')}，對嗎？\n回「對」一次收下，或直接回正確金額。`;
}

function guessLine(guesses, key, label, fmt) {
  const v = guesses?.[key];
  if (v == null || v === '') return '';
  const shown = fmt ? fmt(v) : v;
  return `\n（收據上我看到${label} ${shown}，對嗎？回「對」或改成正確值）`;
}

/** Prefetch ECB when we already have a non-EUR amount guess/field. */
export async function prepareFx(draft, fxLookup) {
  if (!fxLookup) return;
  const cur = draft.fields.currency || draft.guesses?.currency;
  const orig = draft.fields.originalAmount ?? draft.guesses?.originalAmount;
  if (!cur || cur === 'EUR' || orig == null) return;
  if (draft.fields.amountEur != null) return;
  const fx = await fxLookup(cur, draft.fields.date || todayIso());
  if (fx?.rate) {
    draft.fields.fxRate = fx.rate;
    draft.fields.fxDate = fx.date;
    const eurAmt = roundEur(orig * fx.rate);
    draft.fxPrompt = `我用歐洲央行 ${fx.date} 匯率 ${fx.rate}，${orig} ${cur} = €${eurAmt}，對嗎？\n回「對」或直接給歐元金額。ECB 沒有的幣別我不會亂查。`;
  } else {
    draft.fxPrompt = `歐洲央行沒有 ${cur} 的當日匯率，我不會用別的來源代算。請直接回這筆的歐元金額，或 /later。`;
  }
}

function acceptAmountAndBtwFromGuess(draft) {
  const g = draft.guesses || {};
  if (g.currency) draft.fields.currency = g.currency;
  const cur = draft.fields.currency || 'EUR';
  if (g.amountEur != null && cur === 'EUR') {
    draft.fields.amountEur = roundEur(g.amountEur);
    draft.fields.originalAmount = g.originalAmount ?? g.amountEur;
  } else if (g.originalAmount != null) {
    draft.fields.originalAmount = g.originalAmount;
    if (cur === 'EUR') draft.fields.amountEur = roundEur(g.originalAmount);
  }
  // Non-EUR + ECB already prepared → accept converted EUR in one 「對」
  if (cur !== 'EUR' && draft.fields.originalAmount != null && draft.fields.fxRate) {
    draft.fields.amountEur = roundEur(draft.fields.originalAmount * draft.fields.fxRate);
  }
  if (g.btwEur != null) {
    draft.fields.btwEur = roundEur(g.btwEur);
    draft.fields.btwAnswered = true;
  }
}

/** Fill EUR total when originalAmount / FX already confirmed but amountEur missing. */
export function syncDerivedEurAmount(draft) {
  const f = draft.fields;
  if (f.amountEur != null && Number(f.amountEur) > 0) return;
  const cur = f.currency || 'EUR';
  if (f.originalAmount != null && cur === 'EUR') {
    f.amountEur = roundEur(f.originalAmount);
    return;
  }
  if (f.originalAmount != null && f.fxRate) {
    f.amountEur = roundEur(f.originalAmount * f.fxRate);
  }
}

export function categoryMenu() {
  return Object.entries(EXPENSE_CATEGORIES)
    .map(([k, label], i) => `${i + 1}. ${label}`)
    .join('\n');
}

export function productMenu(candidates) {
  if (!candidates?.length) return '庫存裡找不到。請再打商品名稱關鍵字；對不到就 /later 回家在網頁待補裡選。v1 不能在聊天新建商品。';
  return candidates.map((c, i) => `${i + 1}. ${c.name}`).join('\n') + '\n回編號，或再打關鍵字搜尋。';
}

export function confirmSummary(fields, settings) {
  const lines = [
    `即將過帳：${KIND_LABELS[fields.kind] || '?'} · ${SCOPE_LABELS[fields.scope] || '?'}`,
    `日期 ${fields.date || '—'}`,
  ];
  if (fields.kind === 'EXPENSE') {
    const paid = fields.amountEur;
    const btw = fields.btwEur || 0;
    if (paid != null) {
      const net = roundEur(paid - btw);
      lines.push(`實付 €${paid} · BTW €${btw} · 未稅 €${net}`);
    } else if (fields.originalAmount != null) {
      lines.push(`實付 ${fields.originalAmount} ${fields.currency || ''}（尚未換成歐元）· BTW €${btw}`);
    } else {
      lines.push('實付 —');
    }
    lines.push(`類別 ${EXPENSE_CATEGORIES[fields.category] || fields.category || '—'}`);
    lines.push(`說明 ${fields.desc || '—'}`);
    if (fields.vendor) lines.push(`商家 ${fields.vendor}`);
  } else {
    lines.push(`商品 ${fields.productName || fields.productId || '—'}`);
    lines.push(`數量 ${fields.quantity || '—'}`);
    const unit = unitPriceEur(fields);
    lines.push(`單價 ${unit != null ? '€' + unit : '—'}`);
    if (fields.platform) lines.push(`來源 ${fields.platform}`);
  }
  if (fields.currency && fields.currency !== 'EUR' && fields.amountEur != null && fields.originalAmount != null) {
    lines.push(`原幣 ${fields.originalAmount} ${fields.currency}`
      + (fields.fxRate ? ` × ECB ${fields.fxRate}（${fields.fxDate}）` : ''));
  }
  if (needsBtw(fields, settings) && fields.btwAnswered && !fields.btwEur) {
    lines.push('BTW：沒有／未分開列');
  }
  lines.push('回「對」過帳；要改就直接說（例如「台幣」「私人」「商家無」）。/later 擱置。過帳後 Telegram 不能改。');
  return lines.join('\n');
}

export function nextQuestion(draft, settings) {
  applyDateDefault(draft);
  syncDerivedEurAmount(draft);
  const f = draft.fields;
  const g = draft.guesses || {};

  if (!f.kind) {
    return {
      waitingFor: WAIT.KIND,
      text: '這筆是進貨、銷售還是費用？\n1. 進貨  2. 銷售  3. 費用'
        + guessLine(g, 'kind', '類型', v => KIND_LABELS[v] || v),
    };
  }
  if (!f.scope) {
    return {
      waitingFor: WAIT.SCOPE,
      text: '要放在商務還是私人？\n1. 商務  2. 私人'
        + guessLine(g, 'scope', '範圍', v => SCOPE_LABELS[v] || v),
    };
  }
  if (!f.date) {
    const today = todayIso();
    return {
      waitingFor: WAIT.DATE,
      text: `收據日期是 ${g.date || '？'}（今天是 ${today}）。回「對」用收據日，或回 YYYY-MM-DD／「今天」。`,
    };
  }
  if (f.amountEur == null && f.originalAmount == null && f.pricePerUnitEUR == null) {
    return {
      waitingFor: WAIT.AMOUNT,
      text: amountGuessPrompt(draft),
    };
  }
  if (f.currency && f.currency !== 'EUR' && f.amountEur == null) {
    return {
      waitingFor: WAIT.FX,
      text: draft.fxPrompt || '這筆不是歐元。ECB 若有當日匯率我會算給你確認；沒有就請直接回歐元金額。',
    };
  }

  if (f.kind === 'EXPENSE') {
    if (!f.desc) {
      return {
        waitingFor: WAIT.DESC,
        text: '這筆費用的說明？' + guessLine(g, 'desc', ''),
      };
    }
    if (!f.category) {
      return {
        waitingFor: WAIT.CATEGORY,
        text: '費用類別？\n' + categoryMenu() + guessLine(g, 'category', '類別', v => EXPENSE_CATEGORIES[v] || v),
      };
    }
    if (f.vendor == null && g.vendor) {
      return {
        waitingFor: WAIT.VENDOR,
        text: `商家是 ${g.vendor} 嗎？回「對」、改名稱，或「無」。`,
      };
    }
    if (needsBtw(f, settings) && !f.btwAnswered) {
      return {
        waitingFor: WAIT.BTW,
        text: 'KOR 前的商務費用：發票 BTW 是多少？沒有分開列就回「沒有」。'
          + guessLine(g, 'btwEur', 'BTW', v => '€' + v),
      };
    }
  }

  if (f.kind === 'BUY' || f.kind === 'SELL') {
    if (!f.productId) {
      return {
        waitingFor: WAIT.PRODUCT,
        text: draft.productCandidates?.length
          ? '請選庫存商品：\n' + productMenu(draft.productCandidates)
          : '這是庫存裡的哪一項？打名稱關鍵字，我會列出讓你選編號。對不到就 /later。',
      };
    }
    if (!f.quantity) {
      return {
        waitingFor: WAIT.QTY,
        text: '數量？' + guessLine(g, 'quantity', '數量'),
      };
    }
    if (unitPriceEur(f) == null) {
      return {
        waitingFor: WAIT.UNIT_PRICE,
        text: '單價（歐元）是多少？',
      };
    }
    if (f.platform == null && (g.platform || f.kind === 'SELL')) {
      return {
        waitingFor: WAIT.PLATFORM,
        text: '平台／來源？（Cardmarket / Vinted / 卡展名稱，或「無」）'
          + guessLine(g, 'platform', ''),
      };
    }
  }

  return {
    waitingFor: WAIT.CONFIRM,
    text: confirmSummary(f, settings),
  };
}

function repriceAfterCurrencyChange(draft, nextCurrency) {
  const f = draft.fields;
  const prev = f.currency || 'EUR';
  if (prev === nextCurrency) return false;
  const amt = f.originalAmount != null ? f.originalAmount
    : (f.amountEur != null ? f.amountEur : null);
  f.currency = nextCurrency;
  f.fxRate = null;
  f.fxDate = null;
  draft.fxPrompt = null;
  if (amt == null) return true;
  if (nextCurrency === 'EUR') {
    f.amountEur = roundEur(amt);
    f.originalAmount = amt;
  } else {
    // Was booked as EUR by mistake — treat the number as original foreign amount
    f.originalAmount = amt;
    f.amountEur = null;
  }
  return true;
}

/**
 * Free-form corrections while confirming (or after 「不對」).
 * Returns a short note of what changed, or null.
 */
export function applyConfirmCorrection(draft, text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const notes = [];

  const curOnly = parseCurrencyOnly(t);
  const { currency: curWithAmt, amount } = parseCurrencyAmount(t);
  // Prefer explicit amount+currency; else currency-only switch
  if (amount != null && (curWithAmt || /金額|改成|改為/.test(t))) {
    if (curWithAmt) draft.fields.currency = curWithAmt;
    if ((draft.fields.currency || 'EUR') === 'EUR') {
      draft.fields.amountEur = roundEur(amount);
      draft.fields.originalAmount = amount;
    } else {
      draft.fields.originalAmount = amount;
      draft.fields.amountEur = null;
      draft.fields.fxRate = null;
      draft.fields.fxDate = null;
    }
    notes.push(`金額 ${amount} ${draft.fields.currency || 'EUR'}`);
  } else if (curOnly) {
    if (repriceAfterCurrencyChange(draft, curOnly)) notes.push(`幣別 ${curOnly}`);
  } else if (amount != null && /金額|實付|改成|改為/.test(t)) {
    applyAmountText(draft, t);
    notes.push(`金額 ${amount}`);
  }

  const scope = parseScope(t);
  if (scope && (/商務|商業|業務|私人|個人|scope|改/.test(t) || t === '1' || t === '2')) {
    // only if clearly about scope — 「私人」alone or with 改
    if (/商務|商業|業務|私人|個人/.test(t)) {
      draft.fields.scope = scope;
      notes.push(`範圍 ${SCOPE_LABELS[scope]}`);
    }
  }

  const kind = parseKind(t);
  if (kind && /進貨|銷售|費用|花費/.test(t)) {
    draft.fields.kind = kind;
    notes.push(`類型 ${KIND_LABELS[kind]}`);
  }

  const d = parseDate(t);
  if (d && (/日期|今天|\d{4}-\d{2}-\d{2}/.test(t) || /^\d{1,2}[./]\d{1,2}[./]\d{4}$/.test(t.trim()))) {
    draft.fields.date = d;
    notes.push(`日期 ${d}`);
  }

  const cat = parseCategory(t);
  if (cat && /類別|設備|運費|包材|平台|評級|里程|出差|會計|其他/.test(t)) {
    draft.fields.category = cat;
    notes.push(`類別 ${EXPENSE_CATEGORIES[cat]}`);
  }

  if (/商家\s*(無|沒有|清掉|刪掉)|沒有商家|清掉商家|商家錯/.test(t)) {
    draft.fields.vendor = '';
    notes.push('商家已清掉');
  }

  const descM = t.match(/^(說明|改說明)[:：\s]+(.+)$/);
  if (descM) {
    draft.fields.desc = descM[2].trim();
    notes.push('說明已改');
  }

  if (parseNoneBtw(t) && /btw|稅/i.test(t)) {
    draft.fields.btwEur = 0;
    draft.fields.btwAnswered = true;
    notes.push('BTW 沒有');
  }

  return notes.length ? notes.join('、') : null;
}

function acceptGuess(draft, key) {
  const g = draft.guesses || {};
  if (g[key] == null || g[key] === '') return false;
  draft.fields[key] = g[key];
  return true;
}

function applyAmountText(draft, text) {
  const { currency, amount } = parseCurrencyAmount(text);
  if (amount == null) return false;
  if (currency) draft.fields.currency = currency;
  if ((draft.fields.currency || 'EUR') === 'EUR') {
    draft.fields.amountEur = roundEur(amount);
    draft.fields.originalAmount = amount;
  } else {
    draft.fields.originalAmount = amount;
    draft.fields.amountEur = null;
  }
  return true;
}

/**
 * Apply a user reply. fxLookup(currency, date) => { rate, date } | null
 * Does not post. Returns { draft, replies, posted?: true, command?: string }
 */
export async function applyAnswer(draft, text, { settings, products, fxLookup }) {
  const replies = [];
  const waiting = draft.waitingFor;
  const t = String(text || '').trim();
  draft.updatedAt = new Date().toISOString();

  if (waiting === WAIT.KIND) {
    const yn = parseYesNo(t);
    let kind = parseKind(t);
    if (yn === true) acceptGuess(draft, 'kind');
    else if (kind) draft.fields.kind = kind;
    else {
      replies.push('請回 1 進貨、2 銷售、或 3 費用。我不會自己決定。');
      return finish(draft, replies, settings);
    }
  } else if (waiting === WAIT.SCOPE) {
    const yn = parseYesNo(t);
    const scope = parseScope(t);
    if (yn === true) acceptGuess(draft, 'scope');
    else if (scope) draft.fields.scope = scope;
    else {
      replies.push('請回 1 商務 或 2 私人。');
      return finish(draft, replies, settings);
    }
  } else if (waiting === WAIT.DATE) {
    const yn = parseYesNo(t);
    const d = parseDate(t);
    if (yn === true) acceptGuess(draft, 'date');
    else if (d) draft.fields.date = d;
    else {
      replies.push('請用 YYYY-MM-DD 或回「今天」。');
      return finish(draft, replies, settings);
    }
  } else if (waiting === WAIT.AMOUNT) {
    const yn = parseYesNo(t);
    if (yn === true && (draft.guesses.originalAmount != null || draft.guesses.amountEur != null)) {
      acceptAmountAndBtwFromGuess(draft);
    } else if (!applyAmountText(draft, t)) {
      replies.push('請輸入金額，例如 €12.99 或 TWD 500。');
      return finish(draft, replies, settings);
    } else if (draft.guesses?.btwEur != null && !draft.fields.btwAnswered) {
      // typed a new amount but still offer BTW from photo on next step via guess
    }
  } else if (waiting === WAIT.FX) {
    const yn = parseYesNo(t);
    const n = parseNumber(t);
    if (yn === true && draft.fields.fxRate && draft.fields.originalAmount != null) {
      draft.fields.amountEur = roundEur(draft.fields.originalAmount * draft.fields.fxRate);
    } else if (n != null) {
      draft.fields.amountEur = roundEur(n);
      draft.fields.currency = 'EUR';
    } else {
      replies.push('請回「對」採用 ECB 換算，或直接回歐元金額。');
      return finish(draft, replies, settings);
    }
  } else if (waiting === WAIT.DESC) {
    const yn = parseYesNo(t);
    if (yn === true) acceptGuess(draft, 'desc');
    else if (t) draft.fields.desc = t;
    else {
      replies.push('請輸入說明。');
      return finish(draft, replies, settings);
    }
  } else if (waiting === WAIT.CATEGORY) {
    const yn = parseYesNo(t);
    const cat = parseCategory(t);
    if (yn === true) acceptGuess(draft, 'category');
    else if (cat) draft.fields.category = cat;
    else {
      replies.push('請回類別編號。\n' + categoryMenu());
      return finish(draft, replies, settings);
    }
  } else if (waiting === WAIT.VENDOR) {
    const yn = parseYesNo(t);
    if (yn === true) acceptGuess(draft, 'vendor');
    else if (parseSkip(t) || looksLikeInstruction(t)) draft.fields.vendor = '';
    else draft.fields.vendor = t;
  } else if (waiting === WAIT.BTW) {
    const yn = parseYesNo(t);
    if (parseNoneBtw(t) || t === '0') {
      draft.fields.btwEur = 0;
      draft.fields.btwAnswered = true;
    } else if (yn === true && draft.guesses.btwEur != null) {
      draft.fields.btwEur = roundEur(draft.guesses.btwEur);
      draft.fields.btwAnswered = true;
    } else {
      const n = parseNumber(t);
      if (n == null || n < 0) {
        replies.push('請回 BTW 金額，或「沒有」。');
        return finish(draft, replies, settings);
      }
      draft.fields.btwEur = roundEur(n);
      draft.fields.btwAnswered = true;
    }
  } else if (waiting === WAIT.PRODUCT) {
    const pick = parsePick(t, draft.productCandidates?.length || 0);
    if (pick) {
      const c = draft.productCandidates[pick - 1];
      draft.fields.productId = c.id;
      draft.fields.productName = c.name;
      draft.productCandidates = [];
    } else {
      const found = searchProducts(products, t, 5);
      draft.productCandidates = found;
      if (found.length === 1 && parseYesNo(t) !== false) {
        replies.push(`最接近的是「${found[0].name}」。回 1 選它，或再打關鍵字。`);
      } else if (!found.length) {
        replies.push(productMenu([]));
      }
      return finish(draft, replies, settings);
    }
  } else if (waiting === WAIT.QTY) {
    const yn = parseYesNo(t);
    const n = parseNumber(t);
    if (yn === true && draft.guesses.quantity) draft.fields.quantity = Number(draft.guesses.quantity);
    else if (n != null && n >= 1) draft.fields.quantity = Math.round(n);
    else {
      replies.push('請輸入數量（正整數）。');
      return finish(draft, replies, settings);
    }
  } else if (waiting === WAIT.UNIT_PRICE) {
    const n = parseNumber(t);
    if (n == null || n < 0) {
      replies.push('請輸入單價歐元。');
      return finish(draft, replies, settings);
    }
    draft.fields.pricePerUnitEUR = roundEur(n);
  } else if (waiting === WAIT.PLATFORM) {
    const yn = parseYesNo(t);
    if (yn === true) acceptGuess(draft, 'platform');
    else if (parseSkip(t)) draft.fields.platform = '';
    else draft.fields.platform = t;
  } else if (waiting === WAIT.CONFIRM) {
    const yn = parseYesNo(t);
    if (yn === true) {
      if (!canPost(draft.fields, settings)) {
        replies.push('還有必填沒齊，不能過帳。');
        return finish(draft, replies, settings);
      }
      return { draft, replies, posted: true };
    }
    const note = applyConfirmCorrection(draft, t);
    if (note) {
      replies.push(`已改：${note}`);
      // fall through to FX prepare + re-confirm
    } else if (yn === false) {
      replies.push('哪一欄不對？直接說，例如「台幣」「金額 500」「私人」「商家無」「日期今天」。');
      return finish(draft, replies, settings);
    } else {
      replies.push('尚未過帳。回「對」確認，或直接改（例如「台幣」「私人」）／/later。');
      return finish(draft, replies, settings);
    }
  }

  if (draft.fields.currency && draft.fields.currency !== 'EUR' && draft.fields.amountEur == null && draft.fields.originalAmount != null && fxLookup) {
    await prepareFx(draft, fxLookup);
  }

  return finish(draft, replies, settings);
}

function finish(draft, replies, settings) {
  applyDateDefault(draft);
  syncDerivedEurAmount(draft);
  const q = nextQuestion(draft, settings);
  draft.waitingFor = q.waitingFor;
  replies.push(q.text);
  return { draft, replies };
}
