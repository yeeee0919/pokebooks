/**
 * Red-capable repro: unsynced local edits must not be discarded on
 * version conflict (409) or on boot from the live ledger.
 * Run: node scripts/ledger-sync-repro.mjs
 */
function shouldFlushLocalOnBoot({ dirty, savedAt = 0, syncedAt = 0 }) {
  if (dirty) return true;
  if (savedAt && savedAt > syncedAt) return true;
  if (savedAt && !syncedAt) return true;
  return false;
}

function resolveConflictAction({ retried }) {
  // Keep the in-memory ledger (the user's save). Bump version and retry once.
  // Never apply the server ledger over a dirty local edit.
  if (!retried) return 'retry';
  return 'keep-ours';
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

assert(
  shouldFlushLocalOnBoot({ dirty: true, savedAt: 10, syncedAt: 20 }) === true,
  'dirty snapshot flushes on boot even if syncedAt is newer'
);
assert(
  shouldFlushLocalOnBoot({ dirty: false, savedAt: 30, syncedAt: 10 }) === true,
  'savedAt > syncedAt means PUT never finished — flush local'
);
assert(
  shouldFlushLocalOnBoot({ dirty: false, savedAt: 10, syncedAt: 0 }) === true,
  'saved but never synced — flush local'
);
assert(
  shouldFlushLocalOnBoot({ dirty: false, savedAt: 10, syncedAt: 10 }) === false,
  'clean snapshot uses server'
);
assert(
  resolveConflictAction({ retried: false }) === 'retry',
  'first 409 retries our payload with the new version'
);
assert(
  resolveConflictAction({ retried: true }) === 'keep-ours',
  'second 409 still keeps our edit (does not applyLiveDb server)'
);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app.js'),
  'utf8'
);

const putStart = app.indexOf('function queueLedgerPut');
const putEnd = app.indexOf('\nfunction uid', putStart);
const putBlock = app.slice(putStart, putEnd === -1 ? undefined : putEnd);

assert(
  /flushLedgerPut/.test(putBlock) || /retried/.test(app),
  'app.js must retry conflict instead of applying the server ledger'
);
assert(
  !/applyLiveDb\(hydrateLedger\(e\.data\.ledger\)\)/.test(putBlock),
  '409 handler must not discard in-memory edits via applyLiveDb'
);

const bootStart = app.indexOf('async function bootLedger');
const bootEnd = app.indexOf('\nasync function enterApp', bootStart);
const bootBlock = app.slice(bootStart, bootEnd === -1 ? undefined : bootEnd);

assert(
  /shouldFlushLocalOnBoot|isLocalUnsynced/.test(bootBlock),
  'bootLedger must flush unsynced local snapshot instead of always loading server'
);

if (process.exitCode) {
  console.error('\nLedger sync repro RED');
  process.exit(1);
}
console.log('\nLedger sync repro GREEN');
