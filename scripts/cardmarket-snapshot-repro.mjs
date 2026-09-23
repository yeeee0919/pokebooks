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
    card_key: 'Charizard-ex-PKMTCHSV-P-166',
    seller: 'Deckpoint',
    price: 10,
    condition: 'NM',
    isSealed: false,
    prev_rank: 3,
    status: 'confirmed',
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
  inferred_sales_summary: { count: 1, pending_count: 1, min: 10, max: 10, avg: 10, sealed_count: 0, confirm_hours: 48 },
  cancellations: [{ card_key: 'Ditto-SV-P173', seller: 'BKollector', price: 210, status: 'cancelled', isSealed: true }],
  cards: {
    'Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158': {
      card_key: 'Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158',
      title: 'www.cardmarket.com',
      note: 'Arceus & Dialga & Palkia GX (PKMTCH SV-P 158)',
      sealed_only: true,
      url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/Traditional-Chinese-Products/Arceus-Dialga-Palkia-GX-PKMTCHSV-P-158',
      image_url: '',
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
assert(View.renderEmpty().includes('CARDMARKET_INGEST_TOKEN'), 'empty state names ingest env');

const filtered = View.visibleCards(m.cards, { status: 'no_offers', q: '' });
assert(filtered.length === 1 && filtered[0].sealed_only, 'filter no_offers');

console.log('cardmarket snapshot repro ok');
