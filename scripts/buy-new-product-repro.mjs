/**
 * Red-capable repro: buy modal can create a brand-new product (全新品相)
 * in the same save flow as recording a purchase.
 * Run: node scripts/buy-new-product-repro.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

assert(html.includes('id="btnBuyNewProduct"'), 'buy modal must expose ＋ 全新品相 button');
assert(html.includes('id="buyNewProductWrap"'), 'buy modal must have new-product fields wrap');
assert(html.includes('id="buyNewName"'), 'buy modal must ask for new product name');
assert(html.includes('id="buyProductMode"'), 'buy modal must track existing vs new mode');

assert(app.includes('function setBuyProductMode'), 'must toggle existing/new product mode');
assert(app.includes('function createProductFromBuyForm'), 'must create product from buy form');
assert(app.includes("q('buyProductMode')?.value === 'new'"), 'saveBuy must detect new-product mode');
assert(app.includes('createProductFromBuyForm(cost)'), 'saveBuy must create product before recordBuy');
assert(app.includes("toast(`已建立「${createdProduct.name}」並記錄進貨"), 'toast must confirm product+buy');

// Editing an existing BUY must not offer new-product mode as the primary path
assert(app.includes('newBtn.hidden = !!editTxId'), 'edit buy should hide 全新品相 button');

console.log(JSON.stringify({ ok: failures.length === 0, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
