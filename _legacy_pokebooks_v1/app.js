/* app.js — PokéBooks v1.0 */
'use strict';

// ════════════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════════════
const STORAGE_KEY  = 'pokebooks_v1';
const IDB_NAME     = 'PokéBooksDB';
const IDB_STORE    = 'receipts';
const KOR_LIMIT    = 20000;
const MILEAGE_RATE = 0.25;

const SOURCE_LABELS = {
  initial:     '期初庫存',
  nl_inperson: '荷蘭現場',
  tw_social:   '台灣社團',
  cardmarket:  'Cardmarket',
  vinted:      'Vinted',
  other:       '其他',
};

const CATEGORY_LABELS = {
  packaging:    '📦 包材/運費',
  platform_fee: '🖥️ 平台費',
  grading_fee:  '🏅 評級費',
  mileage:      '🚗 里程費',
  travel:       '✈️ 出差費',
  accountant:   '📊 會計師費',
  office:       '🖊️ 辦公用品',
  other:        '其他',
};

const PLATFORM_LABELS = {
  cardmarket: 'Cardmarket',
  vinted:     'Vinted',
  inperson:   '現場',
  other:      '其他',
};

// ════════════════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════════════════
const DEFAULT_STATE = {
  company: { name: '', kvk: '', korStart: '', fiscalYear: 2026 },
  cardTypes: [],   // { id, name, set, language, condition, marketValue, notes, createdAt }
  lots: [],        // { id, cardTypeId, purchaseDate, qtyOriginal, qtyRemaining, costPerUnitEur, currency, origAmt, fxRate, source, receiptIds, notes }
  sales: [],       // { id, cardTypeId, date, qty, salePriceEur, fee, cogs, grossProfit, platform, buyerCountry, cert, lotAllocations, receiptIds, notes }
  expenses: [],    // { id, date, category, amountEur, desc, isPrivate, receiptIds }
  lastBackup: null,
};

let state = loadState();
let idb   = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ════════════════════════════════════════════════════════════
//  IndexedDB  (receipt images)
// ════════════════════════════════════════════════════════════
function initIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = e => { idb = e.target.result; res(idb); };
    req.onerror   = () => rej(req.error);
  });
}

function idbSave(id, blob, name) {
  return new Promise((res, rej) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ id, blob, name });
    tx.oncomplete = () => res(id);
    tx.onerror    = () => rej(tx.error);
  });
}

