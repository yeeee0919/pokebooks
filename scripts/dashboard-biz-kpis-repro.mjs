/**
 * Red-capable repro: homepage KPIs must use commercial (biz) inventory and sales only.
 * Private stock / SELL / expenses must not mix into 在庫、本年毛利、本年費用、稅前利潤.
 * Run: node scripts/dashboard-biz-kpis-repro.mjs
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

const products = [
  { id: 'p1', name: '傑尼龜' },
  { id: 'p2', name: '私人庫存卡' },
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

Ledger.recordBuy({
  scopeInput: 'biz',
  privPricePerUnitEUR: 10,
  fields: {
    productId: 'p1',
    date: '2026-08-12',
    quantity: 10,
    pricePerUnitEUR: 70,
    platform: 'prive_storting',
  },
});

Ledger.recordBuy({
  scopeInput: 'priv',
  fields: {
    productId: 'p2',
    date: '2026-08-12',
    quantity: 5,
    pricePerUnitEUR: 20,
    platform: 'CM',
  },
});

Ledger.recordSell({
  scopeInput: 'biz',
  fee: 2,
  fields: {
    productId: 'p1',
    date: '2026-08-13',
    quantity: 1,
    pricePerUnitEUR: 100,
    platform: 'CM',
  },
});

Ledger.recordSell({
  scopeInput: 'priv',
  fee: 0,
  fields: {
    productId: 'p1',
    date: '2026-08-13',
    quantity: 1,
    pricePerUnitEUR: 50,
    platform: 'CM',
  },
});

const expenses = [
  { date: '2026-08-14', amountEur: 30, isPrivate: false },
  { date: '2026-08-14', amountEur: 200, isPrivate: true },
];

const qtyBiz = valuation.getQty('p1', 'biz') + valuation.getQty('p2', 'biz');
const qtyAll = valuation.getQty('p1', 'all') + valuation.getQty('p2', 'all');
const costBiz = valuation.getInventoryCost('p1', 'biz') + valuation.getInventoryCost('p2', 'biz');

const bizSells = transactions.filter(t => t.type === 'SELL' && t.scope === 'biz');
const allSells = transactions.filter(t => t.type === 'SELL');
const yRev = bizSells.reduce((s, t) => s + t.quantity * t.pricePerUnitEUR, 0);
const yCogs = bizSells.reduce((s, t) => s + valuation.cogsForSell(t), 0);
const yFees = bizSells.reduce((s, t) => s + (t.fee || 0), 0);
const yGP = yRev - yCogs - yFees;
const yExp = expenses.filter(e => !e.isPrivate).reduce((s, e) => s + e.amountEur, 0);
const yNet = yGP - yExp;

const allRev = allSells.reduce((s, t) => s + t.quantity * t.pricePerUnitEUR, 0);
const allCogs = allSells.reduce((s, t) => s + valuation.cogsForSell(t), 0);
const allFees = allSells.reduce((s, t) => s + (t.fee || 0), 0);
const allGP = allRev - allCogs - allFees;

const failures = [];
if (qtyBiz !== 9) failures.push(`biz qty=${qtyBiz} want 9`);
if (qtyAll === qtyBiz) failures.push('all-scope qty must differ from biz (private stock present)');
if (costBiz !== 630) failures.push(`biz book cost=${costBiz} want 630 (9×€70)`);
if (yGP !== 28) failures.push(`biz GP=${yGP} want 28 (100−70−2)`);
if (allGP === yGP) failures.push('all-scope GP must include the private €50 sale');
if (yExp !== 30) failures.push(`biz exp=${yExp} want 30`);
if (yNet !== -2) failures.push(`pre-tax=${yNet} want -2`);
if (bizSells.length !== 1) failures.push(`KOR/dashboard sell count=${bizSells.length} want 1`);

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const dashStart = app.indexOf('function renderDashboard');
const dashEnd = app.indexOf('\nfunction cashFlowDateInRange', dashStart);
const dashBlock = app.slice(dashStart, dashEnd === -1 ? undefined : dashEnd);

if (!dashBlock.includes('commercialInventoryTotals()')) {
  failures.push('renderDashboard must use commercialInventoryTotals()');
}
if (!dashBlock.includes('commercialYearSells(')) {
  failures.push('renderDashboard must use commercialYearSells()');
}
if (!dashBlock.includes('commercialGrossProfit(')) {
  failures.push('renderDashboard must use commercialGrossProfit()');
}
if (!dashBlock.includes('commercialYearExpenses(')) {
  failures.push('renderDashboard must use commercialYearExpenses()');
}
if (/getQty\([^)]*\)/.test(dashBlock) && !/getQty\([^)]*['"]biz['"]/.test(app.slice(app.indexOf('function commercialInventoryTotals'), app.indexOf('function commercialGrossProfit')))) {
  failures.push('commercial inventory qty must pass scope biz');
}

console.log(JSON.stringify({
  qtyBiz, qtyAll, costBiz, yGP, allGP, yExp, yNet,
  bizSellCount: bizSells.length,
  ok: failures.length === 0,
  failures,
}, null, 2));

process.exit(failures.length ? 1 : 0);
