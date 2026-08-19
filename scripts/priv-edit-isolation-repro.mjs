/**
 * Red-capable repro: editing the private side of a commercial BUY pair
 * must not mutate the commercial row.
 *
 * User flow: 商業庫存新增商品選「商業」（雙成本）→ 到私人庫存改那一筆。
 * Run: node scripts/priv-edit-isolation-repro.mjs
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
const { ScopeLedger, ValuationEngine, TransactionLedger } = box;

const products = [{ id: 'p1', name: '皮卡丘', type: '單卡' }];
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
    quantity: 5,
    pricePerUnitEUR: 70,
    platform: 'prive_storting',
    currency: 'EUR',
    note: '開業轉入',
  },
});

const bizBefore = { ...transactions.find(t => t.scope === 'biz') };
const privBefore = transactions.find(t => t.scope === 'priv');
if (!bizBefore?.pairId || !privBefore?.pairId || bizBefore.pairId !== privBefore.pairId) {
  console.log(JSON.stringify({ ok: false, failures: ['pair not created'] }, null, 2));
  process.exit(1);
}

Ledger.recordBuy({
  editId: privBefore.id,
  scopeInput: 'priv',
  fields: {
    productId: 'p1',
    date: '2026-08-15',
    quantity: 9,
    pricePerUnitEUR: 12,
    platform: 'cardmarket',
    currency: 'EUR',
    note: '私人更正',
  },
});

const bizAfter = transactions.find(t => t.id === bizBefore.id);
const privAfter = transactions.find(t => t.id === privBefore.id);
const failures = [];

if (bizAfter.quantity !== 5) failures.push(`biz qty ${bizAfter.quantity} want 5`);
if (bizAfter.date !== '2026-08-12') failures.push(`biz date ${bizAfter.date} want 2026-08-12`);
if (bizAfter.platform !== 'prive_storting') failures.push(`biz platform ${bizAfter.platform} want prive_storting`);
if (bizAfter.note !== '開業轉入') failures.push(`biz note changed`);
if (bizAfter.pricePerUnitEUR !== 70) failures.push(`biz cost ${bizAfter.pricePerUnitEUR} want 70`);
if (bizAfter.productId !== 'p1') failures.push(`biz productId changed`);

if (privAfter.quantity !== 9) failures.push(`priv qty ${privAfter.quantity} want 9`);
if (privAfter.date !== '2026-08-15') failures.push(`priv date ${privAfter.date} want 2026-08-15`);
if (privAfter.platform !== 'cardmarket') failures.push(`priv platform ${privAfter.platform} want cardmarket`);
if (privAfter.note !== '私人更正') failures.push(`priv note not updated`);
if (privAfter.pricePerUnitEUR !== 12) failures.push(`priv cost ${privAfter.pricePerUnitEUR} want 12`);

console.log(JSON.stringify({
  biz: { qty: bizAfter.quantity, date: bizAfter.date, cost: bizAfter.pricePerUnitEUR, platform: bizAfter.platform },
  priv: { qty: privAfter.quantity, date: privAfter.date, cost: privAfter.pricePerUnitEUR, platform: privAfter.platform },
  ok: failures.length === 0,
  failures,
}, null, 2));

process.exit(failures.length ? 1 : 0);
