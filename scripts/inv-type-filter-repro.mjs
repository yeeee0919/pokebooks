/**
 * Red-capable repro: inventory type filter「鑑定卡」must list graded children.
 * Also: search that matches only a child must still surface that child.
 * Run: node scripts/inv-type-filter-repro.mjs
 */

function buildInventoryRoots({ products, typeFilter = '', search = '', langF = '' }) {
  let matched = products;
  if (search) {
    const q = search.toLowerCase();
    matched = matched.filter(p =>
      (p.name || '').toLowerCase().includes(q) || (p.notes || '').toLowerCase().includes(q)
    );
  }
  if (langF) matched = matched.filter(p => p.language === langF);

  const byId = new Map(products.map(p => [p.id, p]));

  // Search/lang: keep parents of matches so the tree can nest.
  // Type filter: do NOT pull in non-matching parents — promote children to roots.
  if (!typeFilter) {
    const withParents = new Map(matched.map(p => [p.id, p]));
    matched.forEach(p => {
      if (p.parentId && byId.has(p.parentId) && !withParents.has(p.parentId)) {
        withParents.set(p.parentId, byId.get(p.parentId));
      }
    });
    matched = [...withParents.values()];
  } else {
    matched = matched.filter(p => p.type === typeFilter);
  }

  const matchedIds = new Set(matched.map(p => p.id));
  const roots = [];
  const childrenMap = new Map();

  matched.forEach(p => {
    if (!p.parentId) {
      roots.push(p);
      return;
    }
    // Nest under parent only when that parent is also in the visible set
    if (matchedIds.has(p.parentId)) {
      if (!childrenMap.has(p.parentId)) childrenMap.set(p.parentId, []);
      childrenMap.get(p.parentId).push(p);
    } else {
      roots.push(p); // orphan / type-filtered child → show as root row
    }
  });

  return { roots, childrenMap, visible: matched };
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

/** Buggy logic (pre-fix): type-filter then only keep !parentId as roots */
function buildInventoryRootsBuggy({ products, typeFilter = '' }) {
  let matched = products;
  if (typeFilter) matched = matched.filter(p => p.type === typeFilter);
  const parents = matched.filter(p => !p.parentId);
  const childrenMap = new Map();
  matched.filter(p => p.parentId).forEach(ch => {
    if (!childrenMap.has(ch.parentId)) childrenMap.set(ch.parentId, []);
    childrenMap.get(ch.parentId).push(ch);
  });
  return { roots: parents, childrenMap };
}

const products = [
  { id: 'raw', name: '梵谷皮卡丘', type: '單卡', language: '英文' },
  { id: 'psa10', name: 'PSA 10 梵谷皮卡丘', type: '鑑定卡', parentId: 'raw', language: '英文' },
  { id: 'psa9', name: 'PSA 9 梵谷皮卡丘', type: '鑑定卡', parentId: 'raw', language: '英文' },
  { id: 'box', name: '禮盒', type: '卡盒', language: '日文' },
];

// Prove the user symptom on old logic
const buggy = buildInventoryRootsBuggy({ products, typeFilter: '鑑定卡' });
assert(buggy.roots.length === 0, 'buggy: 鑑定卡 filter yields zero roots (user symptom)');
assert((buggy.childrenMap.get('raw') || []).length === 2, 'buggy: children stuck under missing parent');

// Fixed contract
const graded = buildInventoryRoots({ products, typeFilter: '鑑定卡' });
assert(graded.roots.length === 2, `鑑定卡 filter lists 2 graded cards as roots (got ${graded.roots.length})`);
assert(graded.roots.every(p => p.type === '鑑定卡'), 'all roots are 鑑定卡');
assert(graded.roots.every(p => p.parentId), 'graded roots still remember parentId');

const all = buildInventoryRoots({ products, typeFilter: '' });
assert(all.roots.some(p => p.id === 'raw'), 'no type filter: raw parent is a root');
assert((all.childrenMap.get('raw') || []).length === 2, 'no type filter: graded nest under raw');

const search = buildInventoryRoots({ products, search: 'PSA 10' });
assert(search.roots.some(p => p.id === 'raw'), 'search child: parent included for tree');
assert((search.childrenMap.get('raw') || []).some(c => c.id === 'psa10'), 'search child: psa10 nested');

const lang = buildInventoryRoots({ products, langF: '日文' });
assert(lang.roots.length === 1 && lang.roots[0].id === 'box', 'lang filter still works');

// Mirror: app.js must promote orphan children when type filter set
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app.js'), 'utf8');
const start = app.indexOf('function renderInventoryPage');
const end = app.indexOf('\nfunction marketPriceCellHtml', start);
const block = app.slice(start, end === -1 ? undefined : end);

assert(/function buildInventoryRoots/.test(app), 'app.js exports buildInventoryRoots helper');
assert(
  /matchedIds\.has\(p\.parentId\)/.test(app) || /matchedIds\.has\(ch\.parentId\)/.test(app) || /roots\.push\(p\)/.test(block),
  'renderInventoryPage promotes children when parent not visible'
);
assert(
  !/if \(_invTypeFilters\[scopeF\]\) products = products\.filter\(p => p\.type === _invTypeFilters\[scopeF\]\);\s*\n\s*if \(langF\)/.test(block),
  'must not type-filter then only keep !parentId roots'
);

if (process.exitCode) {
  console.error('\nInv type filter repro RED');
  process.exit(1);
}
console.log('\nInv type filter repro GREEN');
