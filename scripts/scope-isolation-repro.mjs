/**
 * Red-capable repro: private-only SELL must never appear in biz inventory/KOR.
 * Run: node scripts/scope-isolation-repro.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadScripts(files) {
  const sandbox = {
    console,
    window: {},
    crypto: { randomUUID: () => 'id-' + Math.random().toString(16).slice(2) },
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const file of files) {
    const code = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
    // Keep window mirrors in sync for IIFEs that assign both ways
    if (sandbox.window.ScopeLedger) sandbox.ScopeLedger = sandbox.window.ScopeLedger;
    if (sandbox.window.ValuationEngine) sandbox.ValuationEngine = sandbox.window.ValuationEngine;
    if (sandbox.window.TransactionLedger) sandbox.TransactionLedger = sandbox.window.TransactionLedger;
  }
  return sandbox;
}

const box = loadScripts(['scope.js', 'valuation.js', 'ledger.js']);
const { ScopeLedger, ValuationEngine, TransactionLedger } = box;

const products = [{ id: 'p1', name: '傑尼龜', type: '單卡' }];
const transactions = [];
const uid = () => 'u' + Math.random().toString(16).slice(2);
const valuation = ValuationEngine.create(() => transactions);
const Ledger = TransactionLedger.create({
  getTransactions: () => transactions,
  getProducts: () => products,
  valuation,
  uid,
});

Ledger.recordBuy({
  scopeInput: 'biz',
  privPricePerUnitEUR: 10,
  fields: {
    productId: 'p1',
    date: '2026-08-12',
    quantity: 9,
    pricePerUnitEUR: 70,
    platform: 'prive_storting',
  },
});

const qtyBizBefore = valuation.getQty('p1', 'biz');
const qtyPrivBefore = valuation.getQty('p1', 'priv');

Ledger.recordSell({
  scopeInput: 'priv',
  fee: 0,
  fields: {
    productId: 'p1',
    date: '2026-08-13',
    quantity: 1,
    pricePerUnitEUR: 50,
    platform: 'CM',
    note: 'whatapp',
  },
});

const sells = transactions.filter(t => t.type === 'SELL');
const bizSells = sells.filter(t => ScopeLedger.normalizeScope(t, transactions) === 'biz');
const privSells = sells.filter(t => ScopeLedger.normalizeScope(t, transactions) === 'priv');
const qtyBizAfter = valuation.getQty('p1', 'biz');
const qtyPrivAfter = valuation.getQty('p1', 'priv');
const korRev = bizSells.reduce((s, t) => s + t.quantity * t.pricePerUnitEUR, 0);

// Biz product detail must not list the private sell
const bizDetailSells = transactions.filter(t =>
  t.type === 'SELL' && t.productId === 'p1' && ScopeLedger.matchesScope(t, 'biz', transactions)
);

const failures = [];
if (bizSells.length !== 0) failures.push(`biz SELL count=${bizSells.length} want 0`);
if (privSells.length !== 1) failures.push(`priv SELL count=${privSells.length} want 1`);
if (qtyBizAfter !== qtyBizBefore) failures.push(`biz qty changed ${qtyBizBefore}->${qtyBizAfter}`);
if (qtyPrivAfter !== qtyPrivBefore - 1) failures.push(`priv qty ${qtyPrivBefore}->${qtyPrivAfter}`);
if (korRev !== 0) failures.push(`KOR rev=${korRev} want 0`);
if (bizDetailSells.length !== 0) failures.push(`biz detail shows ${bizDetailSells.length} private sell(s)`);

console.log(JSON.stringify({
  qtyBizBefore, qtyPrivBefore, qtyBizAfter, qtyPrivAfter,
  sells: sells.map(t => ({ scope: t.scope, pairId: !!t.pairId })),
  korRev,
  ok: failures.length === 0,
  failures,
}, null, 2));

process.exit(failures.length ? 1 : 0);
