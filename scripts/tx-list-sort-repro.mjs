/**
 * Red-capable repro: transaction list sorts newest → oldest,
 * with later-inserted rows first when dates tie.
 * Run: node scripts/tx-list-sort-repro.mjs
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

const box = loadScripts(['scope.js', 'valuation.js', 'ledger.js']);
const { ValuationEngine, TransactionLedger } = box;

const products = [{ id: 'p1', name: '必勝客皮卡丘', type: '單卡' }];
const transactions = [
  { id: 'old', productId: 'p1', type: 'SELL', date: '2026-09-07', quantity: 1, pricePerUnitEUR: 10, note: '先建', scope: 'biz' },
  { id: 'mid', productId: 'p1', type: 'SELL', date: '2026-09-06', quantity: 1, pricePerUnitEUR: 20, note: '較舊日', scope: 'biz' },
  { id: 'new', productId: 'p1', type: 'SELL', date: '2026-09-07', quantity: 1, pricePerUnitEUR: 30, note: '後建', scope: 'biz' },
];

const valuation = ValuationEngine.create(() => transactions);
const Ledger = TransactionLedger.create({
  getTransactions: () => transactions,
  getProducts: () => products,
  valuation,
  uid: () => 'u',
});

const rows = Ledger.query({ scope: 'biz' });
const ids = rows.map(r => r.tx.id);
const notes = rows.map(r => r.tx.note);

const failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

assert(ids[0] === 'new' && ids[1] === 'old' && ids[2] === 'mid',
  `order=${ids.join(',')} want new,old,mid`);
assert(notes[0] === '後建', `top note=${notes[0]} want 後建`);

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert(app.includes('tx-product-note'), 'transactions table must render tx-product-note');
assert(app.includes("String(t.note || '').trim()"), 'note must be read from transaction');

console.log(JSON.stringify({ ids, notes, ok: failures.length === 0, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
