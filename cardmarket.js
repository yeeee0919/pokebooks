'use strict';
// Cardmarket daily snapshot view model + report HTML.
// Field names follow Mac cardmarket-monitor latest.json.
//
// Mac push contract — every field below is optional; omit them and the tab stays empty there:
//   image_url     https? URL, or data:image/(jpeg|jpg|png|webp|gif);base64,... (thumbs only)
//   card_images   { [card_key]: same image shape } — used only when card.image_url is unusable
//   inferred_sales            confirmed rows, including older days; date and/or confirmed_at
//   inferred_sales_pending    rows still inside the confirm window
//   floor_history { [card_key]: [{ date, floor, sealed_floor, raw_floor, status }, ...] }
//   floor, markets.*.floor, and each history floor are a number or an offer { price, ... }.
//   Lane rank is markets.*.my_best_rank (not the floor offer's rank).

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

  // Thumbs only. Links stay on safeUrl so javascript: and non-image data: URLs cannot become hrefs.
  const DATA_IMAGE_RE = /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/i;

  function isSafeDataImage(s) {
    const m = DATA_IMAGE_RE.exec(s);
    if (!m) return false;
    const b64 = m[1];
    return b64.length >= 4 && b64.length % 4 === 0;
  }

  function safeUrl(u) {
    const s = String(u || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }

  function safeImageUrl(u) {
    const s = String(u || '').trim();
    if (safeUrl(s)) return s;
    return isSafeDataImage(s) ? s : '';
  }

  function mappedImage(snapshot, key) {
    const map = snapshot?.card_images;
    if (!map || typeof map !== 'object' || Array.isArray(map)) return '';
    if (!Object.prototype.hasOwnProperty.call(map, key)) return '';
    return safeImageUrl(map[key]);
  }

  function imageOf(card, snapshot, key) {
    return safeImageUrl(card?.image_url) || mappedImage(snapshot, key);
  }

  // Bare numbers (and numeric strings) stay as they are. Mac latest.json also
  // stores floors as offer objects { price, seller, rank, ... }; Number(object) is
  // NaN, which used to blank the lanes and sparklines. Junk offers are ignored.
  function numOrNull(n) {
    if (n == null || n === '') return null;
    if (typeof n === 'object') {
      if (Array.isArray(n) || !Object.prototype.hasOwnProperty.call(n, 'price')) return null;
      const p = n.price;
      if (typeof p === 'number') return Number.isFinite(p) ? p : null;
      if (typeof p === 'string' && p.trim() !== '') {
        const v = Number(p);
        return Number.isFinite(v) ? v : null;
      }
      return null;
    }
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
      image_url: imageOf(card, snapshot, key),
      history: historyOf(snapshot, key),
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

  function historyOf(snapshot, key) {
    const map = snapshot?.floor_history;
    if (!map || typeof map !== 'object' || Array.isArray(map)) return [];
    if (!Object.prototype.hasOwnProperty.call(map, key)) return [];
    const rows = map[key];
    if (!Array.isArray(rows)) return [];
    const byDate = new Map();
    for (const raw of rows) {
      if (!raw || typeof raw !== 'object') continue;
      const date = String(raw.date || '').trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      byDate.set(date, {
        date,
        floor: numOrNull(raw.floor),
        sealed_floor: numOrNull(raw.sealed_floor),
        raw_floor: numOrNull(raw.raw_floor),
        status: raw.status == null ? '' : String(raw.status),
      });
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
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

  function laneHtml(label, lane, emph, quiet, trend) {
    const cls = ['cm-lane', emph ? 'emph' : '', quiet ? 'quiet' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}">
      <div class="cm-lane-k">${label}</div>
      <div class="cm-lane-v">${esc(eur(lane.floor))}</div>
      <div class="cm-lane-s">排名 ${esc(rankLabel(lane.rank))}${lane.count ? ' · ' + lane.count + ' 筆' : ''}</div>
      ${trend || ''}
    </div>`;
  }

  function deltaInfo(rows, field) {
    if (!rows || rows.length < 2) return { text: '—', cls: 'na' };
    const last = rows[rows.length - 1][field];
    const prev = rows[rows.length - 2][field];
    if (last == null || prev == null) return { text: '—', cls: 'na' };
    const cents = Math.round((last - prev) * 100);
    if (cents === 0) return { text: '持平', cls: 'flat' };
    return { text: (cents > 0 ? '+' : '−') + eur(Math.abs(cents) / 100), cls: cents > 0 ? 'up' : 'down' };
  }

  function sparkline(values, tone, title) {
    const w = 120;
    const h = 28;
    const pad = 3;
    const label = esc(title || '');
    const nums = values.filter(v => v != null);
    if (!nums.length) {
      return `<svg class="cm-spark ${tone}" viewBox="0 0 ${w} ${h}" role="img"><title>${label}</title></svg>`;
    }
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const span = (max - min) || 1;
    const n = Math.max(values.length - 1, 1);
    const xy = values.map((v, i) => {
      if (v == null) return null;
      const x = pad + (i / n) * (w - pad * 2);
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return [x, y];
    });
    let d = '';
    for (let i = 0; i < xy.length; i++) {
      const p = xy[i];
      if (!p) continue;
      d += `${xy[i - 1] ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    }
    const last = xy.reduce((acc, p) => p || acc, null);
    const dot = last ? `<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.1" fill="currentColor"/>` : '';
    return `<svg class="cm-spark ${tone}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"><title>${label}</title><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>${dot}</svg>`;
  }

  function seriesTitle(history, field) {
    return history.map(r => `${r.date} ${r[field] == null ? '—' : eur(r[field])}`).join(' · ');
  }

  function trendBits(history, field, tone) {
    if (!history.some(r => r[field] != null)) return '';
    const d = deltaInfo(history, field);
    return `<div class="cm-trend">${sparkline(history.map(r => r[field]), tone, seriesTitle(history, field))}<div class="cm-delta ${d.cls}"><span class="cm-delta-k">較前一日</span>${esc(d.text)}</div></div>`;
  }

  function historyRange(history) {
    if (!history.length) return '';
    const a = history[0].date;
    const b = history[history.length - 1].date;
    return a === b ? a : `${a} – ${b}`;
  }

  function cardTrends(card) {
    const history = card.history || [];
    const sealed = trendBits(history, 'sealed_floor', 'sealed');
    const raw = trendBits(history, 'raw_floor', 'raw');
    if (!sealed && !raw) {
      const floor = trendBits(history, 'floor', 'sealed');
      if (!floor) return { sealed: '', raw: '', extra: '' };
      return {
        sealed: '',
        raw: '',
        extra: `<div class="cm-trend cm-trend-floor"><div class="cm-trend-k">地板</div>${floor}</div>`,
      };
    }
    const range = historyRange(history);
    return { sealed, raw, extra: range ? `<p class="cm-range">地板 ${esc(range)}</p>` : '' };
  }

  const THUMB_PH = '<div class="cm-thumb cm-thumb-ph" aria-hidden="true">🃏</div>';
  const THUMB_ONERROR = "this.onerror=null;this.outerHTML='<div class=&quot;cm-thumb cm-thumb-ph&quot; aria-hidden=&quot;true&quot;>🃏</div>'";

  function thumbHtml(url) {
    if (!url) return THUMB_PH;
    return `<img class="cm-thumb" alt="" src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" onerror="${THUMB_ONERROR}"/>`;
  }

  function orderBtn(label, dir, key, disabled, aria) {
    const ariaAttr = aria ? ` aria-label="${esc(aria)}"` : '';
    return `<button type="button" class="cm-order-btn" data-cm-move="${dir}" data-cm-key="${esc(key)}"${ariaAttr}${disabled ? ' disabled' : ''}>${label}</button>`;
  }

  function cardHtml(card, index, total) {
    const primary = card.primary_market;
    const sealedEmph = card.sealed_only || primary === 'sealed';
    const rawEmph = !card.sealed_only && primary === 'raw';
    const trends = cardTrends(card);
    const thumb = thumbHtml(card.image_url);
    const atTop = index <= 0;
    const atBottom = index >= total - 1;
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
    return `<article class="cm-card${card.sealed_only ? ' sealed-only' : ''}" data-card-key="${esc(card.key)}">
      <div class="cm-card-tools">
        <button type="button" class="drag-handle" aria-label="拖曳調整順序" title="拖曳調整順序">⋮⋮</button>
        <div class="cm-order-btns">
          ${orderBtn('置頂', 'top', card.key, atTop)}
          ${orderBtn('↑', 'up', card.key, atTop, '上移')}
          ${orderBtn('↓', 'down', card.key, atBottom, '下移')}
          ${orderBtn('置底', 'bottom', card.key, atBottom)}
        </div>
      </div>
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
        ${laneHtml('密封地板', card.sealed, sealedEmph, false, trends.sealed)}
        ${laneHtml('裸卡地板', card.raw, rawEmph, card.sealed_only, trends.raw)}
      </div>
      ${trends.extra}
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

  function amsterdamYmd(iso) {
    if (iso == null || iso === '') return '';
    const dt = iso instanceof Date ? iso : new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dt);
  }

  function addDays(iso, delta) {
    const [y, m, d] = String(iso).split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + delta));
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function saleWhen(row) {
    const d = String(row?.date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
      const label = d.slice(0, 10);
      return { label, key: Date.parse(label + 'T12:00:00Z') || 0 };
    }
    const c = row?.confirmed_at ?? row?.confirmedAt ?? '';
    if (c == null || c === '') return { label: '—', key: 0 };
    const dt = new Date(c);
    if (Number.isNaN(dt.getTime())) {
      const m = String(c).match(/\d{4}-\d{2}-\d{2}/);
      return m ? { label: m[0], key: Date.parse(m[0] + 'T12:00:00Z') || 0 } : { label: '—', key: 0 };
    }
    return { label: amsterdamYmd(dt), key: dt.getTime() };
  }

  function snapshotAnchor(m) {
    const d = String(m?.date || '').trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return amsterdamYmd(m?.scraped_at);
  }

  function emptyWeek(anchor) {
    return {
      anchor: anchor || '',
      start: '',
      end: '',
      count: 0,
      min: null,
      max: null,
      avg: null,
      sealed: 0,
      raw: 0,
      top: null,
      days: [],
      rows: [],
    };
  }

  // Last 7 calendar days inclusive, ending on the snapshot date (else scraped_at in Amsterdam).
  // Figures come from inferred_sales rows. inferred_sales_summary is the whole snapshot, not this window.
  function recentConfirmed(snapshotOrModel) {
    const m = snapshotOrModel && Array.isArray(snapshotOrModel.confirmed)
      ? snapshotOrModel
      : model(snapshotOrModel);
    if (!m) return emptyWeek('');
    const anchor = snapshotAnchor(m);
    if (!anchor) return emptyWeek('');
    const start = addDays(anchor, -6);
    const end = anchor;
    const rows = [];
    for (const row of m.confirmed) {
      const label = saleWhen(row).label;
      if (/^\d{4}-\d{2}-\d{2}$/.test(label) && label >= start && label <= end) rows.push(row);
    }
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      let count = 0;
      for (const row of rows) if (saleWhen(row).label === date) count += 1;
      days.push({ date, count });
    }
    if (!rows.length) {
      return { anchor, start, end, count: 0, min: null, max: null, avg: null, sealed: 0, raw: 0, top: null, days, rows };
    }
    const prices = [];
    let sealed = 0;
    let raw = 0;
    const byCard = new Map();
    for (const row of rows) {
      if (offerBits(row).sealed) sealed += 1;
      else raw += 1;
      const price = numOrNull(offerBits(row).price);
      if (price != null) prices.push(price);
      const key = row && row.card_key != null ? String(row.card_key) : '';
      const cur = byCard.get(key) || { key, count: 0, sum: 0 };
      cur.count += 1;
      if (price != null) cur.sum += price;
      byCard.set(key, cur);
    }
    let top = null;
    for (const cur of byCard.values()) {
      if (!top || cur.count > top.count || (cur.count === top.count && cur.sum > top.sum)) top = cur;
    }
    const avg = prices.length ? prices.reduce((sum, n) => sum + n, 0) / prices.length : null;
    return {
      anchor,
      start,
      end,
      count: rows.length,
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
      avg,
      sealed,
      raw,
      top,
      days,
      rows,
    };
  }

  function topSaleName(week, nameByKey) {
    const top = week?.top;
    if (!top) return '';
    if (top.key && nameByKey && nameByKey[top.key]) return String(nameByKey[top.key]);
    const row = (week.rows || []).find(r => String(r?.card_key || '') === top.key);
    if (row && !isJunkTitle(row.title)) return String(row.title);
    if (row && !isJunkTitle(row.note)) return String(row.note);
    return top.key || '未命名';
  }

  function weekHtml(m, nameByKey) {
    const week = recentConfirmed(m);
    const range = week.start ? (week.start === week.end ? week.start : `${week.start} – ${week.end}`) : '';
    if (!week.anchor) {
      return `<div class="cm-week cm-week-empty" aria-label="最近七日成交"><span class="cm-week-title">最近七日成交</span><span class="cm-muted">快照沒有日期，無法對照最近七日</span></div>`;
    }
    if (!week.count) {
      return `<div class="cm-week cm-week-empty" aria-label="最近七日成交"><span class="cm-week-title">最近七日成交</span>${range ? `<span class="cm-week-dates">${esc(range)}</span>` : ''}<span class="cm-muted">這段沒有已確認成交</span></div>`;
    }
    const priceBit = week.min == null ? '' : `<span class="cm-week-metric cm-week-span"><span class="cm-week-k">價格</span><b>${esc(week.min === week.max ? eur(week.min) : `${eur(week.min)} – ${eur(week.max)}`)}</b></span>`;
    const avgBit = week.avg == null ? '' : `<span class="cm-week-metric cm-week-avg"><span class="cm-week-k">均價</span><b>${esc(eur(week.avg))}</b></span>`;
    const topName = topSaleName(week, nameByKey);
    const spark = sparkline(week.days.map(d => d.count), 'raw', week.days.map(d => `${d.date} ${d.count} 筆`).join(' · '));
    return `<div class="cm-week" aria-label="最近七日成交">
      <div class="cm-week-hd"><span class="cm-week-title">最近七日成交</span>${range ? `<span class="cm-week-dates">${esc(range)}</span>` : ''}</div>
      <div class="cm-week-metrics">
        <span class="cm-week-metric cm-week-count"><span class="cm-week-k">筆數</span><b>${week.count}</b></span>
        ${priceBit}
        ${avgBit}
        <span class="cm-week-metric cm-week-split"><span class="cm-week-k">密封 / 裸卡</span><b>${week.sealed} / ${week.raw}</b></span>
        ${topName ? `<span class="cm-week-metric cm-week-top"><span class="cm-week-k">最多</span><b>${esc(topName)}</b></span>` : ''}
        <span class="cm-week-metric cm-week-spark"><span class="cm-week-k">逐日</span>${spark}</span>
      </div>
    </div>`;
  }

  function applyCustomOrder(cards, orderKeys) {
    const list = Array.isArray(cards) ? cards : [];
    const rank = new Map();
    (Array.isArray(orderKeys) ? orderKeys : []).forEach((k, i) => {
      const key = String(k);
      if (!rank.has(key)) rank.set(key, i);
    });
    const known = [];
    const unknown = [];
    for (const card of list) {
      if (rank.has(card.key)) known.push(card);
      else unknown.push(card);
    }
    known.sort((a, b) => rank.get(a.key) - rank.get(b.key));
    return known.concat(unknown);
  }

  function mergeVisibleOrder(stored, allKeys, visibleKeys) {
    const all = (Array.isArray(allKeys) ? allKeys : []).map(String);
    const existing = new Set(all);
    const base = [];
    const seen = new Set();
    for (const k of (Array.isArray(stored) ? stored : [])) {
      const key = String(k);
      if (existing.has(key) && !seen.has(key)) {
        base.push(key);
        seen.add(key);
      }
    }
    for (const key of all) {
      if (!seen.has(key)) {
        base.push(key);
        seen.add(key);
      }
    }
    const queue = [];
    const visibleSet = new Set();
    for (const k of (Array.isArray(visibleKeys) ? visibleKeys : [])) {
      const key = String(k);
      if (existing.has(key) && !visibleSet.has(key)) {
        visibleSet.add(key);
        queue.push(key);
      }
    }
    return base.map(k => (visibleSet.has(k) ? queue.shift() : k));
  }

  function moveCardKey(keys, key, dir) {
    const list = (Array.isArray(keys) ? keys : []).map(String);
    const id = String(key);
    const i = list.indexOf(id);
    if (i < 0) return list;
    const next = list.slice();
    if (dir === 'up' && i > 0) {
      next.splice(i - 1, 2, next[i], next[i - 1]);
    } else if (dir === 'down' && i < next.length - 1) {
      next.splice(i, 2, next[i + 1], next[i]);
    } else if (dir === 'top' && i > 0) {
      next.splice(i, 1);
      next.unshift(id);
    } else if (dir === 'bottom' && i < next.length - 1) {
      next.splice(i, 1);
      next.push(id);
    }
    return next;
  }

  function sortedSales(rows) {
    return rows.map((row, i) => ({ row, i, when: saleWhen(row) })).sort((a, b) => {
      return (b.when.key - a.when.key) || (a.i - b.i);
    });
  }

  function saleRows(rows, nameByKey) {
    if (!rows.length) return '<p class="cm-muted">沒有紀錄</p>';
    const body = sortedSales(rows).map(({ row, when }) => {
      const b = offerBits(row);
      const name = nameByKey[row.card_key] || (!isJunkTitle(row.title) ? row.title : '') || row.card_key || '未命名';
      const hours = numOrNull(row.gone_hours);
      return `<tr>
        <td class="num">${esc(when.label)}</td>
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
      <thead><tr><th>日期</th><th>卡片</th><th>賣家</th><th>價格</th><th>品相</th><th>類型</th><th>前次排名</th><th>狀態</th><th>消失</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  }

  function confirmHours(summary) {
    const hours = summary && summary.confirm_hours;
    if (hours == null || hours === '') return 48;
    return hours;
  }

  function renderEmpty() {
    return `<div class="empty cm-empty">
      <div class="empty-ico">📈</div>
      <div class="empty-ttl">尚無 Cardmarket 每日快照</div>
      <p class="empty-desc">Mac 上的 cardmarket-monitor 要把 <span class="mono">latest.json</span> 推上來。在 Vercel 設定環境變數 <b>CARDMARKET_INGEST_TOKEN</b>（長隨機字串，不是網頁密碼），再從 Mac 上傳。</p>
      <pre class="cm-code">curl -X POST "$POKELEDGER_URL/api/cardmarket" \\
  -H "Authorization: Bearer $CARDMARKET_INGEST_TOKEN" \\
  -H "Content-Type: application/json" \\
  --data-binary @latest.json</pre>
      <p class="empty-desc">或執行 <span class="mono">node scripts/push-cardmarket-snapshot.mjs latest.json</span>。已登入時也可以直接選檔上傳。上傳後按重新整理。</p>
      <div class="cm-actions">
        <button type="button" class="btn-secondary" id="cmReload">重新整理</button>
        <label class="btn-secondary cm-upload">上傳 latest.json<input id="cmFile" type="file" accept="application/json,.json" hidden/></label>
      </div>
    </div>`;
  }

  function renderError(message) {
    return `<div class="empty cm-empty"><div class="empty-ico">⚠️</div><div class="empty-ttl">無法載入市價</div><p class="empty-desc">${esc(message || '請稍後再試')}</p></div>`;
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
          <div class="empty-ico">📈</div>
          <div class="empty-ttl">這一天沒有快照</div>
          <p class="empty-desc">改選其他日期，或用 <b>CARDMARKET_INGEST_TOKEN</b> 上傳 latest.json。</p>
        </div>
      </div>`;
    }
    const m = model(snapshot);
    if (!m) return renderEmpty();
    const date = m.date || data.date || '';
    const seller = m.seller || data.seller || '—';
    const scraped = m.scraped_at || data.scraped_at || '';
    const hours = confirmHours(m.summary);
    const shown = applyCustomOrder(visibleCards(m.cards, ui), ui?.order);
    const nameByKey = Object.fromEntries(m.cards.map(c => [c.key, c.name]));
    const pills = [
      ['all', '全部'],
      ['ok', '正常'],
      ['missing', '缺頁'],
      ['no_offers', '無報價'],
      ['sealed_only', '只看密封'],
    ].map(([id, label]) => `<button type="button" class="pill-btn${(ui?.status || 'all') === id ? ' active' : ''}" data-cm-status="${id}">${label}</button>`).join('');
    const grid = shown.length
      ? shown.map((card, i) => cardHtml(card, i, shown.length)).join('')
      : '<div class="empty cm-empty"><div class="empty-ttl">沒有符合的卡片</div><p class="empty-desc">換個篩選或清空搜尋。</p></div>';

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
      <div class="toolbar toolbar-card cm-toolbar">
        <div class="cm-toolbar-main">
          <div class="tl"><div class="pill-tabs">${pills}</div></div>
          <div class="tr">
            <input class="search-box" id="cmSearch" type="search" placeholder="搜尋中文名、標題、卡號…" value="${esc(ui?.q || '')}"/>
            <span class="cm-match">顯示 ${shown.length} / ${m.cards.length}</span>
          </div>
        </div>
        ${weekHtml(m, nameByKey)}
      </div>
      <div class="cm-grid" id="cmGrid">${grid}</div>
      <section class="panel cm-sales">
        <div class="panel-hd"><span class="panel-title">推斷成交 · 已確認</span><span class="cm-muted">${m.confirmed.length} 筆</span></div>
        ${saleRows(m.confirmed, nameByKey)}
      </section>
      <section class="panel cm-sales">
        <div class="panel-hd"><span class="panel-title">待確認（${esc(String(hours))} 小時）</span><span class="cm-muted">${m.pending.length} 筆</span></div>
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
    safeUrl,
    safeImageUrl,
    ORDER_KEY: 'pokeledger_cm_card_order',
    recentConfirmed,
    applyCustomOrder,
    mergeVisibleOrder,
    moveCardKey,
  };
})();

window.CardmarketView = CardmarketView;
