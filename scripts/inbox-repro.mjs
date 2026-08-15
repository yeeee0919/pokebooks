/**
 * Inbox conversation + post gates. Run: node scripts/inbox-repro.mjs
 */
import { newDraft, WAIT } from '../lib/constants.js';
import { applyAnswer, nextQuestion, confirmSummary, prepareFx } from '../lib/conversation.js';
import { canPost, missingFields, needsBtw } from '../lib/completeness.js';
import { postDraftToLedger } from '../lib/post.js';
import { fetchEcbRate } from '../lib/fx.js';
import { isAllowedUser } from '../lib/telegram.js';

const settings = { companyStart: '2026-08-12', korStart: '2026-10-01' };
const products = [
  { id: 'p1', name: '傑尼龜' },
  { id: 'p2', name: '百變皮卡丘' },
];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function run() {
  const fxLookup = async (cur) => {
    if (cur === 'USD') return { rate: 0.92, date: '2026-08-15', source: 'ECB' };
    return null;
  };

  // Date defaults to today — no DATE question
  let d = newDraft('d0');
  d.fields.kind = 'EXPENSE';
  d.fields.scope = 'biz';
  let q = nextQuestion(d, settings);
  assert(d.fields.date === new Date().toISOString().slice(0, 10), 'date defaults today');
  assert(q.waitingFor === WAIT.AMOUNT, 'skips date when defaulted');

  // Receipt date different from today → ask once
  d = newDraft('d0b');
  d.fields.kind = 'EXPENSE';
  d.fields.scope = 'biz';
  d.guesses = { date: '2026-08-01' };
  q = nextQuestion(d, settings);
  assert(!d.fields.date, 'keeps date open when receipt differs');
  assert(q.waitingFor === WAIT.DATE, 'asks receipt date');

  // Expense happy path with confirm (date auto today; force pre-KOR date for BTW gate)
  d = newDraft('d1');
  let r = await applyAnswer(d, '3', { settings, products, fxLookup });
  assert(d.fields.kind === 'EXPENSE', 'kind expense');
  r = await applyAnswer(d, '1', { settings, products, fxLookup });
  assert(d.fields.scope === 'biz', 'scope biz');
  assert(d.fields.date, 'date auto-filled');
  d.fields.date = '2026-08-14'; // force pre-KOR for BTW test
  r = await applyAnswer(d, '€93.85', { settings, products, fxLookup });
  assert(d.fields.amountEur === 93.85, 'amount');
  r = await applyAnswer(d, '監視器', { settings, products, fxLookup });
  r = await applyAnswer(d, '7', { settings, products, fxLookup });
  assert(d.fields.category === 'equipment', 'category');
  assert(needsBtw(d.fields, settings), 'pre-KOR btw required');
  assert(!canPost(d.fields, settings), 'cannot post without btw');
  r = await applyAnswer(d, '16.29', { settings, products, fxLookup });
  assert(d.fields.btwAnswered, 'btw answered');
  assert(canPost(d.fields, settings), 'expense can post');
  assert(d.waitingFor === WAIT.CONFIRM, 'confirm step');
  r = await applyAnswer(d, '對', { settings, products, fxLookup });
  assert(r.posted, 'user confirm posts');

  const ledger = {
    products, transactions: [], expenses: [], documents: [], settings,
  };
  const posted = postDraftToLedger(ledger, d);
  assert(posted.ok, 'post ok');
  assert(posted.ledger.expenses.length === 1, 'one expense');
  assert(posted.ledger.expenses[0].amountEur === 77.56, 'net excl btw');
  assert(posted.ledger.expenses[0].isPrivate === false, 'biz expense');

  // Guess is not auto-fill: photo guess kind still asks
  d = newDraft('d2');
  d.guesses = { kind: 'EXPENSE', amountEur: 12, currency: 'EUR', btwEur: 2.1 };
  q = nextQuestion(d, settings);
  assert(q.waitingFor === WAIT.KIND, 'still asks kind');
  assert(q.text.includes('對嗎'), 'labeled guess');
  r = await applyAnswer(d, '對', { settings, products, fxLookup });
  assert(d.fields.kind === 'EXPENSE', 'accepted guess');

  // Amount+BTW listed together; 「對」 takes both
  d = newDraft('d2b');
  d.fields.kind = 'EXPENSE';
  d.fields.scope = 'biz';
  d.fields.date = '2026-08-14';
  d.guesses = { amountEur: 93.85, currency: 'EUR', btwEur: 16.29 };
  d.waitingFor = WAIT.AMOUNT;
  q = nextQuestion(d, settings);
  assert(q.text.includes('93.85') && q.text.includes('16.29'), 'lists amount and btw');
  r = await applyAnswer(d, '對', { settings, products, fxLookup });
  assert(d.fields.amountEur === 93.85, 'amount from guess');
  assert(d.fields.btwEur === 16.29 && d.fields.btwAnswered, 'btw from guess');

  // USD: ECB shown on amount; 「對」 converts
  d = newDraft('d2c');
  d.fields.kind = 'EXPENSE';
  d.fields.scope = 'priv';
  d.fields.date = '2026-08-15';
  d.guesses = { originalAmount: 100, currency: 'USD' };
  d.fields.currency = 'USD';
  d.waitingFor = WAIT.AMOUNT;
  await prepareFx(d, fxLookup);
  q = nextQuestion(d, settings);
  assert(q.text.includes('ECB') && q.text.includes('92'), 'shows ECB convert');
  r = await applyAnswer(d, '對', { settings, products, fxLookup });
  assert(d.fields.amountEur === 92, 'converted on confirm');

  // TWD: ECB missing → no invented rate
  d = newDraft('d3');
  d.fields.kind = 'EXPENSE';
  d.fields.scope = 'biz';
  d.fields.date = '2026-08-14';
  d.waitingFor = WAIT.AMOUNT;
  r = await applyAnswer(d, 'TWD 500', { settings, products, fxLookup });
  assert(d.fields.amountEur == null, 'no silent EUR');
  assert(d.waitingFor === WAIT.FX, 'fx question');
  assert(r.replies.some(t => t.includes('沒有') || t.includes('歐元')), 'asks for EUR');

  const fakeEcb = async () => ({
    ok: true,
    text: async () => `time='2026-08-14'><Cube currency='USD' rate='1.1'/>`,
  });
  const usd = await fetchEcbRate('USD', fakeEcb);
  assert(usd && usd.rate > 0, 'usd from ecb');
  const twd = await fetchEcbRate('TWD', fakeEcb);
  assert(twd === null, 'twd not invented');

  // BUY without product stays incomplete
  d = newDraft('d4');
  d.fields = {
    ...d.fields,
    kind: 'BUY', scope: 'biz', date: '2026-08-15',
    amountEur: 70, quantity: 1,
  };
  assert(missingFields(d.fields, settings).includes('productId'), 'product required');
  d.waitingFor = WAIT.PRODUCT;
  r = await applyAnswer(d, '傑尼', { settings, products, fxLookup });
  assert(d.productCandidates[0].id === 'p1', 'search hit');
  r = await applyAnswer(d, '1', { settings, products, fxLookup });
  assert(d.fields.productId === 'p1', 'picked product');

  const buyLedger = {
    products, transactions: [], expenses: [], documents: [], settings,
  };
  d.fields.pricePerUnitEUR = 70;
  const buy = postDraftToLedger(buyLedger, d);
  assert(buy.ok, 'buy posts');
  assert(buy.ledger.transactions.filter(t => t.type === 'BUY').length === 2, 'biz buy is paired');

  // SELL stock fail stays not posted
  d = newDraft('d5');
  d.fields = {
    ...d.fields,
    kind: 'SELL', scope: 'biz', date: '2026-08-16',
    productId: 'p1', productName: '傑尼龜', quantity: 99, pricePerUnitEUR: 50,
  };
  const sell = postDraftToLedger(buy.ledger, d);
  assert(!sell.ok && sell.reason === 'stock', 'stock gate');

  // Auth
  assert(!isAllowedUser({ userId: '1' }, '2'), 'other user blocked');
  assert(isAllowedUser({ userId: '1' }, '1'), 'owner allowed');
  assert(!isAllowedUser({ userId: null }, '1'), 'unpaired blocked');

  // Confirm summary mentions no telegram edit
  const summary = confirmSummary(d.fields, settings);
  assert(summary.includes('Telegram 不能改'), 'no edit after post');

  console.log('inbox-repro: ok');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
