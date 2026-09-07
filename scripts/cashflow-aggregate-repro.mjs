/**
 * Red-capable repro: cash-flow 資金組成 must group by 品相 + 數量 + 總金額.
 * Two sales of the same product collapse to one line.
 * Run: node scripts/cashflow-aggregate-repro.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function extractFn(src, name) {
  const start = src.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = src.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed function ${name}`);
}

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(extractFn(app, 'groupCashFlowByItem'), sandbox);
vm.runInContext(extractFn(app, 'cashFlowDetailLines'), sandbox);
const { groupCashFlowByItem, cashFlowDetailLines } = sandbox;

const failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

const grouped = groupCashFlowByItem([
  { productId: 'a', label: '偵探皮', qty: 1, amt: 320, unit: '張', date: '2026-09-01', _i: 0 },
  { productId: 'a', label: '偵探皮', qty: 1, amt: 320, unit: '張', date: '2026-09-05', _i: 1 },
  { productId: 'b', label: '傑尼龜 074svp', qty: 1, amt: 50, unit: '張', date: '2026-09-06', _i: 2 },
  { productId: 'c', label: '紅包', qty: 2, amt: 69.99, unit: '張', date: '2026-09-07', _i: 3 },
]);

assert(grouped.length === 3, `income groups=${grouped.length} want 3`);
// Newest activity first: 紅包 (09-07), then 傑尼龜 (09-06), then 偵探皮 (09-05)
assert(grouped[0].name === '紅包' && grouped[0].qty === 2 && grouped[0].amt === 69.99,
  `top row ${JSON.stringify(grouped[0])} want 紅包 ×2 €69.99`);
assert(grouped[1].name === '傑尼龜 074svp' && grouped[1].qty === 1 && grouped[1].amt === 50,
  `second row ${JSON.stringify(grouped[1])} want 傑尼龜 ×1 €50`);
assert(grouped[2].name === '偵探皮' && grouped[2].qty === 2 && grouped[2].amt === 640,
  `third row ${JSON.stringify(grouped[2])} want 偵探皮 ×2 €640`);

// Same calendar day: later-inserted row's product wins the top slot
const sameDay = groupCashFlowByItem([
  { productId: 'old', label: '舊筆', qty: 1, amt: 100, unit: '張', date: '2026-09-07', _i: 0 },
  { productId: 'new', label: '新筆', qty: 1, amt: 10, unit: '張', date: '2026-09-07', _i: 1 },
]);
assert(sameDay[0].name === '新筆' && sameDay[1].name === '舊筆',
  `same-day order ${sameDay.map(r => r.name).join(',')} want 新筆,舊筆`);

const data = {
  sellRows: [
    { productId: 'a', label: '偵探皮', qty: 1, amt: 320, fee: 5, unit: '張', date: '2026-09-01', _i: 0 },
    { productId: 'a', label: '偵探皮', qty: 1, amt: 320, fee: 5, unit: '張', date: '2026-09-02', _i: 1 },
  ],
  buyRows: [
    { productId: 'a', label: '偵探皮', qty: 3, amt: 210, unit: '張', date: '2026-08-01', _i: 0 },
    { productId: 'a', label: '偵探皮', qty: 1, amt: 70, unit: '張', date: '2026-08-02', _i: 1 },
  ],
  expRows: [
    { label: '📦 包材/運費', amt: 12, qty: 1, unit: '筆', key: 'exp:packaging', date: '2026-08-03', _i: 0 },
    { label: '📦 包材/運費', amt: 8, qty: 1, unit: '筆', key: 'exp:packaging', date: '2026-08-04', _i: 1 },
  ],
};

const income = cashFlowDetailLines('in', data);
assert(income.length === 1 && income[0].qty === 2 && income[0].amt === 640,
  `in lines ${JSON.stringify(income)} want one 偵探皮 ×2 €640`);

const out = cashFlowDetailLines('out', data);
const buyLine = out.find(r => r.name === '偵探皮');
const expLine = out.find(r => r.name === '📦 包材/運費');
const feeLine = out.find(r => r.name === '平台手續費');
assert(buyLine && buyLine.qty === 4 && buyLine.amt === 280, `buy line ${JSON.stringify(buyLine)}`);
assert(expLine && expLine.qty === 2 && expLine.amt === 20, `exp line ${JSON.stringify(expLine)}`);
assert(feeLine && feeLine.qty === 2 && feeLine.amt === 10, `fee line ${JSON.stringify(feeLine)}`);

const renderStart = app.indexOf('function renderCashFlowDetail');
const renderEnd = app.indexOf('\nfunction renderCashFlowCard', renderStart);
const renderBlock = app.slice(renderStart, renderEnd === -1 ? undefined : renderEnd);
assert(renderBlock.includes('品相'), 'detail header must include 品相');
assert(renderBlock.includes('數量'), 'detail header must include 數量');
assert(renderBlock.includes('總金額'), 'detail header must include 總金額');
assert(!renderBlock.includes('cf-detail-date'), 'must not list per-tx dates');
assert(!renderBlock.includes("tag: '銷售'"), 'must not list 銷售 tag per row');

console.log(JSON.stringify({ grouped, income, out, ok: failures.length === 0, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