function idbGet(id) {
  return new Promise((res, rej) => {
    const tx  = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

function idbGetAll() {
  return new Promise((res, rej) => {
    const tx  = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

function idbDelete(id) {
  return new Promise((res, rej) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

// ════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fmt(n, dec = 2) {
  return '€' + Number(n || 0).toLocaleString('nl-NL', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fiscalYear() {
  return Number(state.company.fiscalYear || 2026);
}

function inFiscalYear(dateStr) {
  return dateStr && dateStr.startsWith(String(fiscalYear()));
}

function daysUntil(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d - now) / 86400000);
}

// ════════════════════════════════════════════════════════════
//  FIFO ENGINE
// ════════════════════════════════════════════════════════════
function getLots(cardTypeId) {
  return state.lots
    .filter(l => l.cardTypeId === cardTypeId && l.qtyRemaining > 0)
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
}

function getAvailableQty(cardTypeId) {
  return getLots(cardTypeId).reduce((s, l) => s + l.qtyRemaining, 0);
}

function fifoPreview(cardTypeId, qty) {
  // Returns { allocations: [{lotId, qty, costPerUnit}], totalCogs, ok }
  const lots = getLots(cardTypeId);
  let remaining = qty;
  const allocations = [];
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, lot.qtyRemaining);
    allocations.push({ lotId: lot.id, qty: take, costPerUnit: lot.costPerUnitEur, date: lot.purchaseDate });
    remaining -= take;
  }
  const totalCogs = allocations.reduce((s, a) => s + a.qty * a.costPerUnit, 0);
  return { allocations, totalCogs, ok: remaining <= 0 };
}

function applyFifo(cardTypeId, qty) {
  const { allocations, totalCogs, ok } = fifoPreview(cardTypeId, qty);
  if (!ok) return null;
  allocations.forEach(a => {
    const lot = state.lots.find(l => l.id === a.lotId);
    if (lot) lot.qtyRemaining -= a.qty;
  });
  return { allocations, totalCogs };
}

// ════════════════════════════════════════════════════════════
//  KOR CALCULATION
// ════════════════════════════════════════════════════════════
function korRevenue(year) {
  return state.sales
    .filter(s => s.date && s.date.startsWith(String(year)))
    .reduce((sum, s) => sum + (s.salePriceEur || 0), 0);
}

function korPct(year) {
  return Math.min(korRevenue(year) / KOR_LIMIT * 100, 100);
}

// ════════════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════════════
const PAGE_TITLES = {
  dashboard: ['儀表板',      '今年財務概覽'],
  inventory: ['庫存管理',    '批次追蹤、個別認定'],
  sales:     ['銷售記錄',    'FIFO 成本自動計算'],
  purchases: ['進貨記錄',    '庫存資產入帳'],
  expenses:  ['費用記錄',    '業務費用、里程、評級費'],
  reports:   ['損益報表',    'P&L、庫存報表、節稅追蹤'],
  calendar:  ['報稅行事曆',  '截止日提醒'],
  settings:  ['設定 & 備份', 'JSON 備份 / 還原'],
};

function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pane = document.getElementById(`tab-${tabId}`);
  const btn  = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  if (pane) pane.classList.add('active');
  if (btn)  btn.classList.add('active');

  const [title, sub] = PAGE_TITLES[tabId] || [tabId, ''];
  document.getElementById('topbarTitle').textContent = title;
  document.getElementById('topbarSub').textContent   = sub;

  refreshTab(tabId);
}

function refreshTab(tabId) {
  switch(tabId) {
    case 'dashboard': renderDashboard(); break;
    case 'inventory': renderInventory(); break;
    case 'sales':     renderSales();     break;
    case 'purchases': renderPurchases(); break;
    case 'expenses':  renderExpenses();  break;
    case 'reports':   renderReports();   break;
    case 'calendar':  renderCalendar();  break;
    case 'settings':  renderSettings();  break;
  }
  updateKorMini();
}

// ════════════════════════════════════════════════════════════
//  RENDER — DASHBOARD
// ════════════════════════════════════════════════════════════
function renderDashboard() {
  const yr  = fiscalYear();
  const rev = korRevenue(yr);
  const pct = korPct(yr);

  // KOR bar
  document.getElementById('korHeroValue').textContent = fmt(rev);
  document.getElementById('korBarFill').style.width   = pct + '%';
  document.getElementById('korRemaining').textContent = fmt(KOR_LIMIT - rev);
  document.getElementById('korSalesCount').textContent = state.sales.filter(s => inFiscalYear(s.date)).length + ' 筆';

  const dot     = document.getElementById('korDot');
  const caption = document.getElementById('korHeroCaption');
  const status  = document.getElementById('korStatus');

  if (pct >= 100) {
    dot.style.background  = '#ef4444';
    dot.style.boxShadow   = '0 0 6px #ef4444';
    caption.textContent   = '🚨 已達 KOR 上限！請立即聯絡會計師。';
    status.textContent    = '🚨 超限';
  } else if (pct >= 95) {
    dot.style.background  = '#ef4444';
    dot.style.boxShadow   = '0 0 6px #ef4444';
    caption.textContent   = '🚨 已達 95%！下一筆可能超限，請謹慎評估。';
    status.textContent    = '🔴 緊急警告';
  } else if (pct >= 85) {
    dot.style.background  = '#f97316';
    dot.style.boxShadow   = '0 0 6px #f97316';
    caption.textContent   = '⚠️ 已達 85%，請謹慎控制下半年銷售節奏。';
    status.textContent    = '🟠 警告';
  } else if (pct >= 70) {
    dot.style.background  = '#f59e0b';
    dot.style.boxShadow   = '0 0 6px #f59e0b';
    caption.textContent   = '⚡ 已達 70%，預計幾個月後接近上限，建議開始規劃。';
    status.textContent    = '🟡 注意';
  } else {
    dot.style.background  = '#10b981';
    dot.style.boxShadow   = '0 0 6px #10b981';
    caption.textContent   = '✅ 目前安全，繼續保持。';
    status.textContent    = '✅ 正常';
  }

  // Stats
  const totalQty  = state.lots.filter(l => {
    const ct = state.cardTypes.find(c => c.id === l.cardTypeId);
    return ct && l.qtyRemaining > 0;
  }).reduce((s, l) => s + l.qtyRemaining, 0);

  const totalCost = state.lots
    .filter(l => l.qtyRemaining > 0)
    .reduce((s, l) => s + l.qtyRemaining * l.costPerUnitEur, 0);

  const yearSales  = state.sales.filter(s => inFiscalYear(s.date));
  const totalRev   = yearSales.reduce((s, s2) => s + (s2.salePriceEur || 0), 0);
  const totalCogs  = yearSales.reduce((s, s2) => s + (s2.cogs || 0), 0);
  const totalFees  = yearSales.reduce((s, s2) => s + (s2.fee || 0), 0);
  const grossProfit = totalRev - totalCogs - totalFees;
  const gpMargin    = totalRev > 0 ? (grossProfit / totalRev * 100) : 0;

  const totalExp = state.expenses
    .filter(e => inFiscalYear(e.date) && !e.isPrivate)
    .reduce((s, e) => s + (e.amountEur || 0), 0);

  document.getElementById('statCards').textContent    = totalQty + ' 張';
  document.getElementById('statCardsCost').textContent = '帳面成本 ' + fmt(totalCost);
  document.getElementById('statGP').textContent       = fmt(grossProfit);
  document.getElementById('statGPMargin').textContent = '毛利率 ' + gpMargin.toFixed(1) + '%';
  document.getElementById('statExp').textContent      = fmt(totalExp);
  document.getElementById('statNet').textContent      = fmt(grossProfit - totalExp);

  // Recent transactions (last 8)
  const recent = [...state.sales.map(s => ({
    type: '💰 銷售', cardTypeId: s.cardTypeId, amount: s.salePriceEur, date: s.date,
  })), ...state.lots.map(l => ({
    type: '🛒 進貨', cardTypeId: l.cardTypeId, amount: l.qtyRemaining > 0 ? 0 : l.qtyOriginal * l.costPerUnitEur, date: l.purchaseDate, isLot: true,
  })), ...state.expenses.filter(e => !e.isPrivate).map(e => ({
    type: '💸 費用', cardTypeId: null, amount: -e.amountEur, date: e.date, desc: e.desc,
  }))]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 8);

  const recentEl = document.getElementById('dashRecentList');
  if (!recent.length) {
    recentEl.innerHTML = '<p class="empty-sm">尚無交易記錄</p>';
  } else {
    recentEl.innerHTML = recent.map(r => {
      const ct   = r.cardTypeId ? state.cardTypes.find(c => c.id === r.cardTypeId) : null;
      const name = ct ? ct.name : (r.desc || '—');
      const amtCls = r.amount >= 0 ? 'amount' : 'amount red';
      return `<div class="recent-item">
        <div>
          <div class="recent-type">${r.type}</div>
          <div class="recent-card">${escHtml(name)}</div>
        </div>
        <div class="${amtCls}">${fmt(Math.abs(r.amount))}</div>
      </div>`;
    }).join('');
  }

  // Deadlines
  const deadlines = [
    { date: fiscalYear() + 1 + '-05-01', title: '所得稅申報（Inkomstenbelasting）', desc: `${fiscalYear()} 年度所得稅申報截止` },
    { date: fiscalYear() + '-12-31', title: 'KOR 年度核查', desc: '確認本年度 KOR 資格是否維持' },
  ];
  const dlEl = document.getElementById('dashDeadlines');
  dlEl.innerHTML = deadlines.map(d => {
    const days = daysUntil(d.date);
    const daysText = days > 0 ? `還有 ${days} 天` : `已過期 ${Math.abs(days)} 天`;
    const cls = days < 14 ? 'soon' : '';
    return `<div class="deadline-item">
      <div class="deadline-date">${d.date}</div>
      <div class="deadline-desc">${escHtml(d.title)}</div>
      <div class="deadline-days ${cls}">${daysText}</div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════
//  RENDER — INVENTORY
// ════════════════════════════════════════════════════════════
function renderInventory() {
  const search  = (document.getElementById('invSearch')?.value || '').toLowerCase();
  const filter  = document.getElementById('invFilter')?.value || 'all';

  let types = state.cardTypes;
  if (search) {
    types = types.filter(c =>
      c.name.toLowerCase().includes(search) ||
      (c.set || '').toLowerCase().includes(search)
    );
  }

  // Compute per-type stock
  const list = types.map(ct => {
    const lots = state.lots.filter(l => l.cardTypeId === ct.id);
    const inStockLots = lots.filter(l => l.qtyRemaining > 0);
    const qty  = inStockLots.reduce((s, l) => s + l.qtyRemaining, 0);
    const cost = inStockLots.reduce((s, l) => s + l.qtyRemaining * l.costPerUnitEur, 0);
    const sold = state.sales.filter(s => s.cardTypeId === ct.id).reduce((s, sale) => s + sale.qty, 0);
    return { ct, qty, cost, sold };
  }).filter(item => {
    if (filter === 'in_stock') return item.qty > 0;
    if (filter === 'sold')     return item.sold > 0 || item.qty === 0;
    return true;
  });

  // Summary
  const totalTypes  = list.filter(i => i.qty > 0).length;
  const totalQty    = list.reduce((s, i) => s + i.qty, 0);
  const totalCost   = list.reduce((s, i) => s + i.cost, 0);
  const totalMarket = state.cardTypes.reduce((s, ct) => s + (ct.marketValue || 0) * (
    state.lots.filter(l => l.cardTypeId === ct.id && l.qtyRemaining > 0).reduce((q, l) => q + l.qtyRemaining, 0)
  ), 0);

  document.getElementById('invInStockCount').textContent = totalTypes;
  document.getElementById('invInStockQty').textContent   = totalQty;
  document.getElementById('invCostTotal').textContent    = fmt(totalCost);
  document.getElementById('invMarketTotal').textContent  = fmt(totalMarket);

  const el = document.getElementById('invList');
  if (!list.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">尚無庫存記錄</div>
        <div class="empty-desc">點擊「新增卡種」建立你的第一張卡，或修改搜尋條件。</div>
        <button class="btn-primary" id="btnAddCardTypeEmpty2">＋ 新增第一張卡</button>
      </div>`;
    document.getElementById('btnAddCardTypeEmpty2')?.addEventListener('click', () => openModalCardType());
    return;
  }

  el.innerHTML = list.map(({ ct, qty, cost, sold }) => {
    const statusLabel = qty > 0 ? `<span class="status-chip in-stock">在庫 ${qty} 張</span>` : `<span class="status-chip sold">全數售出</span>`;
    return `<div class="inv-card" data-id="${ct.id}">
      <div class="inv-card-icon">🃏</div>
      <div class="inv-card-main">
        <div class="inv-card-name">${escHtml(ct.name)}</div>
        <div class="inv-card-meta">${escHtml(ct.set || '—')} · ${ct.language || '—'} · ${ct.condition || '—'}</div>
      </div>
      <div class="inv-card-stats">
        ${statusLabel}
        ${qty > 0 ? `<div class="inv-cost">成本 ${fmt(cost / qty)}/張</div>` : ''}
        ${ct.marketValue ? `<div class="inv-market">市值 ${fmt(ct.marketValue)}/張</div>` : ''}
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.inv-card').forEach(card => {
    card.addEventListener('click', () => openCardDetail(card.dataset.id));
  });
}

// ════════════════════════════════════════════════════════════
//  RENDER — SALES
// ════════════════════════════════════════════════════════════
function renderSales() {
  const yr      = Number(document.getElementById('salesYearSel')?.value || fiscalYear());
  const platFil = document.getElementById('salesPlatformSel')?.value || 'all';

  let sales = state.sales.filter(s => s.date && s.date.startsWith(String(yr)));
  if (platFil !== 'all') sales = sales.filter(s => s.platform === platFil);
  sales = [...sales].sort((a, b) => b.date.localeCompare(a.date));

  const totalRev = sales.reduce((s, x) => s + (x.salePriceEur || 0), 0);
  const totalCogs= sales.reduce((s, x) => s + (x.cogs || 0), 0);
  const totalFees= sales.reduce((s, x) => s + (x.fee || 0), 0);
  const totalGP  = totalRev - totalCogs - totalFees;

  document.getElementById('salesSummaryBar').innerHTML =
    `<strong>${sales.length}</strong> 筆銷售 · 營業額 <strong>${fmt(totalRev)}</strong> · COGS <strong>${fmt(totalCogs)}</strong> · 毛利 <strong style="color:var(--green)">${fmt(totalGP)}</strong>`;

  const wrap = document.getElementById('salesTableWrap');
  if (!sales.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">💰</div><div class="empty-title">本年尚無銷售記錄</div><div class="empty-desc">從庫存頁面找到卡片點「標記售出」，或點右上角「記錄銷售」。</div></div>`;
    return;
  }

  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr>
      <th>日期</th><th>卡種</th><th>數量</th><th>平台</th>
      <th>售價</th><th>手續費</th><th>COGS</th><th>毛利</th><th>買家</th><th>操作</th>
    </tr></thead>
    <tbody>
    ${sales.map(s => {
      const ct = state.cardTypes.find(c => c.id === s.cardTypeId);
      const gp = (s.salePriceEur || 0) - (s.cogs || 0) - (s.fee || 0);
      const gpCls = gp >= 0 ? 'amount green' : 'amount red';
      return `<tr>
        <td class="mono">${s.date}</td>
        <td style="font-weight:600">${escHtml(ct?.name || '已刪除')}</td>
        <td class="mono">${s.qty}</td>
        <td>${PLATFORM_LABELS[s.platform] || s.platform}</td>
        <td class="amount">${fmt(s.salePriceEur)}</td>
        <td class="mono" style="color:var(--text3)">${fmt(s.fee || 0)}</td>
        <td class="mono" style="color:var(--text2)">${fmt(s.cogs)}</td>
        <td class="${gpCls}">${fmt(gp)}</td>
        <td style="font-size:.7rem">${s.buyerCountry || '—'}${s.buyerCountry && s.buyerCountry !== 'NL' ? ' ⚠️' : ''}</td>
        <td><button class="btn-link btn-del-sale" data-id="${s.id}">刪除</button></td>
      </tr>`;
    }).join('')}
    </tbody>
  </table></div>`;

  wrap.querySelectorAll('.btn-del-sale').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showConfirm('確認刪除這筆銷售記錄？', () => {
        // NOTE: Deleting a sale does NOT restore lot qty (audit trail). User should add a corrective lot.
        state.sales = state.sales.filter(s => s.id !== btn.dataset.id);
        saveState();
        renderSales();
        updateKorMini();
        toast('銷售記錄已刪除（庫存不自動還原，如需修正請新增批次）', 'warn');
      });
    });
  });
}

// ════════════════════════════════════════════════════════════
//  RENDER — PURCHASES
// ════════════════════════════════════════════════════════════
function renderPurchases() {
  const lots = [...state.lots].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  const wrap = document.getElementById('purchasesTableWrap');

  if (!lots.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><div class="empty-title">尚無進貨記錄</div><div class="empty-desc">點擊右上角「新增進貨批次」記錄進貨。</div></div>`;
    return;
  }

  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr>
      <th>日期</th><th>卡種</th><th>來源</th>
      <th>數量</th><th>成本/張</th><th>小計</th><th>在庫</th><th>幣別</th>
    </tr></thead>
    <tbody>
    ${lots.map(l => {
      const ct = state.cardTypes.find(c => c.id === l.cardTypeId);
      const currLabel = l.currency !== 'EUR' ? ` (${l.currency})` : '';
      return `<tr>
        <td class="mono">${l.purchaseDate}</td>
        <td style="font-weight:600">${escHtml(ct?.name || '已刪除')}</td>
        <td>${SOURCE_LABELS[l.source] || l.source}</td>
        <td class="mono">${l.qtyOriginal}</td>
        <td class="mono">${fmt(l.costPerUnitEur)}</td>
        <td class="amount">${fmt(l.qtyOriginal * l.costPerUnitEur)}</td>
        <td class="mono" style="color:${l.qtyRemaining > 0 ? 'var(--green)' : 'var(--text3)'}">${l.qtyRemaining}</td>
        <td style="font-size:.7rem;color:var(--text3)">${l.currency || 'EUR'}${currLabel}</td>
      </tr>`;
    }).join('')}
    </tbody>
  </table></div>`;
}

// ════════════════════════════════════════════════════════════
//  RENDER — EXPENSES
// ════════════════════════════════════════════════════════════
function renderExpenses() {
  const catFil = document.getElementById('expCatFilter')?.value || 'all';
  let exps = [...state.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (catFil !== 'all') exps = exps.filter(e => e.category === catFil);

  const total = exps.filter(e => !e.isPrivate).reduce((s, e) => s + (e.amountEur || 0), 0);
  document.getElementById('expSummaryBar').innerHTML =
    `<strong>${exps.length}</strong> 筆費用 · 業務費用合計 <strong>${fmt(total)}</strong>`;

  const wrap = document.getElementById('expTableWrap');
  if (!exps.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><div class="empty-title">尚無費用記錄</div></div>`;
    return;
  }

  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr>
      <th>日期</th><th>類別</th><th>說明</th><th>金額</th><th>用途</th><th>操作</th>
    </tr></thead>
    <tbody>
    ${exps.map(e => `<tr>
      <td class="mono">${e.date}</td>
      <td>${CATEGORY_LABELS[e.category] || e.category}</td>
      <td>${escHtml(e.desc)}</td>
      <td class="amount ${e.isPrivate ? 'red' : ''}">${fmt(e.amountEur)}</td>
      <td style="font-size:.7rem">${e.isPrivate ? '❌ 私人' : '✅ 業務'}</td>
      <td><button class="btn-link btn-del-exp" data-id="${e.id}">刪除</button></td>
    </tr>`).join('')}
    </tbody>
  </table></div>`;

  wrap.querySelectorAll('.btn-del-exp').forEach(btn => {
    btn.addEventListener('click', () => showConfirm('確認刪除這筆費用？', () => {
      state.expenses = state.expenses.filter(e => e.id !== btn.dataset.id);
      saveState();
      renderExpenses();
      toast('費用記錄已刪除', 'warn');
    }));
  });
}

// ════════════════════════════════════════════════════════════
//  RENDER — REPORTS
// ════════════════════════════════════════════════════════════
function renderReports() {
  const yr = Number(document.getElementById('reportsYearSel')?.value || fiscalYear());
  const yearSales = state.sales.filter(s => s.date?.startsWith(String(yr)));
  const yearExps  = state.expenses.filter(e => e.date?.startsWith(String(yr)) && !e.isPrivate);

  const revenue   = yearSales.reduce((s, x) => s + (x.salePriceEur || 0), 0);
  const cogs      = yearSales.reduce((s, x) => s + (x.cogs || 0), 0);
  const fees      = yearSales.reduce((s, x) => s + (x.fee || 0), 0);
  const grossProfit = revenue - cogs - fees;

  const expByCategory = {};
  yearExps.forEach(e => {
    expByCategory[e.category] = (expByCategory[e.category] || 0) + (e.amountEur || 0);
  });
  const totalExp = yearExps.reduce((s, e) => s + (e.amountEur || 0), 0);
  const opProfit = grossProfit - totalExp;

  // Zelfstandigenaftrek (manual threshold display)
  const ZFA = 1200, SFA = 2123, MKB = 0.127;
  const afterZFA   = Math.max(0, opProfit - ZFA);
  const afterSFA   = Math.max(0, afterZFA - SFA);
  const afterMKB   = afterSFA * (1 - MKB);
  const estimatedTax = afterMKB * 0.3697; // Box 1 basic rate (illustrative)

  // Inventory
  const invCost = state.lots.filter(l => l.qtyRemaining > 0)
    .reduce((s, l) => s + l.qtyRemaining * l.costPerUnitEur, 0);

  const el = document.getElementById('reportsContent');
  el.innerHTML = `
  <div class="report-section">
    <div class="report-title">📊 損益表（Winst- en Verliesrekening）${yr}</div>
    <div class="pl-table">
      <div class="pl-row subtotal"><span>營業額（Omzet）</span><span class="pl-val">${fmt(revenue)}</span></div>
      <div class="pl-row indent"><span>銷售筆數：${yearSales.length} 筆</span></div>
      <div class="pl-row indent"><span>— 售出成本 COGS</span><span class="pl-val">${fmt(-cogs)}</span></div>
      <div class="pl-row indent"><span>— 平台手續費</span><span class="pl-val">${fmt(-fees)}</span></div>
      <div class="pl-row subtotal"><span>毛利（Brutowinst）</span><span class="pl-val">${fmt(grossProfit)}</span></div>
      <br/>
      <div class="pl-row subtotal"><span>營業費用（Kosten）</span><span class="pl-val">${fmt(-totalExp)}</span></div>
      ${Object.entries(expByCategory).map(([cat, amt]) =>
        `<div class="pl-row indent"><span>${CATEGORY_LABELS[cat] || cat}</span><span class="pl-val">${fmt(-amt)}</span></div>`
      ).join('')}
      <div class="pl-row total"><span>稅前利潤（Winst voor belasting）</span><span class="pl-val">${fmt(opProfit)}</span></div>
    </div>
  </div>

  <div class="report-section">
    <div class="report-title">🧮 節稅試算（僅供參考）</div>
    <div class="pl-table">
      <div class="pl-row"><span>稅前利潤</span><span class="pl-val">${fmt(opProfit)}</span></div>
      <div class="pl-row indent"><span>— zelfstandigenaftrek（需達 1,225 工時）</span><span class="pl-val" style="color:var(--green)">-${fmt(ZFA)}</span></div>
      <div class="pl-row indent"><span>— startersaftrek（創業前 5 年）</span><span class="pl-val" style="color:var(--green)">-${fmt(SFA)}</span></div>
      <div class="pl-row indent"><span>— MKB-winstvrijstelling 12.7%</span><span class="pl-val" style="color:var(--green)">-${fmt(afterSFA * MKB)}</span></div>
      <div class="pl-row subtotal"><span>應稅所得（Box 1 估算）</span><span class="pl-val">${fmt(afterMKB)}</span></div>
      <div class="pl-row total"><span>所得稅估算（36.97%）</span><span class="pl-val" style="color:var(--red)">${fmt(estimatedTax)}</span></div>
    </div>
    <div class="hint-text" style="margin-top:.5rem">⚠️ 上述節稅資格（工時達標、startersaftrek 年限）需個別確認，請報稅前諮詢會計師。</div>
  </div>

  <div class="report-section">
    <div class="report-title">📦 庫存報表（Balans 片段）</div>
    <div class="pl-table">
      <div class="pl-row"><span>庫存資產（Voorraad，成本計）</span><span class="pl-val">${fmt(invCost)}</span></div>
      <div class="pl-row"><span>在庫種類 / 張數</span><span class="pl-val">${state.cardTypes.filter(ct => state.lots.some(l => l.cardTypeId === ct.id && l.qtyRemaining > 0)).length} 種 / ${state.lots.filter(l => l.qtyRemaining > 0).reduce((s, l) => s + l.qtyRemaining, 0)} 張</span></div>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  RENDER — CALENDAR
// ════════════════════════════════════════════════════════════
function renderCalendar() {
  const yr = fiscalYear();
  const deadlines = [
    { date: `${yr + 1}-05-01`, title: `${yr} 所得稅申報（Inkomstenbelasting）`, desc: '每年 3 月 1 日起可在 MijnBelastingdienst 開始申報。截止 5 月 1 日（可申請延期）。', important: true },
    { date: `${yr}-12-31`, title: 'KOR 年度上限核查', desc: `確認 ${yr} 年度 KOR 營業額未超 €20,000。若接近上限請提前規劃 ${yr + 1} 年策略。`, important: false },
    { date: `${yr + 1}-01-31`, title: 'KOR 資格延續確認', desc: '若要繼續使用 KOR，確認下一年度仍符合資格（無需特別申請，但須主動監控）。', important: false },
  ];

  const el = document.getElementById('calendarContent');
  el.innerHTML = `
    <div style="margin-bottom:1rem;font-size:.78rem;color:var(--text2)">
      以下為 ${yr} 稅年的重要截止日。法規可能變更，正式截止日以 Belastingdienst 官網為準。
    </div>
    ${deadlines.map(d => {
    const days = daysUntil(d.date);
    const badgeCls = days < 30 ? 'urgent' : days < 90 ? 'soon' : 'ok';
    const badgeText = days < 0 ? '已過期' : days < 30 ? `緊急 ${days} 天` : days < 90 ? `${days} 天後` : `${days} 天後`;
    const [, mo, day] = d.date.split('-');
    return `<div class="cal-item">
      <div class="cal-date-box">
        <div class="cal-date-month">${mo}月</div>
        <div class="cal-date-day">${day}</div>
      </div>
      <div class="cal-info">
        <div class="cal-title">${escHtml(d.title)}</div>
        <div class="cal-desc">${escHtml(d.desc)}</div>
      </div>
      <div class="cal-badge ${badgeCls}">${badgeText}</div>
    </div>`;
  }).join('')}`;
}

// ════════════════════════════════════════════════════════════
//  RENDER — SETTINGS
// ════════════════════════════════════════════════════════════
function renderSettings() {
  document.getElementById('setCompanyName').value = state.company.name || '';
  document.getElementById('setKvk').value          = state.company.kvk || '';
  document.getElementById('setKorStart').value      = state.company.korStart || '';
  document.getElementById('setFiscalYear').value    = state.company.fiscalYear || 2026;

  const last = state.lastBackup
    ? '最後備份：' + new Date(state.lastBackup).toLocaleString('zh-TW')
    : '尚未備份 — 建議每次記帳後備份一次';
  document.getElementById('backupMeta').textContent = last;
}

// ════════════════════════════════════════════════════════════
//  KOR MINI UPDATE
// ════════════════════════════════════════════════════════════
function updateKorMini() {
  const yr  = fiscalYear();
  const rev = korRevenue(yr);
  const pct = korPct(yr);
  document.getElementById('korMiniValue').textContent = fmt(rev);
  document.getElementById('korMiniPct').textContent   = pct.toFixed(1) + '%';
  document.getElementById('korMiniFill').style.width  = pct + '%';
  document.getElementById('yearBadge').textContent    = yr + ' 稅年';
}

// ════════════════════════════════════════════════════════════
//  CARD TYPE MODAL
// ════════════════════════════════════════════════════════════
// Temporary file store for upload
const _pendingFiles = {};

function openModalCardType(ctId = null) {
  const isEdit = !!ctId;
  document.getElementById('mCardTypeTitle').textContent = isEdit ? '編輯卡種' : '新增卡種';
  document.getElementById('ctEditId').value  = ctId || '';

  const ct = isEdit ? state.cardTypes.find(c => c.id === ctId) : null;
  document.getElementById('ctName').value        = ct?.name || '';
  document.getElementById('ctSet').value         = ct?.set || '';
  document.getElementById('ctLanguage').value    = ct?.language || 'EN';
  document.getElementById('ctCondition').value   = ct?.condition || 'PSA10';
  document.getElementById('ctMarketValue').value = ct?.marketValue || '';
  document.getElementById('ctNotes').value       = ct?.notes || '';

  // Initial lot fields (only for new)
  document.getElementById('ctInitLotRow').style.display = isEdit ? 'none' : 'flex';
  document.getElementById('ctLotQty').value     = '';
  document.getElementById('ctLotCostEur').value = '';
  document.getElementById('ctLotDate').value    = today();
  document.getElementById('ctLotSource').value  = 'initial';
  document.getElementById('ctLotCurrency').value= 'EUR';
  document.getElementById('ctLotOrigAmt').value = '';
  document.getElementById('ctLotFxRate').value  = '';
  document.getElementById('ctFileList').innerHTML = '';
  _pendingFiles['ctLot'] = [];

  openModal('mCardType');
}

document.getElementById('btnSaveCardType').addEventListener('click', async () => {
  const name = document.getElementById('ctName').value.trim();
  if (!name) return toast('請輸入卡名', 'error');

  const ctId  = document.getElementById('ctEditId').value;
  const isEdit = !!ctId;

  const ctData = {
    id:          isEdit ? ctId : uid(),
    name,
    set:         document.getElementById('ctSet').value.trim(),
    language:    document.getElementById('ctLanguage').value,
    condition:   document.getElementById('ctCondition').value,
    marketValue: parseFloat(document.getElementById('ctMarketValue').value) || 0,
    notes:       document.getElementById('ctNotes').value.trim(),
    createdAt:   isEdit ? state.cardTypes.find(c => c.id === ctId)?.createdAt : new Date().toISOString(),
  };

  if (isEdit) {
    const idx = state.cardTypes.findIndex(c => c.id === ctId);
    if (idx >= 0) state.cardTypes[idx] = ctData;
  } else {
    state.cardTypes.push(ctData);

    // Initial lot
    const qty  = parseInt(document.getElementById('ctLotQty').value) || 0;
    const cost = parseFloat(document.getElementById('ctLotCostEur').value) || 0;
    if (qty > 0 && cost >= 0) {
      const currency = document.getElementById('ctLotCurrency').value;
      const receiptIds = await saveFiles(_pendingFiles['ctLot'] || []);
      state.lots.push({
        id:             uid(),
        cardTypeId:     ctData.id,
        purchaseDate:   document.getElementById('ctLotDate').value || today(),
        qtyOriginal:    qty,
        qtyRemaining:   qty,
        costPerUnitEur: cost,
        currency,
        origAmt:        parseFloat(document.getElementById('ctLotOrigAmt').value) || null,
        fxRate:         parseFloat(document.getElementById('ctLotFxRate').value) || null,
        source:         document.getElementById('ctLotSource').value,
        receiptIds,
        notes:          '',
      });
    }
  }

  saveState();
  closeModal('mCardType');
  renderInventory();
  toast(isEdit ? '卡種已更新' : '卡種已新增', 'success');
});

// ════════════════════════════════════════════════════════════
//  ADD LOT MODAL
// ════════════════════════════════════════════════════════════
function openModalAddLot(cardTypeId) {
  document.getElementById('lotCardTypeId').value = cardTypeId;
  const ct = state.cardTypes.find(c => c.id === cardTypeId);
  document.getElementById('lotCardTypeName').textContent = ct?.name || '—';
  document.getElementById('lotQty').value     = '';
  document.getElementById('lotCostEur').value = '';
  document.getElementById('lotDate').value    = today();
  document.getElementById('lotSource').value  = 'nl_inperson';
  document.getElementById('lotCurrency').value= 'EUR';
  document.getElementById('lotOrigAmt').value = '';
  document.getElementById('lotFxRate').value  = '';
  document.getElementById('lotNotes').value   = '';
  document.getElementById('lotFxRow').style.display = 'none';
  document.getElementById('lotFileList').innerHTML = '';
  document.getElementById('lotReceiptHint').textContent = '';
  _pendingFiles['lot'] = [];
  updateLotReceiptHint();
  openModal('mAddLot');
}

document.getElementById('btnSaveLot').addEventListener('click', async () => {
  const cardTypeId = document.getElementById('lotCardTypeId').value;
  const qty  = parseInt(document.getElementById('lotQty').value);
  const cost = parseFloat(document.getElementById('lotCostEur').value);
  const date = document.getElementById('lotDate').value;
  if (!qty || qty < 1) return toast('請輸入數量', 'error');
  if (isNaN(cost) || cost < 0) return toast('請輸入成本', 'error');
  if (!date) return toast('請選擇日期', 'error');

  const currency = document.getElementById('lotCurrency').value;
  const receiptIds = await saveFiles(_pendingFiles['lot'] || []);

  state.lots.push({
    id:             uid(),
    cardTypeId,
    purchaseDate:   date,
    qtyOriginal:    qty,
    qtyRemaining:   qty,
    costPerUnitEur: cost,
    currency,
    origAmt:        parseFloat(document.getElementById('lotOrigAmt').value) || null,
    fxRate:         parseFloat(document.getElementById('lotFxRate').value) || null,
    source:         document.getElementById('lotSource').value,
    receiptIds,
    notes:          document.getElementById('lotNotes').value.trim(),
  });

  saveState();
  closeModal('mAddLot');
  renderInventory();
  if (document.getElementById('mCardDetail').classList.contains('open')) {
    openCardDetail(cardTypeId);
  }
  toast(`已新增 ${qty} 張批次`, 'success');
});

function updateLotReceiptHint() {
  const src = document.getElementById('lotSource').value;
  const hints = {
    nl_inperson: '建議上傳：Revolut 付款截圖 ＋ 聊天談價截圖',
    tw_social:   '建議上傳：LINE/Facebook 談價截圖 ＋ 台灣銀行轉帳截圖 ＋ 匯率說明截圖',
    cardmarket:  '建議上傳：Cardmarket 訂單確認截圖',
    initial:     '建議上傳：市值佐證截圖（Cardmarket trend / eBay sold price）',
    other:       '建議上傳任何相關佐證截圖',
  };
  document.getElementById('lotReceiptHint').textContent = hints[src] || '';
}

// ════════════════════════════════════════════════════════════
//  RECORD SALE MODAL
// ════════════════════════════════════════════════════════════
function openModalRecordSale(presetCardTypeId = null) {
  // Populate card type select with only in-stock types
  const sel = document.getElementById('saleCardType');
  const inStockTypes = state.cardTypes.filter(ct => getAvailableQty(ct.id) > 0);
  sel.innerHTML = '<option value="">— 選擇卡種 —</option>' +
    inStockTypes.map(ct => `<option value="${ct.id}">${escHtml(ct.name)} (可售 ${getAvailableQty(ct.id)} 張)</option>`).join('');

  if (presetCardTypeId) {
    sel.value = presetCardTypeId;
    document.getElementById('salePresetCardTypeId').value = presetCardTypeId;
    updateFifoPreview();
  }

  document.getElementById('saleQty').value       = '1';
  document.getElementById('salePriceEur').value  = '';
  document.getElementById('saleDate').value      = today();
  document.getElementById('salePlatform').value  = 'cardmarket';
  document.getElementById('saleFee').value       = '';
  document.getElementById('saleBuyerCountry').value = 'NL';
  document.getElementById('saleCert').value      = '';
  document.getElementById('saleFileList').innerHTML = '';
  document.getElementById('saleNotes').value     = '';
  document.getElementById('ossWarn').style.display = 'none';
  _pendingFiles['sale'] = [];
  updateProfitPreview();
  openModal('mRecordSale');
}

function updateFifoPreview() {
  const ctId = document.getElementById('saleCardType').value;
  const qty  = parseInt(document.getElementById('saleQty').value) || 1;
  const box  = document.getElementById('fifoBox');

  if (!ctId) { box.style.display = 'none'; return; }

  const { allocations, totalCogs, ok } = fifoPreview(ctId, qty);
  box.style.display = 'block';

  if (!ok) {
    document.getElementById('fifoBoxContent').innerHTML =
      `<div style="color:var(--red);font-size:.75rem">⚠️ 庫存不足！可售數量：${getAvailableQty(ctId)} 張</div>`;
  } else {
    document.getElementById('fifoBoxContent').innerHTML = allocations.map(a =>
      `<div class="fifo-row">
        <span>批次 ${a.date} × ${a.qty} 張</span>
        <span class="fifo-val">${fmt(a.costPerUnit)}/張 → ${fmt(a.qty * a.costPerUnit)}</span>
      </div>`
    ).join('') +
    `<div class="fifo-row" style="font-weight:700;color:var(--text1);border-top:1px solid var(--border2);padding-top:.35rem;margin-top:.25rem">
      <span>COGS 合計</span><span class="fifo-val">${fmt(totalCogs)}</span>
    </div>`;
  }

  updateProfitPreview();
}

function updateProfitPreview() {
  const ctId  = document.getElementById('saleCardType').value;
  const qty   = parseInt(document.getElementById('saleQty').value) || 0;
  const price = parseFloat(document.getElementById('salePriceEur').value) || 0;
  const fee   = parseFloat(document.getElementById('saleFee').value) || 0;

  let cogs = 0;
  if (ctId && qty > 0) {
    const { totalCogs } = fifoPreview(ctId, qty);
    cogs = totalCogs;
  }

  const gp = price - fee - cogs;
  document.getElementById('pp-price').textContent = fmt(price);
  document.getElementById('pp-fee').textContent   = fmt(fee);
  document.getElementById('pp-cogs').textContent  = fmt(cogs);
  document.getElementById('pp-gp').textContent    = fmt(gp);
  document.getElementById('pp-gp').style.color    = gp >= 0 ? 'var(--green)' : 'var(--red)';
}

document.getElementById('btnSaveSale').addEventListener('click', async () => {
  const ctId  = document.getElementById('saleCardType').value;
  const qty   = parseInt(document.getElementById('saleQty').value);
  const price = parseFloat(document.getElementById('salePriceEur').value);
  const date  = document.getElementById('saleDate').value;

  if (!ctId)              return toast('請選擇卡種', 'error');
  if (!qty || qty < 1)    return toast('請輸入數量', 'error');
  if (isNaN(price) || price < 0) return toast('請輸入售價', 'error');
  if (!date)              return toast('請選擇日期', 'error');

  // KOR check
  const newRev = korRevenue(fiscalYear()) + price;
  if (newRev > KOR_LIMIT) {
    const proceed = await showConfirmAsync(
      `⚠️ KOR 超限警告\n這筆銷售後，年度營業額將達 ${fmt(newRev)}，超過 €20,000 上限。\n請與會計師確認後再繼續。`, '仍要記錄'
    );
    if (!proceed) return;
  }

  const avail = getAvailableQty(ctId);
  if (qty > avail) return toast(`庫存不足！可售數量：${avail} 張`, 'error');

  const fee   = parseFloat(document.getElementById('saleFee').value) || 0;
  const { allocations, totalCogs } = fifoPreview(ctId, qty);

  // Apply FIFO (deduct qty from lots)
  const result = applyFifo(ctId, qty);
  if (!result) return toast('FIFO 計算失敗', 'error');

  const receiptIds = await saveFiles(_pendingFiles['sale'] || []);

  state.sales.push({
    id:           uid(),
    cardTypeId:   ctId,
    date,
    qty,
    salePriceEur: price,
    fee,
    cogs:         result.totalCogs,
    grossProfit:  price - fee - result.totalCogs,
    platform:     document.getElementById('salePlatform').value,
    buyerCountry: document.getElementById('saleBuyerCountry').value,
    cert:         document.getElementById('saleCert').value.trim(),
    lotAllocations: result.allocations,
    receiptIds,
    notes:        document.getElementById('saleNotes').value.trim(),
  });

  saveState();
  closeModal('mRecordSale');
  updateKorMini();

  // Refresh visible tab
  const activeTab = document.querySelector('.tab-pane.active')?.id?.replace('tab-', '');
  if (activeTab) refreshTab(activeTab);

  if (document.getElementById('mCardDetail').classList.contains('open')) {
    openCardDetail(ctId);
  }

  toast(`已記錄銷售 × ${qty} 張，毛利 ${fmt(price - fee - result.totalCogs)}`, 'success');
});

// ════════════════════════════════════════════════════════════
//  ADD EXPENSE MODAL
// ════════════════════════════════════════════════════════════
function openModalAddExpense() {
  document.getElementById('expDate').value     = today();
  document.getElementById('expCategory').value = 'packaging';
  document.getElementById('expAmount').value   = '';
  document.getElementById('expDesc').value     = '';
  document.getElementById('expFileList').innerHTML = '';
  document.getElementById('mileageRow').style.display = 'none';
  document.getElementById('expMileageCalc').textContent = '€ —';
  document.querySelector('input[name="expPrivate"][value="false"]').checked = true;
  _pendingFiles['exp'] = [];
  openModal('mAddExpense');
}

document.getElementById('btnSaveExpense').addEventListener('click', async () => {
  const date = document.getElementById('expDate').value;
  const cat  = document.getElementById('expCategory').value;
  const amt  = parseFloat(document.getElementById('expAmount').value);
  const desc = document.getElementById('expDesc').value.trim();

  if (!date) return toast('請選擇日期', 'error');
  if (isNaN(amt) || amt < 0) return toast('請輸入金額', 'error');
  if (!desc) return toast('請輸入說明', 'error');

  const isPrivate = document.querySelector('input[name="expPrivate"]:checked')?.value === 'true';
  const receiptIds = await saveFiles(_pendingFiles['exp'] || []);

  state.expenses.push({
    id: uid(),
    date,
    category:  cat,
    amountEur: amt,
    desc,
    isPrivate,
    receiptIds,
  });

  saveState();
  closeModal('mAddExpense');
  renderExpenses();
  toast('費用記錄已儲存', 'success');
});

// ════════════════════════════════════════════════════════════
//  CARD DETAIL MODAL
// ════════════════════════════════════════════════════════════
function openCardDetail(ctId) {
  const ct = state.cardTypes.find(c => c.id === ctId);
  if (!ct) return;

  document.getElementById('detailTitle').textContent = ct.name;
  document.getElementById('detailMeta').textContent  = [ct.set, ct.language, ct.condition].filter(Boolean).join(' · ');
  document.getElementById('detailCardTypeId').value  = ctId;

  // Lots (all, sorted by date for FIFO)
  const lots = state.lots
    .filter(l => l.cardTypeId === ctId)
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));

  const lotsEl = document.getElementById('detailLots');
  if (!lots.length) {
    lotsEl.innerHTML = '<div style="color:var(--text3);font-size:.78rem">尚無批次</div>';
  } else {
    lotsEl.innerHTML = lots.map((l, i) => `
      <div class="lot-row">
        <span class="lot-num">#${i + 1}</span>
        <span class="lot-date">${l.purchaseDate}</span>
        <span class="lot-source">${SOURCE_LABELS[l.source] || l.source}</span>
        <span class="lot-cost">${fmt(l.costPerUnitEur)}/張</span>
        <span class="lot-qty" style="color:${l.qtyRemaining > 0 ? 'var(--green)' : 'var(--text3)'}">
          在庫 ${l.qtyRemaining} / ${l.qtyOriginal}
        </span>
        ${l.notes ? `<span style="font-size:.68rem;color:var(--text3)">${escHtml(l.notes)}</span>` : ''}
      </div>`).join('');
  }

  // Sales history
  const sales = state.sales
    .filter(s => s.cardTypeId === ctId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const salesEl = document.getElementById('detailSales');
  if (!sales.length) {
    salesEl.innerHTML = '<div style="color:var(--text3);font-size:.78rem">尚無銷售記錄</div>';
  } else {
    salesEl.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>日期</th><th>數量</th><th>售價</th><th>COGS</th><th>毛利</th><th>平台</th></tr></thead>
      <tbody>${sales.map(s => `<tr>
        <td class="mono">${s.date}</td>
        <td class="mono">${s.qty}</td>
        <td class="amount">${fmt(s.salePriceEur)}</td>
        <td class="mono">${fmt(s.cogs)}</td>
        <td class="amount ${s.grossProfit >= 0 ? 'green' : 'red'}">${fmt(s.grossProfit)}</td>
        <td>${PLATFORM_LABELS[s.platform] || s.platform}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  // Action buttons
  const btnAddLot = document.getElementById('btnDetailAddLot');
  const btnSell   = document.getElementById('btnDetailSell');
  btnAddLot.onclick = () => { closeModal('mCardDetail'); openModalAddLot(ctId); };
  btnSell.onclick   = () => { closeModal('mCardDetail'); openModalRecordSale(ctId); };
  btnSell.disabled  = getAvailableQty(ctId) === 0;

  openModal('mCardDetail');
}

// ════════════════════════════════════════════════════════════
//  FILE HANDLING (IndexedDB)
// ════════════════════════════════════════════════════════════
async function saveFiles(fileObjs) {
  if (!idb) return [];
  const ids = [];
  for (const f of fileObjs) {
    if (f.blob && f.id) {
      await idbSave(f.id, f.blob, f.name);
      ids.push(f.id);
    }
  }
  return ids;
}

function setupFileInput(inputId, listId, pendingKey) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('change', () => {
    _pendingFiles[pendingKey] = _pendingFiles[pendingKey] || [];
    Array.from(input.files).forEach(file => {
      const id = uid();
      _pendingFiles[pendingKey].push({ id, blob: file, name: file.name });
      renderFileChip(listId, pendingKey, id, file.name, file);
    });
    input.value = '';
  });
}

function renderFileChip(listId, pendingKey, id, name, file) {
  const listEl = document.getElementById(listId);
  const chip   = document.createElement('div');
  chip.className = 'file-chip';
  chip.dataset.id = id;

  // Preview for images
  const isImg = file && file.type.startsWith('image/');

  chip.innerHTML = `<span>${isImg ? '🖼️' : '📄'} ${escHtml(name.length > 20 ? name.slice(0, 18) + '…' : name)}</span>
    <button class="file-chip-remove" title="移除">&times;</button>`;

  chip.querySelector('.file-chip-remove').addEventListener('click', e => {
    e.stopPropagation();
    _pendingFiles[pendingKey] = (_pendingFiles[pendingKey] || []).filter(f => f.id !== id);
    chip.remove();
  });

  // Click to preview
  if (isImg) {
    chip.addEventListener('click', e => {
      if (e.target.classList.contains('file-chip-remove')) return;
      const url = URL.createObjectURL(file);
      document.getElementById('imgViewerImg').src = url;
      document.getElementById('imgViewerTitle').textContent = name;
      openModal('mImageViewer');
    });
  }

  listEl.appendChild(chip);
}

// ════════════════════════════════════════════════════════════
//  JSON BACKUP / RESTORE
// ════════════════════════════════════════════════════════════
async function exportJson() {
  const allReceipts = await idbGetAll();
  const receiptData = allReceipts.map(r => ({
    id: r.id,
    name: r.name,
    b64: '', // We skip large binary for now; user organizes files separately
  }));

  const blob = new Blob([JSON.stringify({ state, receipts: receiptData }, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `pokebooks_backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);

  state.lastBackup = new Date().toISOString();
  saveState();
  renderSettings();
  toast('JSON 備份已匯出', 'success');
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.state) throw new Error('格式錯誤');
      showConfirm('匯入將覆蓋現有所有資料，確認繼續？', () => {
        state = { ...DEFAULT_STATE, ...parsed.state };
        saveState();
        toast('備份已匯入，重新整理中…', 'success');
        setTimeout(() => location.reload(), 800);
      });
    } catch(err) {
      toast('JSON 格式錯誤，無法匯入', 'error');
    }
  };
  reader.readAsText(file);
}

// ════════════════════════════════════════════════════════════
//  MODAL HELPERS
// ════════════════════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ════════════════════════════════════════════════════════════
//  CONFIRM DIALOG
// ════════════════════════════════════════════════════════════
let _confirmResolve = null;

function showConfirm(msg, onOk) {
  document.getElementById('confirmTitle').textContent = '確認';
  document.getElementById('confirmMsg').textContent   = msg;
  _confirmResolve = onOk;
  openModal('mConfirm');
}

function showConfirmAsync(msg, okLabel = '確認') {
  return new Promise(res => {
    document.getElementById('confirmTitle').textContent   = '確認';
    document.getElementById('confirmMsg').textContent     = msg;
    document.getElementById('btnConfirmOk').textContent   = okLabel;
    _confirmResolve = () => res(true);
    document.getElementById('btnConfirmCancel').onclick   = () => { closeModal('mConfirm'); res(false); };
    openModal('mConfirm');
  });
}

document.getElementById('btnConfirmOk').addEventListener('click', () => {
  if (_confirmResolve) { _confirmResolve(); _confirmResolve = null; }
  closeModal('mConfirm');
});
document.getElementById('btnConfirmCancel').addEventListener('click', () => {
  _confirmResolve = null;
  closeModal('mConfirm');
});

// ════════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════════
function toast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', warn: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${escHtml(msg)}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ════════════════════════════════════════════════════════════
//  ESCAPE HTML
// ════════════════════════════════════════════════════════════
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ════════════════════════════════════════════════════════════
function setupEventListeners() {
  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.querySelectorAll('[data-tab]').forEach(el => {
    if (!el.classList.contains('nav-btn')) {
      el.addEventListener('click', () => switchTab(el.dataset.tab));
    }
  });

  // Inventory
  document.getElementById('btnAddCardType').addEventListener('click', () => openModalCardType());
  document.getElementById('invSearch').addEventListener('input', renderInventory);
  document.getElementById('invFilter').addEventListener('change', renderInventory);

  // Sales
  document.getElementById('btnAddSale').addEventListener('click', () => openModalRecordSale());
  document.getElementById('salesYearSel').addEventListener('change', renderSales);
  document.getElementById('salesPlatformSel').addEventListener('change', renderSales);
  document.getElementById('saleCardType').addEventListener('change', updateFifoPreview);
  document.getElementById('saleQty').addEventListener('input', () => { updateFifoPreview(); updateProfitPreview(); });
  document.getElementById('salePriceEur').addEventListener('input', updateProfitPreview);
  document.getElementById('saleFee').addEventListener('input', updateProfitPreview);
  document.getElementById('saleBuyerCountry').addEventListener('change', () => {
    const v = document.getElementById('saleBuyerCountry').value;
    document.getElementById('ossWarn').style.display = (v !== 'NL') ? 'block' : 'none';
  });

  // Purchases
  document.getElementById('btnAddPurchase').addEventListener('click', () => {
    if (!state.cardTypes.length) return toast('請先新增卡種', 'warn');
    const ctId = state.cardTypes[0]?.id;
    openModalAddLot(ctId);
    // Override: let user pick card type
    const sel = document.createElement('select');
    sel.className = 'form-inp';
    sel.innerHTML = state.cardTypes.map(ct => `<option value="${ct.id}">${escHtml(ct.name)}</option>`).join('');
    sel.addEventListener('change', () => {
      document.getElementById('lotCardTypeId').value = sel.value;
      const ct = state.cardTypes.find(c => c.id === sel.value);
      document.getElementById('lotCardTypeName').textContent = ct?.name || '—';
    });
    const nameEl = document.getElementById('lotCardTypeName');
    nameEl.innerHTML = '';
    nameEl.appendChild(sel);
    sel.value = ctId;
  });

  // Expenses
  document.getElementById('btnAddExpense').addEventListener('click', openModalAddExpense);
  document.getElementById('expCatFilter').addEventListener('change', renderExpenses);
  document.getElementById('expCategory').addEventListener('change', () => {
    const isMileage = document.getElementById('expCategory').value === 'mileage';
    document.getElementById('mileageRow').style.display = isMileage ? 'flex' : 'none';
  });
  document.getElementById('expKm').addEventListener('input', () => {
    const km  = parseFloat(document.getElementById('expKm').value) || 0;
    const amt = km * MILEAGE_RATE;
    document.getElementById('expMileageCalc').textContent = fmt(amt);
    document.getElementById('expAmount').value = amt.toFixed(2);
  });

  // Reports
  document.getElementById('reportsYearSel').addEventListener('change', renderReports);
  document.getElementById('btnPrintReport').addEventListener('click', () => window.print());
  document.getElementById('btnExportZip').addEventListener('click', () => {
    toast('ZIP 匯出功能開發中，請先使用 JSON 備份', 'warn');
  });

  // Settings
  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    state.company.name       = document.getElementById('setCompanyName').value.trim();
    state.company.kvk        = document.getElementById('setKvk').value.trim();
    state.company.korStart   = document.getElementById('setKorStart').value;
    state.company.fiscalYear = parseInt(document.getElementById('setFiscalYear').value);
    saveState();
    updateKorMini();
    toast('設定已儲存', 'success');
  });
  document.getElementById('btnExportJson').addEventListener('click', exportJson);
  document.getElementById('btnQuickBackup').addEventListener('click', exportJson);
  document.getElementById('importFile').addEventListener('change', e => {
    if (e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('btnResetAll').addEventListener('click', () => {
    showConfirm('確認清除所有資料？此操作無法復原，建議先備份。', () => {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    });
  });

  // Lot currency toggle
  document.getElementById('lotCurrency').addEventListener('change', () => {
    const isFx = document.getElementById('lotCurrency').value !== 'EUR';
    document.getElementById('lotFxRow').style.display = isFx ? 'flex' : 'none';
    updateLotReceiptHint();
  });
  document.getElementById('lotSource').addEventListener('change', updateLotReceiptHint);

  // Card type currency toggle
  document.getElementById('ctLotCurrency').addEventListener('change', () => {
    const isFx = document.getElementById('ctLotCurrency').value !== 'EUR';
    document.getElementById('ctFxGroup').style.display     = isFx ? 'flex' : 'none';
    document.getElementById('ctFxRateGroup').style.display = isFx ? 'flex' : 'none';
  });

  // File inputs
  setupFileInput('ctLotFiles', 'ctFileList', 'ctLot');
  setupFileInput('lotFiles',   'lotFileList', 'lot');
  setupFileInput('saleFiles',  'saleFileList', 'sale');
  setupFileInput('expFiles',   'expFileList',  'exp');
}

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
async function init() {
  await initIDB();
  setupEventListeners();
  updateKorMini();
  switchTab('dashboard');

  // First-time greeting
  if (!state.cardTypes.length && !state.company.name) {
    setTimeout(() => {
      toast('👋 歡迎使用 PokéBooks！前往「設定」輸入公司資料，再到「庫存管理」新增第一批卡。', 'success');
    }, 500);
  }
}

init();
