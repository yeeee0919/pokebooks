/**
 * Red-capable repro: 「記錄銷售」從交易頁開啟時，帳戶歸屬必須可單選私人。
 * Run: node scripts/sell-scope-lock-repro.mjs
 *
 * Contract (matches openModalSell lock rules):
 * - inventory-priv tab → lock priv
 * - inventory-biz tab → lock biz
 * - other tabs (e.g. transactions) → no lock (preset only preselects)
 * - editing an existing SELL → no lock
 */

function resolveSellScopeLock({ tab, presetScope = 'biz', isEdit = false }) {
  if (isEdit) return null;
  if (tab === 'inventory-priv') return 'priv';
  if (tab === 'inventory-biz') return 'biz';
  return null;
}

/** Buggy logic shipped in 8c8fef7 — locks whenever presetScope is biz/priv. */
function resolveSellScopeLockBuggy({ tab, presetScope = 'biz', isEdit = false }) {
  if (isEdit) return null;
  if (tab === 'inventory-priv' || presetScope === 'priv') return 'priv';
  if (tab === 'inventory-biz' || presetScope === 'biz') return 'biz';
  return null;
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

// Prove the old condition is the symptom the user hit
assert(
  resolveSellScopeLockBuggy({ tab: 'transactions', presetScope: 'biz' }) === 'biz',
  'buggy: transactions + default biz preset locks to biz (user cannot pick 私人)'
);

// Expected contract
assert(
  resolveSellScopeLock({ tab: 'transactions', presetScope: 'biz' }) === null,
  'transactions page: no lock — 私人 must stay selectable'
);
assert(
  resolveSellScopeLock({ tab: 'dashboard', presetScope: 'biz' }) === null,
  'non-inventory tab: no lock'
);
assert(
  resolveSellScopeLock({ tab: 'inventory-biz', presetScope: 'biz' }) === 'biz',
  '商業庫存: lock biz'
);
assert(
  resolveSellScopeLock({ tab: 'inventory-priv', presetScope: 'priv' }) === 'priv',
  '私人庫存: lock priv'
);
assert(
  resolveSellScopeLock({ tab: 'transactions', presetScope: 'biz', isEdit: true }) === null,
  'edit mode: no lock'
);

// Mirror check: app.js must not use presetScope === 'biz' as a lock trigger
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const appPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app.js');
const app = fs.readFileSync(appPath, 'utf8');
const sellBlock = app.slice(app.indexOf('function openModalSell'), app.indexOf('function sellFormScope'));

assert(
  !/presetScope\s*===\s*['"]biz['"]/.test(sellBlock),
  'openModalSell must not lock on presetScope === "biz"'
);
assert(
  /tab\s*===\s*['"]inventory-priv['"]/.test(sellBlock) && /tab\s*===\s*['"]inventory-biz['"]/.test(sellBlock),
  'openModalSell must lock only from inventory tabs'
);

if (process.exitCode) {
  console.error('\nSell scope lock repro RED');
  process.exit(1);
}
console.log('\nSell scope lock repro GREEN');
