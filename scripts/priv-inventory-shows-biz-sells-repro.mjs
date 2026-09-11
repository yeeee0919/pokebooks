/**
 * Red-capable repro: private collection view = priv txs + commercial SELL/GRADE.
 *
 * Writes stay single-scope. Private remaining drops on commercial SELL/GRADE.
 * Personal profit for a commercial SELL uses private acquisition cost.
 * Private transactions tab uses the same overlay (view: 'inventory').
 *
 * Run: node scripts/priv-inventory-shows-biz-sells-repro.mjs
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

const products = [
  { id: 'p1', name: '百變皮卡丘', type: '單卡' },
  { id: 'p2', name: 'PSA 10 百變皮卡丘', type: '鑑定卡', parentId: 'p1' },
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
    quantity: 9,
    pricePerUnitEUR: 70,
    platform: 'prive_storting',
  },
});

Ledger.recordSell({
  scopeInput: 'biz',
  fee: 1,
  fields: {
    productId: 'p1',
    date: '2026-08-20',
    quantity: 2,
    pricePerUnitEUR: 80,
    platform: 'CM',
    note: '商業出貨',
  },
});

Ledger.recordGrade({
  productId: 'p1',
  targetProductId: 'p2',
  date: '2026-08-21',
  quantity: 1,
  scope: 'biz',
  pricePerUnitEUR: 70,
  feePerUnitEUR: 20,
  platform: 'PSA',
  gradingService: 'PSA',
  gradingScore: '10',
  note: '送評鑑: PSA 10',
});

const sells = transactions.filter(t => t.type === 'SELL');
const bizSells = sells.filter(t => ScopeLedger.normalizeScope(t, transactions) === 'biz');
const privSells = sells.filter(t => ScopeLedger.normalizeScope(t, transactions) === 'priv');
const qtyPriv = valuation.getQty('p1', 'priv');
const qtyBiz = valuation.getQty('p1', 'biz');
const qtyPrivPsa = valuation.getQty('p2', 'priv');
const qtyBizPsa = valuation.getQty('p2', 'biz');
const waccPrivPsa = valuation.getWACC('p2', '9999-99-99', 'priv');
const waccBizPsa = valuation.getWACC('p2', '9999-99-99', 'biz');
const korRev = bizSells.reduce((s, t) => s + t.quantity * t.pricePerUnitEUR, 0);
const personalCogs = valuation.personalCogsForSell(bizSells[0]);

const privDetail = Ledger.query({
  productId: 'p1',
  scope: 'priv',
  view: 'inventory',
  enrich: false,
});
const privDetailSells = privDetail.filter(t => t.type === 'SELL');
const privDetailBuys = privDetail.filter(t => t.type === 'BUY');
const privDetailGrades = privDetail.filter(t => t.type === 'GRADE');

const bizDetail = Ledger.query({
  productId: 'p1',
  scope: 'biz',
  view: 'inventory',
  enrich: false,
});
const bizDetailPrivSells = bizDetail.filter(t =>
  t.type === 'SELL' && ScopeLedger.normalizeScope(t, transactions) === 'priv'
);

const privTxTab = Ledger.query({ scope: 'priv', view: 'inventory', enrich: false });
const privTxTabSells = privTxTab.filter(t => t.type === 'SELL');
const privTxTabGrades = privTxTab.filter(t => t.type === 'GRADE');
const privTxTabBizBuys = privTxTab.filter(t =>
  t.type === 'BUY' && ScopeLedger.normalizeScope(t, transactions) === 'biz'
);

const privLedgerOnly = Ledger.query({ productId: 'p1', scope: 'priv', enrich: false });
const privLedgerSells = privLedgerOnly.filter(t => t.type === 'SELL');

const failures = [];
if (sells.length !== 1) failures.push(`SELL rows=${sells.length} want 1 (no mirrored priv SELL)`);
if (bizSells.length !== 1) failures.push(`biz SELL count=${bizSells.length} want 1`);
if (privSells.length !== 0) failures.push(`priv SELL count=${privSells.length} want 0`);
if (qtyBiz !== 6) failures.push(`biz qty=${qtyBiz} want 6 (9-2 sell-1 grade)`);
if (qtyPriv !== 6) failures.push(`priv qty=${qtyPriv} want 6 (commercial SELL+GRADE left the pile)`);
if (qtyBizPsa !== 1) failures.push(`biz PSA qty=${qtyBizPsa} want 1`);
if (qtyPrivPsa !== 1) failures.push(`priv PSA qty=${qtyPrivPsa} want 1 (commercial GRADE-in overlays)`);
if (Math.abs(waccPrivPsa - 30) > 0.001) failures.push(`priv PSA WACC=${waccPrivPsa} want 30 (10+20)`);
if (Math.abs(waccBizPsa - 90) > 0.001) failures.push(`biz PSA WACC=${waccBizPsa} want 90 (70+20)`);
if (korRev !== 160) failures.push(`KOR rev=${korRev} want 160`);
if (personalCogs !== 20) failures.push(`personal COGS=${personalCogs} want 20 (2×€10, not 2×€70)`);
if (privDetailSells.length !== 1) {
  failures.push(`priv inventory detail sells=${privDetailSells.length} want 1 (the commercial SELL)`);
} else if (ScopeLedger.normalizeScope(privDetailSells[0], transactions) !== 'biz') {
  failures.push('priv inventory overlay must keep the original biz SELL, not rewrite scope');
}
if (privDetailBuys.length !== 1) {
  failures.push(`priv inventory buys=${privDetailBuys.length} want 1 (paired priv BUY only, not the biz BUY)`);
}
if (privDetailGrades.length !== 1) {
  failures.push(`priv inventory grades=${privDetailGrades.length} want 1 (commercial GRADE overlay)`);
}
if (bizDetailPrivSells.length !== 0) {
  failures.push(`biz inventory detail shows ${bizDetailPrivSells.length} private sell(s)`);
}
if (privTxTabSells.length !== 1) {
  failures.push(`private tx tab sells=${privTxTabSells.length} want 1 (collection overlay)`);
}
if (privTxTabGrades.length !== 1) {
  failures.push(`private tx tab grades=${privTxTabGrades.length} want 1`);
}
if (privTxTabBizBuys.length !== 0) {
  failures.push(`private tx tab must not overlay commercial BUYs (got ${privTxTabBizBuys.length})`);
}
if (privLedgerSells.length !== 0) {
  failures.push(`strict priv query sells=${privLedgerSells.length} want 0 (write isolation)`);
}

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const metricsBlock = app.slice(
  app.indexOf('function calculateProductMetrics'),
  app.indexOf('function cycleInvSort')
);
const detailBlock = app.slice(
  app.indexOf('function openDetail'),
  app.indexOf('function saveDetailProduct')
);
const txBlock = app.slice(
  app.indexOf('function renderTransactions'),
  app.indexOf('function renderTxTableForScope')
);
const sellBlock = app.slice(
  app.indexOf('function openModalSell'),
  app.indexOf('\nfunction updateSellScopeUI')
);
if (!metricsBlock.includes('matchesInventoryView')) {
  failures.push('calculateProductMetrics must overlay commercial SELLs via matchesInventoryView');
}
if (!metricsBlock.includes('personalCogsForSell')) {
  failures.push('calculateProductMetrics must use personalCogsForSell on the private view');
}
if (!metricsBlock.includes('gradeOut') || !/gradeOut[\s\S]*matchesInventoryView/.test(metricsBlock)) {
  failures.push('calculateProductMetrics grade out/in must use matchesInventoryView');
}
if (!detailBlock.includes("view: 'inventory'")) {
  failures.push("openDetail must query Ledger with view: 'inventory'");
}
if (!txBlock.includes("view: 'inventory'")) {
  failures.push("renderTransactions private tab must query with view: 'inventory'");
}
if (!/_sellScopeLock\s*=\s*inventoryPageScope\(\)\s*===\s*['"]biz['"]/.test(sellBlock)
  && !/_sellScopeLock\s*=\s*.*===\s*['"]biz['"]\s*\?/.test(sellBlock)) {
  failures.push('openModalSell must lock only from 商業庫存, not from 個人');
}

console.log(JSON.stringify({
  qtyBiz,
  qtyPriv,
  qtyPrivPsa,
  waccPrivPsa,
  waccBizPsa,
  personalCogs,
  sells: sells.map(t => ({ scope: t.scope, qty: t.quantity, pairId: !!t.pairId })),
  privDetailSellScopes: privDetailSells.map(t => t.scope),
  korRev,
  ok: failures.length === 0,
  failures,
}, null, 2));

process.exit(failures.length ? 1 : 0);
