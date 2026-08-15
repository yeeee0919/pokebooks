/**
 * Red-capable repro: multi-line sell writes one SELL per line, same scope, stock decreases.
 * Mirrors app.js btnSaveSell loop (Ledger.recordSell per line).
 * Run: node scripts/multi-sell-repro.mjs
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
    if (sandbox.window.ScopeLedger) sandbox.ScopeLedger = sandbox.window.ScopeLedger;
    if (sandbox.window.ValuationEngine) sandbox.ValuationEngine = sandbox.window.ValuationEngine;
    if (sandbox.window.TransactionLedger) sandbox.TransactionLedger = sandbox.window.TransactionLedger;
  }
  return sandbox;
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

const box = loadScripts(['scope.js', 'valuation.js', 'ledger.js']);
const { ScopeLedger, ValuationEngine, TransactionLedger } = box;

const products = [
  { id: 'nm', name: 'NM 傑尼龜', type: '單卡' },
  { id: 'lp', name: 'LP 傑尼龜', type: '單卡' },
];
const transactions = [];
const uid = () => 'u' + Math.random().toString(16).slice(2);
const valuation = ValuationEngine.create(() => transactions);
const Ledger = TransactionLedger.create({
  getTransactions: () => transactions,
  getProducts: () => products,
  valuation,
  uid,
});

for (const productId of ['nm', 'lp']) {
  Ledger.recordBuy({
    scopeInput: 'biz',
    privPricePerUnitEUR: 5,
    fields: {
      productId,
      date: '2026-08-12',
      quantity: 4,
      pricePerUnitEUR: 20,
      platform: 'CM',
    },
  });
}

const lines = [
  { productId: 'nm', qty: 1, price: 30, fee: 1 },
  { productId: 'lp', qty: 2, price: 18, fee: 0.5 },
];
const shared = { date: '2026-08-15', platform: 'CM', note: 'batch' };
const scopeVal = 'biz';

const needByProduct = {};
for (const l of lines) {
  needByProduct[l.productId] = (needByProduct[l.productId] || 0) + l.qty;
}
for (const [productId, need] of Object.entries(needByProduct)) {
  const stock = Ledger.checkSellStock(productId, scopeVal, need);
  assert(stock.ok, `stock ok before sell ${productId} need=${need} avail=${stock.avail}`);
}

const allIds = [];
for (const l of lines) {
  const { ids } = Ledger.recordSell({
    scopeInput: scopeVal,
    editId: null,
    fee: l.fee,
    fields: {
      productId: l.productId,
      quantity: l.qty,
      pricePerUnitEUR: l.price,
      ...shared,
    },
  });
  allIds.push(...ids);
}

const sells = transactions.filter(t => t.type === 'SELL');
assert(sells.length === 2, `two SELL rows (got ${sells.length})`);
assert(allIds.length === 2, `two ids returned (got ${allIds.length})`);
assert(sells.every(t => ScopeLedger.normalizeScope(t, transactions) === 'biz'), 'all sells stay biz scope');
assert(sells.every(t => !t.pairId), 'sells are not paired across scopes');
assert(valuation.getQty('nm', 'biz') === 3, 'nm stock 4-1=3');
assert(valuation.getQty('lp', 'biz') === 2, 'lp stock 4-2=2');
assert(valuation.getQty('nm', 'priv') === 4, 'priv nm untouched');
assert(valuation.getQty('lp', 'priv') === 4, 'priv lp untouched');

const nmSell = sells.find(t => t.productId === 'nm');
const lpSell = sells.find(t => t.productId === 'lp');
assert(nmSell?.fee === 1 && nmSell?.quantity === 1, 'nm line fee/qty');
assert(lpSell?.fee === 0.5 && lpSell?.quantity === 2, 'lp line fee/qty');

// Same product on two lines: aggregate stock check must fail if over-avail
const overNeed = Ledger.checkSellStock('nm', 'biz', 4);
assert(!overNeed.ok, 'aggregate over-avail rejected (need 4, avail 3)');

if (process.exitCode) {
  console.error('\nMulti-sell repro RED');
  process.exit(1);
}
console.log('\nMulti-sell repro GREEN');
