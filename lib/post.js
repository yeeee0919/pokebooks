import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { canPost, missingFields, roundEur, unitPriceEur } from './completeness.js';
import { KIND_LABELS } from './constants.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadScripts(files) {
  const sandbox = {
    console,
    window: {},
    crypto: { randomUUID: () => globalThis.crypto.randomUUID() },
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const file of files) {
    const code = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
    if (sandbox.window.ScopeLedger) sandbox.ScopeLedger = sandbox.window.ScopeLedger;
    if (sandbox.window.ValuationEngine) sandbox.ValuationEngine = sandbox.window.ValuationEngine;
    if (sandbox.window.TransactionLedger) sandbox.TransactionLedger = sandbox.window.TransactionLedger;
  }
  return sandbox;
}

function uid() {
  return globalThis.crypto.randomUUID();
}

export function cloneLedger(ledger) {
  return JSON.parse(JSON.stringify({
    products: ledger.products || [],
    transactions: ledger.transactions || [],
    expenses: ledger.expenses || [],
    documents: ledger.documents || [],
    settings: ledger.settings || {},
  }));
}

export function postDraftToLedger(ledger, draft) {
  const settings = ledger.settings || {};
  if (!canPost(draft.fields, settings)) {
    return { ok: false, reason: 'incomplete', missing: missingFields(draft.fields, settings) };
  }

  const next = cloneLedger(ledger);
  const f = draft.fields;
  const photoIds = (draft.photos || []).map(p => p.id).filter(Boolean);

  if (f.kind === 'EXPENSE') {
    const paid = roundEur(f.amountEur);
    const btw = roundEur(f.btwEur || 0);
    const row = {
      id: uid(),
      date: f.date,
      category: f.category,
      amountEur: roundEur(paid - btw),
      btwEur: btw,
      amountInclEur: paid,
      desc: f.desc,
      vendor: f.vendor || '',
      invoiceNo: '',
      isPrivate: f.scope === 'priv',
      source: 'telegram',
      draftId: draft.id,
      photoIds,
    };
    if (btw > 0 && f.scope === 'biz' && f.date < (settings.korStart || '2026-10-01')) {
      row.vatRate = 0.21;
    }
    next.expenses.push(row);
    return { ok: true, ledger: next, postedRef: { type: 'EXPENSE', ids: [row.id] } };
  }

  const box = loadScripts(['scope.js', 'valuation.js', 'ledger.js']);
  const valuation = box.ValuationEngine.create(() => next.transactions);
  const Ledger = box.TransactionLedger.create({
    getTransactions: () => next.transactions,
    getProducts: () => next.products,
    valuation,
    uid,
  });

  const unit = unitPriceEur(f);
  const fields = {
    productId: f.productId,
    date: f.date,
    quantity: f.quantity,
    pricePerUnitEUR: unit,
    platform: f.platform || '',
    note: `Telegram ${KIND_LABELS[f.kind]}`,
    source: 'telegram',
    draftId: draft.id,
    photoIds,
  };

  if (f.kind === 'BUY') {
    const { ids } = Ledger.recordBuy({
      scopeInput: f.scope,
      fields,
    });
    return { ok: true, ledger: next, postedRef: { type: 'BUY', ids } };
  }

  if (f.kind === 'SELL') {
    const check = Ledger.checkSellStock(f.productId, f.scope, f.quantity);
    if (!check.ok) {
      return {
        ok: false,
        reason: 'stock',
        message: `庫存不足（${check.scope === 'priv' ? '私人' : '商務'}在庫 ${check.avail}），這筆維持待補。`,
      };
    }
    const { ids } = Ledger.recordSell({
      scopeInput: f.scope,
      fields,
      fee: 0,
    });
    return { ok: true, ledger: next, postedRef: { type: 'SELL', ids } };
  }

  return { ok: false, reason: 'kind', message: 'v1 不從聊天過帳送評。' };
}
