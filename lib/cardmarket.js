import { timingSafeEqual } from 'crypto';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function snapshotDateFrom(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const d = String(payload.date || '').trim();
  if (DATE_RE.test(d)) return d;
  const scraped = String(payload.scraped_at || '');
  const m = scraped.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** Accept latest.json itself, or `{ snapshot: latest.json }`. */
export function unwrapSnapshotBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'snapshot 必須是 JSON 物件' };
  }
  const wrapped = body.snapshot && typeof body.snapshot === 'object' && !Array.isArray(body.snapshot);
  const payload = wrapped ? body.snapshot : body;
  const date = snapshotDateFrom(payload) || (wrapped ? snapshotDateFrom(body) : null);
  if (!date) return { error: '需要 date（YYYY-MM-DD）或 scraped_at' };
  const sellerRaw = payload.seller != null ? payload.seller : (wrapped ? body.seller : null);
  const scrapedRaw = payload.scraped_at || (wrapped ? body.scraped_at : null) || null;
  return {
    date,
    seller: sellerRaw != null && sellerRaw !== '' ? String(sellerRaw) : null,
    scrapedAt: scrapedRaw ? String(scrapedRaw) : null,
    payload,
  };
}

function headerValue(v) {
  if (Array.isArray(v)) return String(v[0] || '');
  return v == null ? '' : String(v);
}

export function bearerOrHeaderToken(req) {
  const headers = req?.headers || {};
  const auth = headerValue(headers.authorization || headers.Authorization);
  const m = auth.match(/^Bearer\s+(\S+)\s*$/i);
  const header = headerValue(headers['x-cardmarket-ingest-token']).trim();
  return { bearer: m ? m[1] : '', header };
}

function safeEqual(got, expected) {
  if (!got || !expected) return false;
  const a = Buffer.from(String(got));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Mac scraper auth. Browser writes use the owner session instead. */
export function ingestAuthorized(req) {
  const expected = process.env.CARDMARKET_INGEST_TOKEN || '';
  if (!expected) return false;
  const { bearer, header } = bearerOrHeaderToken(req);
  return safeEqual(bearer, expected) || safeEqual(header, expected);
}
