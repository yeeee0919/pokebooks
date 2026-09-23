'use strict';
// Cardmarket daily snapshot view model + report HTML.
// Field names follow Mac cardmarket-monitor latest.json.

const CardmarketView = (() => {
  const STATUS_LABEL = {
    ok: '正常',
    missing: '缺頁',
    no_offers: '無報價',
    error: '錯誤',
  };
  const MARKET_LABEL = { sealed: '密封', raw: '裸卡', all: '全部' };
  const CANCEL_KEYS = ['inferred_cancellations', 'cancellations', 'inferred_sales_cancelled', 'cancelled_sales'];

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isJunkTitle(s) {
    const t = String(s || '').trim();
    return !t || /^www\.cardmarket\.com$/i.test(t);
  }

  function safeUrl(u) {
    const s = String(u || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }

  function numOrNull(n) {
    if (n == null || n === '') return null;
    const v = Number(n);
    return Number.isFinite(v) ? v : null;
  }

  function eur(n) {
    const v = numOrNull(n);
    if (v == null) return '—';
    return '€' + v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function rankLabel(n) {
    if (n == null || n === '') return '—';
    return '#' + n;
  }

  function fmtTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const text = new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(d);
    return text + '（阿姆斯特丹）';
  }

  function lookupNameZh(snapshot, key) {
    if (!snapshot || !key) return '';
    const maps = [snapshot.name_zh, snapshot.names_zh, snapshot.card_names_zh];
    for (const map of maps) {
      if (map && typeof map === 'object' && !Array.isArray(map) && map[key]) return String(map[key]);
    }
    const cfg = snapshot.config;
    if (!cfg || typeof cfg !== 'object') return '';
    if (cfg.name_zh && typeof cfg.name_zh === 'object' && cfg.name_zh[key]) return String(cfg.name_zh[key]);
    const cards = cfg.cards || cfg.items;
    if (!cards || typeof cards !== 'object') return '';
    const row = Array.isArray(cards)
      ? cards.find(c => c && (c.card_key === key || c.key === key))
      : cards[key];
    if (row && row.name_zh) return String(row.name_zh);
    return '';
  }

  function displayName(card, snapshot) {
    const key = card?.card_key || '';
    const zh = card?.name_zh || lookupNameZh(snapshot, key);
    if (zh) return String(zh);
    if (!isJunkTitle(card?.note)) return String(card.note);
    if (!isJunkTitle(card?.title)) return String(card.title);
    return key || '未命名';
  }

  function laneOf(market) {
    if (!market || typeof market !== 'object') return { floor: null, rank: null, count: 0, top: [] };
    const top = Array.isArray(market.top10) ? market.top10
      : (Array.isArray(market.offers_top10) ? market.offers_top10
        : (Array.isArray(market.lowest5) ? market.lowest5 : []));
    return {
      floor: numOrNull(market.floor),
      rank: market.my_best_rank ?? null,
      count: Number(market.count) || 0,
      top,
    };
  }

  function cardModel(key, raw, snapshot) {
    const c = raw && typeof raw === 'object' ? raw : {};
    const card = c.card_key ? c : { ...c, card_key: key };
    const markets = card.markets || {};
    const sealed = laneOf(markets.sealed);
    const rawLane = laneOf(markets.raw);
    const all = laneOf(markets.all);
    return {
      key,
      name: displayName(card, snapshot),
      title: isJunkTitle(card.title) ? '' : String(card.title),
      note: isJunkTitle(card.note) ? '' : String(card.note),
      url: safeUrl(card.url),
      image_url: safeUrl(card.image_url),
      status: String(card.status || ''),
      sealed_only: !!card.sealed_only,
      primary_market: card.primary_market || (card.sealed_only ? 'sealed' : 'all'),
      floor: numOrNull(card.floor),
      guide_from_price: numOrNull(card.guide_from_price),
      my_best_rank: card.my_best_rank ?? null,
      my_listings: Array.isArray(card.my_listings) ? card.my_listings : [],
      my_listings_count_hint: Number(card.my_listings_count_hint) || 0,
      offers_top10: Array.isArray(card.offers_top10) ? card.offers_top10 : [],
      offers_top10_count_hint: Number(card.offers_top10_count_hint) || 0,
      sealed,
      raw: rawLane,
      all,
    };
  }

  function cardsOf(snapshot) {
    const cards = snapshot?.cards && typeof snapshot.cards === 'object' && !Array.isArray(snapshot.cards)
      ? snapshot.cards : {};
    return Object.entries(cards).map(([key, card]) => cardModel(key, card, snapshot));
  }

  function countsOf(rows) {
    const c = { total: rows.length, ok: 0, missing: 0, no_offers: 0, other: 0 };
    for (const row of rows) {
      if (row.status === 'ok' || row.status === 'missing' || row.status === 'no_offers') c[row.status] += 1;
      else c.other += 1;
    }
    return c;
  }

  function cancellationsOf(snapshot) {
    for (const key of CANCEL_KEYS) {
      if (Array.isArray(snapshot?.[key])) return { key, rows: snapshot[key] };
    }
    return { key: null, rows: [] };
  }

  function model(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
    const cards = cardsOf(snapshot);
    const cancel = cancellationsOf(snapshot);
    const summary = snapshot.inferred_sales_summary && typeof snapshot.inferred_sales_summary === 'object'
      ? snapshot.inferred_sales_summary : {};
    return {
      date: snapshot.date || null,
      seller: snapshot.seller || '',
      scraped_at: snapshot.scraped_at || '',
      counts: countsOf(cards),
      cards,
      confirmed: Array.isArray(snapshot.inferred_sales) ? snapshot.inferred_sales : [],
      pending: Array.isArray(snapshot.inferred_sales_pending) ? snapshot.inferred_sales_pending : [],
      cancellations: cancel.rows,
      cancellationKey: cancel.key,
      summary,
    };
  }

  function statusText(status) {
    return STATUS_LABEL[status] || (status ? String(status) : '未知');
  }

  function visibleCards(rows, ui) {
    const status = ui?.status || 'all';
    const q = String(ui?.q || '').trim().toLowerCase();
    return rows.filter(card => {
      if (status === 'sealed_only' && !card.sealed_only) return false;
      if (status !== 'all' && status !== 'sealed_only' && card.status !== status) return false;
      if (!q) return true;
      const hay = [card.name, card.title, card.note, card.key].join('\n').toLowerCase();
      return hay.includes(q);
    });
  }

  function offerBits(o) {
    const row = o && typeof o === 'object' ? o : {};
    const sealed = row.isSealed === true || row.sealed === true;
    return {
      seller: row.seller || row.sellerName || '',
      price: row.price ?? row.priceEUR ?? null,
      condition: row.condition || '',
      sealed,
      rank: row.rank ?? row.prev_rank ?? '',
      comment: row.comment || '',
      loc: row.language || row.location || '',
    };
  }

  function offerLi(o) {
    const b = offerBits(o);
    const bits = [
      b.rank !== '' && b.rank != null ? `<span class="cm-rank">${esc(rankLabel(b.rank))}</span>` : '',
      `<span class="cm-seller">${esc(b.seller || '—')}</span>`,
      `<span class="cm-price">${esc(eur(b.price))}</span>`,
      b.condition ? `<span class="cm-cond">${esc(b.condition)}</span>` : '',
      b.sealed ? '<span class="cm-seal">密封</span>' : '',
      b.loc ? `<span class="cm-loc">${esc(b.loc)}</span>` : '',
    ].filter(Boolean).join('');
    const comment = b.comment ? `<div class="cm-comment">${esc(b.comment)}</div>` : '';
    return `<li class="cm-offer">${bits}${comment}</li>`;
  }

  function countLabel(shown, hint) {
    if (hint && hint !== shown) return `${shown} 筆（索引 ${hint}）`;
    return `${shown} 筆`;
  }

  function topBlocks(card) {
    if (card.offers_top10.length) return [{ lane: '', rows: card.offers_top10 }];
    const blocks = [];
    if (card.sealed.top.length) blocks.push({ lane: '密封', rows: card.sealed.top });
    if (card.raw.top.length) blocks.push({ lane: '裸卡', rows: card.raw.top });
    if (!blocks.length && card.all.top.length) blocks.push({ lane: '全部', rows: card.all.top });
    return blocks;
  }

  function myPriceText(listings) {
    const prices = listings.map(o => numOrNull(o?.price ?? o?.priceEUR)).filter(v => v != null);
    if (!prices.length) return '—';
    return prices.map(eur).join(' · ');
  }

  function headlineRank(card) {
    if (card.sealed_only) return card.sealed.rank ?? card.my_best_rank;
    if (card.primary_market === 'sealed') return card.sealed.rank ?? card.my_best_rank;
    if (card.primary_market === 'raw') return card.raw.rank ?? card.my_best_rank;
    return card.my_best_rank ?? card.all.rank;
  }

  function laneHtml(label, lane, emph, quiet) {
    const cls = ['cm-lane', emph ? 'emph' : '', quiet ? 'quiet' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}">
      <div class="cm-lane-k">${label}</div>
      <div class="cm-lane-v">${esc(eur(lane.floor))}</div>
      <div class="cm-lane-s">排名 ${esc(rankLabel(lane.rank))}${lane.count ? ' · ' + lane.count + ' 筆' : ''}</div>
    </div>`;
  }

  function cardHtml(card) {
    const primary = card.primary_market;
    const sealedEmph = card.sealed_only || primary === 'sealed';
    const rawEmph = !card.sealed_only && primary === 'raw';
    const thumb = card.image_url
      ? `<img class="cm-thumb" alt="" src="${esc(card.image_url)}" loading="lazy" referrerpolicy="no-referrer"/>`
      : '<div class="cm-thumb cm-thumb-ph" aria-hidden="true">🃏</div>';
    const nameInner = card.url
      ? `<a href="${esc(card.url)}" target="_blank" rel="noopener noreferrer">${esc(card.name)}</a>`
      : esc(card.name);
    const blocks = topBlocks(card);
    const offersHtml = blocks.length
      ? blocks.map(b => `<div class="cm-fold-block">${b.lane ? `<div class="cm-fold-k">${esc(b.lane)}</div>` : ''}<ul class="cm-offers">${b.rows.map(offerLi).join('')}</ul></div>`).join('')
      : '<p class="cm-muted">沒有前段掛單</p>';
    const mineHtml = card.my_listings.length
      ? `<ul class="cm-offers">${card.my_listings.map(offerLi).join('')}</ul>`
      : '<p class="cm-muted">這張沒有我的掛單</p>';
    const market = MARKET_LABEL[primary] || primary || '—';
    return `<article class="cm-card${card.sealed_only ? ' sealed-only' : ''}">
      <div class="cm-card-hd">
        ${thumb}
        <div class="cm-card-id">
          <div class="cm-name">${nameInner}</div>
          <div class="cm-key">${esc(card.key)}</div>
          <div class="cm-chips">
            <span class="cm-badge st-${esc(card.status || 'other')}">${esc(statusText(card.status))}</span>
            ${card.sealed_only ? '<span class="cm-badge seal">只看密封</span>' : ''}
            <span class="cm-badge">${esc(market)}</span>
          </div>
        </div>
      </div>
      <div class="cm-lanes">
        ${laneHtml('密封地板', card.sealed, sealedEmph, false)}
        ${laneHtml('裸卡地板', card.raw, rawEmph, card.sealed_only)}
      </div>
      <div class="cm-mine">
        <span>我的售價 <b>${esc(myPriceText(card.my_listings))}</b></span>
        <span>我的排名 <b>${esc(rankLabel(headlineRank(card)))}</b></span>
        <span>地板 <b>${esc(eur(card.floor))}</b></span>
        ${card.guide_from_price != null ? `<span>指南價 <b>${esc(eur(card.guide_from_price))}</b></span>` : ''}
      </div>
      <details class="cm-fold">
        <summary>前段掛單 · ${esc(countLabel(card.offers_top10.length || blocks.reduce((n, b) => n + b.rows.length, 0), card.offers_top10_count_hint))}</summary>
        ${offersHtml}
      </details>
      <details class="cm-fold">
        <summary>我的掛單 · ${esc(countLabel(card.my_listings.length, card.my_listings_count_hint))}</summary>
        ${mineHtml}
      </details>
    </article>`;
  }

  function saleRows(rows, nameByKey) {
    if (!rows.length) return '<p class="cm-muted">沒有紀錄</p>';
    const body = rows.map(row => {
      const b = offerBits(row);
      const name = nameByKey[row.card_key] || (!isJunkTitle(row.title) ? row.title : '') || row.card_key || '未命名';
      const hours = numOrNull(row.gone_hours);
      return `<tr>
        <td>${esc(name)}</td>
        <td>${esc(b.seller || '—')}</td>
        <td class="num">${esc(eur(b.price))}</td>
        <td>${esc(b.condition || '—')}</td>
        <td>${b.sealed ? '密封' : '裸卡'}</td>
        <td class="num">${esc(rankLabel(b.rank))}</td>
        <td>${esc(row.status || '')}</td>
        <td class="num">${hours == null ? '—' : esc(hours.toLocaleString('zh-TW', { maximumFractionDigits: 1 })) + ' 時'}</td>
      </tr>`;
    }).join('');
    return `<div class="cm-table-wrap"><table class="cm-table">
      <thead><tr><th>卡片</th><th>賣家</th><th>價格</th><th>品相</th><th>類型</th><th>前次排名</th><th>狀態</th><th>消失</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  }

  function statBox(label, value, sub) {
    return `<div class="stat-box"><div><p class="sl">${esc(label)}</p><p class="sv">${esc(value)}</p>${sub ? `<p class="ss">${esc(sub)}</p>` : ''}</div></div>`;
  }

  function summaryBits(summary, confirmed, pending) {
    const count = summary.count != null ? summary.count : confirmed.length;
    const pendingCount = summary.pending_count != null ? summary.pending_count : pending.length;
    const hours = summary.confirm_hours != null ? summary.confirm_hours : 48;
    const avg = summary.avg != null ? eur(summary.avg) : '—';
    const span = (summary.min != null || summary.max != null)
      ? `${eur(summary.min)} – ${eur(summary.max)}`
      : '';
    return { count, pendingCount, hours, avg, span };
  }

  function cancelCount(m) {
    const s = m.summary || {};
    for (const key of ['cancelled_count', 'cancellation_count', 'cancellations_count']) {
      if (s[key] != null && s[key] !== '') return s[key];
    }
    if (m.cancellationKey || m.cancellations.length) return m.cancellations.length;
    return null;
  }

  function renderEmpty() {
    return `<div class="empty cm-empty cm-empty-gate">
      <div class="empty-ttl">還沒有市價</div>
      <p class="empty-desc">把今天的 Cardmarket 快照傳上來，這裡會顯示報價和成交。</p>
      <div class="cm-actions">
        <label class="btn-primary cm-upload">上傳 latest.json<input id="cmFile" type="file" accept="application/json,.json" hidden/></label>
        <button type="button" class="btn-secondary" id="cmReload">重新整理</button>
      </div>
      <details class="cm-setup">
        <summary>本機每天自動上傳</summary>
        <p>在 Vercel 設定 <b>CARDMARKET_INGEST_TOKEN</b>，再從 Mac 執行：</p>
        <pre class="cm-code">node scripts/push-cardmarket-snapshot.mjs latest.json</pre>
      </details>
    </div>`;
  }

  function renderError(message) {
    return `<div class="empty cm-empty cm-empty-gate"><div class="empty-ttl">無法載入市價</div><p class="empty-desc">${esc(message || '請稍後再試')}</p></div>`;
  }

  function dateSelect(dates, selected, extra) {
    const known = new Set((dates || []).map(d => d.date));
    const rows = Array.isArray(dates) ? dates.slice() : [];
    if (selected && !known.has(selected)) rows.unshift(extra || { date: selected, seller: '' });
    const options = [`<option value=""${selected ? '' : ' selected'}>最新</option>`].concat(rows.map(d => {
      const on = d.date === selected ? ' selected' : '';
      const label = d.seller ? `${d.date} · ${d.seller}` : d.date;
      return `<option value="${esc(d.date)}"${on}>${esc(label)}</option>`;
    }));
    return `<label class="cm-date-field">日期<select id="cmDate" class="sel">${options.join('')}</select></label>`;
  }

  function renderPage(data, ui) {
    const snapshot = data?.snapshot;
    const dates = Array.isArray(data?.dates) ? data.dates : [];
    const selected = ui?.selected || '';
    if (!snapshot && !dates.length) return renderEmpty();
    if (!snapshot) {
      return `<div class="cm-page">
        <div class="panel cm-hero"><div class="cm-actions">
          ${dateSelect(dates, selected)}
          <button type="button" class="btn-secondary" id="cmReload">重新整理</button>
          <label class="btn-secondary cm-upload">上傳 JSON<input id="cmFile" type="file" accept="application/json,.json" hidden/></label>
        </div></div>
        <div class="empty cm-empty">
          <div class="empty-ttl">這一天沒有快照</div>
          <p class="empty-desc">改選其他日期，或上傳這一天的 latest.json。</p>
        </div>
      </div>`;
    }
    const m = model(snapshot);
    if (!m) return renderEmpty();
    const date = m.date || data.date || '';
    const seller = m.seller || data.seller || '—';
    const scraped = m.scraped_at || data.scraped_at || '';
    const sales = summaryBits(m.summary, m.confirmed, m.pending);
    const cancelled = cancelCount(m);
    const shown = visibleCards(m.cards, ui);
    const nameByKey = Object.fromEntries(m.cards.map(c => [c.key, c.name]));
    const pills = [
      ['all', '全部'],
      ['ok', '正常'],
      ['missing', '缺頁'],
      ['no_offers', '無報價'],
      ['sealed_only', '只看密封'],
    ].map(([id, label]) => `<button type="button" class="pill-btn${(ui?.status || 'all') === id ? ' active' : ''}" data-cm-status="${id}">${label}</button>`).join('');
    const grid = shown.length
      ? shown.map(cardHtml).join('')
      : '<div class="empty cm-empty"><div class="empty-ttl">沒有符合的卡片</div><p class="empty-desc">換個篩選或清空搜尋。</p></div>';

    const cancelBox = cancelled == null ? '' : statBox('取消', String(cancelled), '快照內的取消筆數');
    const cancelSection = (m.cancellations.length || m.cancellationKey)
      ? `<section class="panel cm-sales">
          <div class="panel-hd"><span class="panel-title">取消</span><span class="cm-muted">${m.cancellations.length} 筆</span></div>
          ${saleRows(m.cancellations, nameByKey)}
        </section>`
      : '';

    return `<div class="cm-page">
      <div class="panel cm-hero">
        <div class="cm-hero-top">
          <div>
            <div class="docs-eyebrow">Cardmarket</div>
            <div class="cm-seller">${esc(seller)}</div>
            <p class="cm-when">抓取日 ${esc(date || '—')} · ${esc(fmtTime(scraped))}</p>
          </div>
          <div class="cm-actions">
            ${dateSelect(dates, selected, { date: selected, seller })}
            <button type="button" class="btn-secondary" id="cmReload">重新整理</button>
            <label class="btn-secondary cm-upload">上傳 JSON<input id="cmFile" type="file" accept="application/json,.json" hidden/></label>
          </div>
        </div>
      </div>
      <div class="stat-row cm-stats">
        ${statBox('正常', String(m.counts.ok), 'status = ok')}
        ${statBox('缺頁', String(m.counts.missing), 'status = missing')}
        ${statBox('無報價', String(m.counts.no_offers), 'status = no_offers')}
        ${statBox('卡片', String(m.counts.total), m.counts.other ? `其他狀態 ${m.counts.other}` : '本份快照')}
      </div>
      <div class="stat-row cm-stats">
        ${statBox('已確認成交', String(sales.count), sales.span || 'inferred_sales')}
        ${statBox('待確認', String(sales.pendingCount), sales.hours + ' 小時後才算數')}
        ${cancelBox}
        ${statBox('成交均價', sales.avg, m.summary.sealed_count != null ? `其中密封 ${m.summary.sealed_count}` : '已確認')}
      </div>
      <div class="toolbar toolbar-card">
        <div class="tl"><div class="pill-tabs">${pills}</div></div>
        <div class="tr">
          <input class="search-box" id="cmSearch" type="search" placeholder="搜尋中文名、標題、卡號…" value="${esc(ui?.q || '')}"/>
          <span class="cm-match">顯示 ${shown.length} / ${m.cards.length}</span>
        </div>
      </div>
      <div class="cm-grid" id="cmGrid">${grid}</div>
      <section class="panel cm-sales">
        <div class="panel-hd"><span class="panel-title">推斷成交 · 已確認</span><span class="cm-muted">${m.confirmed.length} 筆</span></div>
        ${saleRows(m.confirmed, nameByKey)}
      </section>
      <section class="panel cm-sales">
        <div class="panel-hd"><span class="panel-title">待確認（${esc(String(sales.hours))} 小時）</span><span class="cm-muted">${m.pending.length} 筆</span></div>
        <p class="panel-desc">購物車暫扣可能在確認時限內把掛單放回來，逾時才視為成交。</p>
        ${saleRows(m.pending, nameByKey)}
      </section>
      ${cancelSection}
    </div>`;
  }

  return {
    STATUS_LABEL,
    displayName,
    model,
    visibleCards,
    renderPage,
    renderEmpty,
    renderError,
    esc,
  };
})();

window.CardmarketView = CardmarketView;
