/**
 * Red-capable repro: commercial SELL output VAT uses individuele margeregeling.
 * Run: node scripts/margin-btw-repro.mjs
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadScripts(files) {
  const sandbox = { console, window: {} };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const file of files) {
    const code = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
    if (sandbox.window.BtwEngine) sandbox.BtwEngine = sandbox.window.BtwEngine;
    if (sandbox.window.ScopeLedger) sandbox.ScopeLedger = sandbox.window.ScopeLedger;
    if (sandbox.window.ValuationEngine) sandbox.ValuationEngine = sandbox.window.ValuationEngine;
    if (sandbox.window.TransactionLedger) sandbox.TransactionLedger = sandbox.window.TransactionLedger;
  }
  return sandbox;
}

const { BtwEngine } = loadScripts(['btw.js']);
const failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
  else console.log('OK:', msg);
}

// Worked examples: BTW = max(0, selling − cost) × 21/121
assert(BtwEngine.suggestedMarginBtw(221, 100) === 21, 'margin €121 → BTW €21.00');
assert(BtwEngine.suggestedMarginBtw(100, 70) === 5.21, 'margin €30 → BTW €5.21');
assert(BtwEngine.suggestedMarginBtw(50, 70) === 0, 'negative margin → BTW €0');
assert(BtwEngine.suggestedMarginBtw(70, 70) === 0, 'zero margin → BTW €0');

const charged = { type: 'SELL', quantity: 1, pricePerUnitEUR: 100, btwCharged: true, btwEur: 5.21 };
assert(BtwEngine.sellOutputBtw(charged) === 5.21, 'charged sale records €5.21 output VAT');
assert(BtwEngine.sellOmzetExclBtw(charged) === 94.79, 'KOR/IB omzet is selling price minus output VAT');

const off = { type: 'SELL', quantity: 1, pricePerUnitEUR: 100, btwCharged: false, btwEur: 5.21 };
assert(BtwEngine.sellOutputBtw(off) === 0, 'unchecked sale contributes €0 output VAT even if an amount was typed');

const legacy = { type: 'SELL', quantity: 1, pricePerUnitEUR: 100 };
assert(BtwEngine.sellOutputBtw(legacy) === 0, 'legacy sale without btwCharged is €0');
assert(BtwEngine.sellOmzetExclBtw(legacy) === 100, 'legacy omzet stays the full selling price');

assert(
  JSON.stringify(BtwEngine.allocateBtw([3.64, 5.21], true, null)) === JSON.stringify([3.64, 5.21]),
  'no override keeps per-line suggestions'
);
assert(
  JSON.stringify(BtwEngine.allocateBtw([3.64, 5.21], false, 10)) === JSON.stringify([0, 0]),
  'unchecked allocates zeros'
);
assert(
  JSON.stringify(BtwEngine.allocateBtw([3.64, 5.21], true, 10)) === JSON.stringify([4.11, 5.89]),
  'overridden total splits in proportion to suggestions'
);

const box = loadScripts(['btw.js', 'scope.js', 'valuation.js', 'ledger.js']);
const products = [{ id: 'p1', name: '測試卡' }];
const transactions = [];
const uid = () => 'u' + Math.random().toString(16).slice(2);
const valuation = box.ValuationEngine.create(() => transactions);
const Ledger = box.TransactionLedger.create({
  getTransactions: () => transactions,
  getProducts: () => products,
  valuation,
  uid,
});
box.ScopeLedger = box.window.ScopeLedger;

const { ValuationEngine, TransactionLedger } = box;

Ledger.recordBuy({
  scopeInput: 'biz',
  fields: { productId: 'p1', date: '2026-08-12', quantity: 2, pricePerUnitEUR: 70 },
});
const { ids } = Ledger.recordSell({
  scopeInput: 'biz',
  fee: 0,
  fields: {
    productId: 'p1',
    date: '2026-08-20',
    quantity: 1,
    pricePerUnitEUR: 100,
    btwCharged: true,
    btwEur: 5.21,
  },
});
const saved = transactions.find(t => t.id === ids[0]);
assert(saved?.btwCharged === true && saved?.btwEur === 5.21, 'recordSell stores charged BTW on create');

Ledger.recordSell({
  scopeInput: 'biz',
  editId: ids[0],
  fee: 0,
  fields: {
    productId: 'p1',
    date: '2026-08-20',
    quantity: 1,
    pricePerUnitEUR: 100,
    btwCharged: true,
    btwEur: 4.00,
  },
});
const edited = transactions.find(t => t.id === ids[0]);
assert(edited?.btwCharged === true && edited?.btwEur === 4, 'recordSell keeps an overridden BTW on edit');

Ledger.recordSell({
  scopeInput: 'biz',
  editId: ids[0],
  fee: 0,
  fields: {
    productId: 'p1',
    date: '2026-08-20',
    quantity: 1,
    pricePerUnitEUR: 100,
    btwCharged: false,
    btwEur: 0,
  },
});
const cleared = transactions.find(t => t.id === ids[0]);
assert(cleared?.btwCharged === false && cleared?.btwEur === 0, 'unchecking BTW on edit clears the stored amount');

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(html.includes('id="sellBtwCharged"'), 'sales form has a charge-BTW checkbox');
assert(html.includes('id="sellBtwAmt"'), 'sales form has an editable sales BTW amount');
assert(html.includes('src="btw.js"'), 'index.html loads btw.js');
assert(app.includes('function updateSellBtwUI'), 'sell modal can refresh sales BTW');
assert(app.includes('sellBtwCharged'), 'save path reads the charge-BTW checkbox');
assert(app.includes('BtwEngine.sellOmzetExclBtw'), 'KOR omzet excludes recorded output VAT');

console.log(JSON.stringify({ ok: failures.length === 0, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
