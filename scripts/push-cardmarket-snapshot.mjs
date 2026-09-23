/**
 * Push Mac cardmarket-monitor data/latest.json to PokeLedger.
 *
 *   CARDMARKET_INGEST_TOKEN=... node scripts/push-cardmarket-snapshot.mjs latest.json
 *   CARDMARKET_INGEST_TOKEN=... node scripts/push-cardmarket-snapshot.mjs latest.json https://pokebooks-mu.vercel.app
 */
import fs from 'fs';

const file = process.argv[2];
const base = (process.argv[3] || process.env.POKELEDGER_URL || 'https://pokebooks-mu.vercel.app').replace(/\/$/, '');
const token = process.env.CARDMARKET_INGEST_TOKEN || '';

if (!file || !token) {
  console.error('Usage: CARDMARKET_INGEST_TOKEN=... node scripts/push-cardmarket-snapshot.mjs <latest.json> [baseUrl]');
  process.exit(1);
}

let raw = fs.readFileSync(file, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

const res = await fetch(base + '/api/cardmarket', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: raw,
});
const text = await res.text();
console.log(res.status, text.slice(0, 500));
if (!res.ok) process.exit(1);
