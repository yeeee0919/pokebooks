/**
 * Cardmarket snapshot contract: date key, ingest token, zh name, floors, sales HTML.
 * Run: node scripts/cardmarket-snapshot-repro.mjs
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { ingestAuthorized, unwrapSnapshotBody } from '../lib/cardmarket.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const sample = {
  date: '2026-09-23',
  seller: 'Pikapika007',
  scraped_at: '2026-09-23T07:17:52+00:00',
  name_zh: { 'Charizard-ex-PKMTCHSV-P-166': '噴火龍ex' },
  config: { cards: { 'Bulbasaur-V2-svG050': { name_zh: '妙蛙種子' } } },
  inferred_sales: [{
    card_key: 'Bulbasaur-V2-svG050',
    seller: 'ArchiveShop',
    price: 100,
    date: '2026-08-01',
    status: 'confirmed',
    isSealed: true,
  }, {
    card_key: 'Charizard-ex-PKMTCHSV-P-166',
    seller: 'OldShop',
    price: 8,
    date: '2026-09-20',
    status: 'confirmed',
    isSealed: true,
  }, {
    card_key: 'Charizard-ex-PKMTCHSV-P-166',
    seller: 'Deckpoint',
    price: 10,
    date: '2026-09-23',
    condition: 'NM',
    isSealed: false,
    prev_rank: 3,
    status: 'confirmed',
  }, {
    card_key: 'Charizard-ex-PKMTCHSV-P-166',
    seller: 'MidShop',
    price: 9,
    confirmed_at: '2026-09-22T10:00:00Z',
    status: 'confirmed',
    isSealed: false,
  }],
  inferred_sales_pending: [{
    card_key: 'Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158',
    title: 'Arceus & Dialga & Palkia GX',
    seller: 'SvenVM',
    price: 13.99,
    condition: 'NM',
    isSealed: false,
    primary_market: 'raw',
    prev_rank: 2,
    status: 'pending',
    gone_hours: 12.39,
  }],
  inferred_sales_summary: { count: 99, pending_count: 1, min: 1, max: 100, avg: 50, sealed_count: 9, confirm_hours: 48 },
  card_images: {
    'Bulbasaur-V2-svG050': 'data:image/png;base64,iVBORw0K',
    'Charizard-ex-PKMTCHSV-P-166': 'data:image/gif;base64,R0lGODdh',
    'Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158': 'data:image/jpeg;base64,/9j/4AAQ',
  },
  floor_history: {
    'Charizard-ex-PKMTCHSV-P-166': [
      { date: '2026-09-23', sealed_floor: 42, raw_floor: 9.5, floor: 9.5, status: 'ok' },
      { date: '2026-09-21', sealed_floor: 40, raw_floor: 10, floor: 10, status: 'ok' },
      { date: '2026-09-22', sealed_floor: 38, raw_floor: 12, floor: 12, status: 'ok' },
      { date: '2026-09-22', sealed_floor: 40, raw_floor: 11, floor: 11, status: 'ok' },
    ],
  },
  cancellations: [{ card_key: 'Ditto-SV-P173', seller: 'BKollector', price: 210, status: 'cancelled', isSealed: true }],
  cards: {
    'Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158': {
      card_key: 'Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158',
      title: 'www.cardmarket.com',
      note: 'Arceus & Dialga & Palkia GX (PKMTCH SV-P 158)',
      sealed_only: true,
      url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/Traditional-Chinese-Products/Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158',
      image_url: 'javascript:alert(1)',
      primary_market: 'all',
      guide_from_price: null,
      floor: null,
      my_best_rank: null,
      status: 'no_offers',
      markets: {
        sealed: { count: 0, floor: null, my_best_rank: null, lowest5: [] },
        raw: { count: 0, floor: null, my_best_rank: null, lowest5: [] },
      },
      offers_top10: [],
      my_listings: [],
    },
    'Charizard-ex-PKMTCHSV-P-166': {
      card_key: 'Charizard-ex-PKMTCHSV-P-166',
      title: 'Charizard ex',
      note: 'Charizard ex (PKMTCH SV-P 166)',
      sealed_only: false,
      status: 'ok',
      primary_market: 'raw',
      floor: 9.5,
      guide_from_price: 11,
      my_best_rank: 2,
      image_url: 'https://example.test/charizard.jpg',
      markets: {
        sealed: { count: 1, floor: 40, my_best_rank: 1, top10: [{ seller: 'SealShop', price: 40, isSealed: true, rank: 1 }] },
        raw: { count: 4, floor: 9.5, my_best_rank: 2, lowest5: [{ seller: 'Other', price: 9.5, condition: 'NM', rank: 1 }] },
      },
      offers_top10: [{ seller: 'Other', price: 9.5, condition: 'NM', rank: 1, isSealed: false }],
      my_listings: [{ seller: 'Pikapika007', price: 12.5, condition: 'NM', rank: 2 }],
    },
    'Bulbasaur-V2-svG050': {
      title: '<script>alert(1)</script>',
      status: 'missing',
      markets: { sealed: {}, raw: {} },
      my_listings: [],
      offers_top10: [],
    },
  },
};

const unwrapped = unwrapSnapshotBody(sample);
assert(unwrapped.date === '2026-09-23', 'date from payload.date');
assert(unwrapped.seller === 'Pikapika007', 'seller');
assert(unwrapped.payload.cards['Charizard-ex-PKMTCHSV-P-166'].floor === 9.5, 'keep card fields');

const fromScrape = unwrapSnapshotBody({
  snapshot: { scraped_at: '2026-09-23T07:17:52+00:00', seller: 'Pikapika007', cards: {} },
});
assert(fromScrape.date === '2026-09-23', 'date from scraped_at');
assert(unwrapSnapshotBody({ cards: {} }).error, 'reject missing date');
assert(unwrapSnapshotBody([]).error, 'reject array');

process.env.CARDMARKET_INGEST_TOKEN = 'test-token-abc';
assert(ingestAuthorized({ headers: { authorization: 'Bearer test-token-abc' } }), 'bearer ok');
assert(ingestAuthorized({ headers: { 'x-cardmarket-ingest-token': 'test-token-abc' } }), 'header ok');
assert(!ingestAuthorized({ headers: { authorization: 'Bearer wrong-token-xx' } }), 'wrong bearer');
assert(!ingestAuthorized({ headers: { authorization: 'Bearer test-token-abd' } }), 'same length mismatch');
delete process.env.CARDMARKET_INGEST_TOKEN;
assert(!ingestAuthorized({ headers: { authorization: 'Bearer test-token-abc' } }), 'unset token rejects');

const sandbox = { console, Intl, window: {}, URL, Date };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'cardmarket.js'), 'utf8'), sandbox, { filename: 'cardmarket.js' });
const View = sandbox.window.CardmarketView;
assert(View, 'CardmarketView loaded');

const m = View.model(sample);
assert(m.counts.ok === 1 && m.counts.missing === 1 && m.counts.no_offers === 1 && m.counts.total === 3, 'status counts ' + JSON.stringify(m.counts));
const byKey = Object.fromEntries(m.cards.map(c => [c.key, c]));
assert(byKey['Charizard-ex-PKMTCHSV-P-166'].name === '噴火龍ex', 'prefer name_zh map');
assert(byKey['Bulbasaur-V2-svG050'].name === '妙蛙種子', 'prefer config.cards name_zh over title');
assert(byKey['Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158'].name.includes('Arceus'), 'note when title is junk and no zh');
assert(byKey['Charizard-ex-PKMTCHSV-P-166'].sealed.floor === 40, 'sealed floor');
assert(byKey['Charizard-ex-PKMTCHSV-P-166'].raw.floor === 9.5, 'raw floor');
assert(byKey['Charizard-ex-PKMTCHSV-P-166'].my_best_rank === 2, 'rank');
assert(byKey['Charizard-ex-PKMTCHSV-P-166'].image_url === 'https://example.test/charizard.jpg', 'prefer card.image_url over card_images');
assert(byKey['Bulbasaur-V2-svG050'].image_url === 'data:image/png;base64,iVBORw0K', 'card_images fallback');
assert(byKey['Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158'].image_url === 'data:image/jpeg;base64,/9j/4AAQ', 'unsafe image_url falls back to card_images');
const history = byKey['Charizard-ex-PKMTCHSV-P-166'].history;
assert(history.length === 3 && history.map(r => r.date).join() === '2026-09-21,2026-09-22,2026-09-23', 'floor_history sorted, last duplicate wins');
assert(history[1].sealed_floor === 40 && history[1].raw_floor === 11, 'duplicate date keeps last row');

const jpeg = 'data:image/jpeg;base64,/9j/4AAQ';
assert(View.safeImageUrl(jpeg) === jpeg, 'jpeg data url');
assert(View.safeImageUrl('data:image/jpg;base64,/9j/4AAQ') === 'data:image/jpg;base64,/9j/4AAQ', 'jpg data url');
assert(View.safeImageUrl('data:image/png;base64,iVBORw0K') === 'data:image/png;base64,iVBORw0K', 'png data url');
assert(View.safeImageUrl('data:image/webp;base64,UklGRgAA') === 'data:image/webp;base64,UklGRgAA', 'webp data url');
assert(View.safeImageUrl('data:image/gif;base64,R0lGODdh') === 'data:image/gif;base64,R0lGODdh', 'gif data url');
assert(View.safeImageUrl('  ' + jpeg + '  ') === jpeg, 'trim data url');
assert(View.safeImageUrl('javascript:alert(1)') === '', 'reject javascript image');
assert(View.safeImageUrl('data:text/html;base64,PGh0bWw+') === '', 'reject html data url');
assert(View.safeImageUrl('data:image/svg+xml;base64,PHN2Zy8+') === '', 'reject svg data url');
assert(View.safeImageUrl('data:image/jpeg;base64,abc') === '', 'reject short base64');
assert(View.safeImageUrl('data:image/jpeg;base64,/9j/ 4AA') === '', 'reject whitespace in base64');
assert(View.safeUrl(jpeg) === '', 'card links do not accept data urls');
assert(View.safeUrl('https://example.test/a') === 'https://example.test/a', 'https link');
assert(View.safeImageUrl('https://example.test/a.jpg') === 'https://example.test/a.jpg', 'https image');

const bare = View.model({ date: '2026-09-23', cards: { A: { status: 'ok' } } });
assert(bare.cards[0].image_url === '' && bare.cards[0].history.length === 0 && bare.confirmed.length === 0, 'missing optional fields stay empty');

const html = View.renderPage({
  snapshot: sample,
  date: sample.date,
  seller: sample.seller,
  scraped_at: sample.scraped_at,
  dates: [{ date: '2026-09-23', seller: 'Pikapika007' }],
}, { q: '', status: 'all', selected: '' });
assert(html.includes('噴火龍ex'), 'renders zh name');
assert(html.includes('只看密封'), 'sealed_only emphasis');
assert(html.includes('€9,50') || html.includes('€9.50'), 'renders floor ' + html.match(/€[^<]{0,12}/g));
assert(html.includes('#2'), 'renders rank');
assert(html.includes('SvenVM'), 'renders pending sale');
assert(html.includes('Deckpoint'), 'renders confirmed sale');
assert(html.includes('BKollector'), 'renders cancellation');
assert(html.includes('&lt;script&gt;') === false, 'script title replaced by zh name');
assert(!html.includes('<script>'), 'no raw script tag');
assert(!html.includes('javascript:'), 'javascript urls stripped');
assert(html.includes('data:image/png;base64,iVBORw0K'), 'renders png data thumb');
assert(html.includes('data:image/jpeg;base64,/9j/4AAQ'), 'renders jpeg data thumb');
assert(html.includes('src="https://example.test/charizard.jpg"'), 'keeps https thumb');
assert(!html.includes('R0lGODdh'), 'card_images does not override card.image_url');
assert(html.includes('referrerpolicy="no-referrer"'), 'thumb referrerpolicy');
assert(html.includes('cm-thumb-ph'), 'broken thumb placeholder hook');
assert(html.includes('onerror="this.onerror=null;'), 'thumb onerror');
const confirmed = html.split('推斷成交 · 已確認')[1].split('待確認')[0];
const i23 = confirmed.indexOf('2026-09-23');
const i22 = confirmed.indexOf('2026-09-22');
const i20 = confirmed.indexOf('2026-09-20');
assert(confirmed.includes('>日期<') || confirmed.includes('日期'), 'confirmed sales have a date column');
assert(i23 !== -1 && i22 !== -1 && i20 !== -1 && i23 < i22 && i22 < i20, 'confirmed sales newest first ' + [i23, i22, i20]);
assert(html.includes('OldShop') && html.includes('MidShop'), 'past inferred_sales stay visible');
assert(!html.includes('地板走勢') && !html.includes('cm-insight'), 'no separate floor insights panel');
assert(!html.includes('cm-stats') && !html.includes('stat-row') && !html.includes('已確認成交') && !html.includes('成交均價'), 'summary stat boxes removed');
assert(html.includes('密封地板') && html.includes('裸卡地板') && html.includes('較前一日'), 'per-card floor trend labels');
assert(html.includes('cm-spark sealed') && html.includes('cm-spark raw'), 'sealed and raw sparklines');
const up = html.includes('+€2,00') || html.includes('+€2.00');
const down = html.includes('−€1,50') || html.includes('−€1.50') || html.includes('-€1,50') || html.includes('-€1.50');
assert(up && down, 'day-over-day deltas ' + (html.match(/較前一日<\/span>[^<]+/g) || []).join(' | '));
const emptyHtml = View.renderEmpty();
assert(emptyHtml.includes('CARDMARKET_INGEST_TOKEN'), 'empty state names ingest env');
assert(emptyHtml.includes('id="cmReload"'), 'empty state can refresh after ingest');

const bareHtml = View.renderPage({
  snapshot: { date: '2026-09-23', seller: 'x', scraped_at: '2026-09-23T07:17:52Z', cards: { A: { status: 'ok', markets: { sealed: {}, raw: {} } } } },
  dates: [{ date: '2026-09-23', seller: 'x' }],
}, { q: '', status: 'all', selected: '' });
assert(!bareHtml.includes('地板走勢'), 'no floor section without floor_history');
assert(!bareHtml.includes('cm-spark'), 'no sparkline without history');
assert(bareHtml.includes('cm-thumb-ph'), 'placeholder thumb when image missing');
assert(bareHtml.includes('id="cmFile"') && bareHtml.includes('id="cmDate"'), 'upload and date picker stay');

const filtered = View.visibleCards(m.cards, { status: 'no_offers', q: '' });
assert(filtered.length === 1 && filtered[0].sealed_only, 'filter no_offers');

const beforeGrid = html.split('id="cmGrid"')[0];
assert(beforeGrid.includes('最近七日成交'), 'week strip in toolbar');
assert(beforeGrid.includes('cm-week-count') && beforeGrid.includes('>3<'), 'week count is in-window rows, not summary ' + (beforeGrid.match(/cm-week-count[\s\S]{0,80}/) || []));
assert(!beforeGrid.includes('>99<') && !beforeGrid.includes('€50'), 'week strip ignores all-time summary');
assert(!beforeGrid.includes('ArchiveShop') && !beforeGrid.includes('2026-08-01'), 'older sale stays out of the week strip');
assert(beforeGrid.includes('2026-09-17') && beforeGrid.includes('2026-09-23'), 'inclusive 7-day window');
assert(beforeGrid.includes('密封 / 裸卡') && />1 \/ 2</.test(beforeGrid), 'sealed vs raw in window');
assert(beforeGrid.includes('最多') && beforeGrid.includes('噴火龍ex'), 'top sold card');
assert(beforeGrid.includes('cm-week-spark') && beforeGrid.includes('cm-spark raw'), 'day count spark');
const euroIn = (chunk, n) => {
  const text = '€' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return chunk.includes(text) || chunk.includes(text.replace(',', '.'));
};
assert(euroIn(beforeGrid, 8) && euroIn(beforeGrid, 10) && euroIn(beforeGrid, 9), 'week min max avg');
assert(html.includes('class="drag-handle"'), 'drag handle');
assert(html.includes('>置頂<') && html.includes('>置底<') && html.includes('aria-label="上移"') && html.includes('aria-label="下移"'), 'order buttons');
assert(html.includes('data-card-key="Charizard-ex-PKMTCHSV-P-166"'), 'card key on article');
const firstCard = html.split('<article class="cm-card')[1] || '';
assert(/data-cm-move="top"[^>]*disabled/.test(firstCard) && /data-cm-move="up"[^>]*disabled/.test(firstCard), 'first card cannot move up');

const week = View.recentConfirmed(sample);
assert(week.start === '2026-09-17' && week.end === '2026-09-23' && week.count === 3, 'recentConfirmed window ' + JSON.stringify({ start: week.start, end: week.end, count: week.count }));
assert(week.min === 8 && week.max === 10 && week.avg === 9 && week.sealed === 1 && week.raw === 2, 'recentConfirmed prices');
assert(week.top.key === 'Charizard-ex-PKMTCHSV-P-166' && week.top.count === 3, 'recentConfirmed top card');
assert(week.days.length === 7 && week.days[0].date === '2026-09-17' && week.days[3].date === '2026-09-20' && week.days[3].count === 1 && week.days[6].count === 1, 'day buckets');

const monthEdge = View.recentConfirmed({ date: '2026-03-01', inferred_sales: [] });
assert(monthEdge.start === '2026-02-23' && monthEdge.end === '2026-03-01' && monthEdge.count === 0, 'window crosses month');
const quiet = View.renderPage({
  snapshot: { date: '2026-03-01', seller: 'x', cards: { A: { status: 'ok' } } },
  dates: [{ date: '2026-03-01', seller: 'x' }],
}, { q: '', status: 'all', selected: '' });
assert(quiet.includes('這段沒有已確認成交') && !quiet.includes('cm-week-count'), 'quiet empty week, no fake zero metric');

const fromScrapeWeek = View.recentConfirmed({
  scraped_at: '2026-09-23T22:30:00Z',
  inferred_sales: [
    { card_key: 'A', price: 5, date: '2026-09-24' },
    { card_key: 'B', price: 5, date: '2026-09-17' },
    { card_key: 'C', price: 99, confirmed_at: '2026-09-23T22:30:00Z' },
    { card_key: 'D', price: 1 },
  ],
});
assert(fromScrapeWeek.anchor === '2026-09-24' && fromScrapeWeek.count === 2 && fromScrapeWeek.rows.every(r => r.card_key === 'A' || r.card_key === 'C'), 'anchor from Amsterdam scraped_at, undated row dropped ' + fromScrapeWeek.anchor + ' ' + fromScrapeWeek.count);

const objectPrice = View.recentConfirmed({
  date: '2026-09-23',
  inferred_sales: [
    { card_key: 'A', date: '2026-09-23', price: { price: 4 }, isSealed: true },
    { card_key: 'B', date: '2026-09-22', price: 8 },
  ],
});
assert(objectPrice.min === 4 && objectPrice.max === 8 && objectPrice.avg === 6 && objectPrice.sealed === 1 && objectPrice.raw === 1, 'week accepts offer price objects');

const ordered = View.applyCustomOrder(m.cards, ['Bulbasaur-V2-svG050', 'missing', 'Charizard-ex-PKMTCHSV-P-166']);
assert(ordered.map(c => c.key).join() === 'Bulbasaur-V2-svG050,Charizard-ex-PKMTCHSV-P-166,Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158', 'custom order, unseen appends');
const merged = View.mergeVisibleOrder(['C', 'A', 'B'], ['A', 'B', 'C', 'D'], ['B', 'A']);
assert(merged.join() === 'C,B,A,D', 'merge keeps hidden slots ' + merged.join());
assert(View.moveCardKey(['A', 'B', 'C'], 'C', 'top').join() === 'C,A,B', 'move top');
assert(View.moveCardKey(['A', 'B', 'C'], 'A', 'bottom').join() === 'B,C,A', 'move bottom');
assert(View.moveCardKey(['A', 'B', 'C'], 'B', 'up').join() === 'B,A,C', 'move up');
assert(View.moveCardKey(['A', 'B', 'C'], 'B', 'down').join() === 'A,C,B', 'move down');
assert(View.moveCardKey(['A', 'B', 'C'], 'A', 'up').join() === 'A,B,C', 'move up at edge is a no-op');
assert(View.ORDER_KEY === 'pokeledger_cm_card_order', 'order storage key');

const reordered = View.renderPage({
  snapshot: sample,
  dates: [{ date: '2026-09-23', seller: 'Pikapika007' }],
}, {
  q: '',
  status: 'all',
  selected: '',
  order: ['Bulbasaur-V2-svG050', 'Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158', 'Charizard-ex-PKMTCHSV-P-166'],
});
const pos = ['Bulbasaur-V2-svG050', 'Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158', 'Charizard-ex-PKMTCHSV-P-166'].map(k => reordered.indexOf('data-card-key="' + k + '"'));
assert(pos[0] !== -1 && pos[0] < pos[1] && pos[1] < pos[2], 'render applies custom order ' + pos.join(','));
const searched = View.renderPage({
  snapshot: sample,
  dates: [{ date: '2026-09-23', seller: 'Pikapika007' }],
}, { q: '妙蛙', status: 'all', selected: '', order: ['Charizard-ex-PKMTCHSV-P-166'] });
const searchGrid = searched.split('id="cmGrid"')[1].split('推斷成交')[0];
assert(searchGrid.includes('妙蛙種子') && !searchGrid.includes('噴火龍ex') && !searchGrid.includes('Charizard'), 'search still filters the grid');

const objectFloors = {
  date: '2026-09-24',
  seller: 'Pikapika007',
  scraped_at: '2026-09-24T08:00:00+00:00',
  name_zh: { 'Ditto-SV-P173': '百變怪' },
  floor_history: {
    'Ditto-SV-P173': [
      { date: '2026-09-21', sealed_floor: { price: 'nope', seller: 'Junk' }, raw_floor: { seller: 'NoPrice' }, floor: { price: { nested: 9 } }, status: 'ok' },
      { date: '2026-09-22', sealed_floor: { price: 190, seller: 'A', rank: 1 }, raw_floor: { price: 150, seller: 'B', rank: 1 }, floor: { price: 150, seller: 'B', rank: 1 }, status: 'ok' },
      { date: '2026-09-23', sealed_floor: { price: 175, seller: 'A', rank: 1 }, raw_floor: { price: 145, seller: 'B', rank: 1 }, floor: 145, status: 'ok' },
      { date: '2026-09-24', sealed_floor: { price: ' 180 ', seller: 'SealShop', rank: 1 }, raw_floor: { price: 140, seller: 'RawShop', rank: 1 }, floor: { price: 140, seller: 'RawShop', rank: 1 }, status: 'ok' },
    ],
    'Junk-Card': [
      { date: '2026-09-24', sealed_floor: { price: false }, raw_floor: [], floor: { priceEUR: 12 }, status: 'ok' },
    ],
  },
  cards: {
    'Ditto-SV-P173': {
      card_key: 'Ditto-SV-P173',
      title: 'Ditto',
      status: 'ok',
      sealed_only: false,
      primary_market: 'raw',
      url: 'javascript:alert(1)',
      image_url: 'data:text/html;base64,PGh0bWw+',
      floor: { price: 140, seller: 'RawShop', rank: 1 },
      guide_from_price: { note: 'not a price' },
      my_best_rank: 4,
      my_listings: [{ seller: 'Pikapika007', price: 1, condition: 'NM', rank: 8 }],
      markets: {
        sealed: { count: 2, floor: { price: 180, seller: 'SealShop', rank: 1, isSealed: true }, my_best_rank: 3, top10: [] },
        raw: { count: 6, floor: { price: 140, seller: 'RawShop', rank: 1 }, my_best_rank: 4, lowest5: [] },
      },
      offers_top10: [],
    },
    'Junk-Card': {
      title: 'Junk floors',
      status: 'ok',
      floor: { seller: 'missing-price' },
      my_best_rank: null,
      markets: {
        sealed: { count: 1, floor: ['180'], my_best_rank: null },
        raw: { count: 1, floor: { price: false }, my_best_rank: null },
      },
      my_listings: [],
      offers_top10: [],
    },
  },
};

const om = View.model(objectFloors);
const ditto = om.cards.find(c => c.key === 'Ditto-SV-P173');
const junk = om.cards.find(c => c.key === 'Junk-Card');
assert(ditto.sealed.floor === 180, 'object sealed floor price');
assert(ditto.raw.floor === 140, 'object raw floor price');
assert(ditto.floor === 140, 'object card.floor price');
assert(ditto.guide_from_price == null, 'junk guide price ignored');
assert(ditto.sealed.rank === 3, 'sealed my_best_rank surfaces beside object floor');
assert(ditto.raw.rank === 4, 'raw my_best_rank surfaces beside object floor');
assert(ditto.my_best_rank === 4, 'card my_best_rank');
assert(ditto.url === '' && ditto.image_url === '', 'object-floor card does not loosen url or thumb rules');
assert(ditto.history.length === 4, 'object floor history kept');
assert(ditto.history[0].sealed_floor == null && ditto.history[0].raw_floor == null && ditto.history[0].floor == null, 'junk history prices ignored');
assert(ditto.history[1].sealed_floor === 190 && ditto.history[1].raw_floor === 150, 'history offer price');
assert(ditto.history[3].sealed_floor === 180 && ditto.history[3].raw_floor === 140 && ditto.history[3].floor === 140, 'latest history offer price');
assert(junk.sealed.floor == null && junk.raw.floor == null && junk.floor == null, 'array and non-numeric offers ignored');
assert(junk.history[0].sealed_floor == null && junk.history[0].raw_floor == null && junk.history[0].floor == null, 'false, array, and priceEUR-only history ignored');
assert(junk.sealed.rank == null && junk.raw.rank == null, 'missing my_best_rank stays empty');

const zero = View.model({
  date: '2026-09-24',
  cards: { Z: { status: 'ok', markets: { sealed: { floor: { price: 0 }, my_best_rank: 1 }, raw: { floor: 0 } } } },
});
assert(zero.cards[0].sealed.floor === 0 && zero.cards[0].raw.floor === 0, 'zero floor is a price');
assert(zero.cards[0].sealed.rank === 1, 'rank still read from my_best_rank');

const objectHtml = View.renderPage({
  snapshot: objectFloors,
  date: objectFloors.date,
  seller: objectFloors.seller,
  scraped_at: objectFloors.scraped_at,
  dates: [{ date: '2026-09-24', seller: 'Pikapika007' }],
}, { q: '百變怪', status: 'all', selected: '' });
assert(euroIn(objectHtml, 180) && euroIn(objectHtml, 140), 'object floors render as euros ' + (objectHtml.match(/€[^<]{0,12}/g) || []).slice(0, 8));
assert(objectHtml.includes('排名 #3') && objectHtml.includes('排名 #4'), 'lane ranks from my_best_rank');
assert(objectHtml.includes('cm-spark sealed') && objectHtml.includes('cm-spark raw'), 'object history draws sparklines');
assert(objectHtml.includes('<path d="M'), 'sparkline has a price path');
assert(!objectHtml.includes('地板走勢'), 'object history stays on the card');
assert(!objectHtml.includes('javascript:'), 'links stay on safeUrl');
assert(!objectHtml.includes('data:text/html'), 'non-image data urls stay blocked');
assert(objectHtml.includes('cm-thumb-ph'), 'unsafe thumb stays a placeholder');
assert(objectHtml.includes('這段沒有已確認成交') && !objectHtml.includes('cm-week-count'), 'no sales is a quiet week strip');
const dittoArticle = objectHtml.split('百變怪')[1] || '';
assert(!dittoArticle.includes('>排名 —<') && !dittoArticle.includes('排名 —'), 'ditto lanes are not blank ranks');

console.log('cardmarket snapshot repro ok');
