import { waitForPhotoQuiet } from '../lib/photoSettle.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let count = 0;
const sleeps = [];
const getCount = async () => count;
const sleepFn = ms => {
  sleeps.push(ms);
  return Promise.resolve();
};

// Simulates: photo1 at t0, photo2 arrives after one poll
let polls = 0;
const getCountBurst = async () => {
  polls += 1;
  if (polls <= 2) return 1;
  return 2;
};

(async () => {
  count = 1;
  const n1 = await waitForPhotoQuiet(getCount, { quietMs: 100, pollMs: 10, maxWaitMs: 500, sleepFn });
  assert(n1 === 1, 'single photo settles');

  polls = 0;
  const n2 = await waitForPhotoQuiet(getCountBurst, { quietMs: 30, pollMs: 10, maxWaitMs: 500, sleepFn });
  assert(n2 === 2, 'waits for second photo');

  console.log('photo-settle-repro: ok');
})();
