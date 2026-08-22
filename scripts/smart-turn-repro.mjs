/**
 * Confirm-step free-form corrections used when smart turn is offline.
 * Run: node scripts/smart-turn-repro.mjs
 */
import { newDraft, WAIT } from '../lib/constants.js';
import { applyConfirmCorrection } from '../lib/conversation.js';
import { canPost } from '../lib/completeness.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const settings = { companyStart: '2026-08-12', korStart: '2026-10-01' };

const d = newDraft('s1');
d.fields = {
  ...d.fields,
  kind: 'EXPENSE', scope: 'biz', date: '2026-08-14',
  currency: 'EUR', amountEur: 5733, originalAmount: 5733,
  desc: '卡盒', category: 'equipment', btwEur: 0, btwAnswered: true,
  vendor: '幫我算同一筆',
};
d.waitingFor = WAIT.CONFIRM;

applyConfirmCorrection(d, '不對 是台幣 不是歐元');
assert(d.fields.currency === 'TWD', 'twd');
assert(d.fields.amountEur == null, 'cleared eur');
applyConfirmCorrection(d, '商家清掉');
assert(d.fields.vendor === '', 'vendor cleared');
assert(!canPost(d.fields, settings), 'needs EUR before post');

console.log('smart-turn-repro: ok');
