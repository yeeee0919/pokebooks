import { requireOwner, readSession, json, readJson } from '../lib/auth.js';
import { ensureSchema, getCardmarketSnapshot, listCardmarketDates, upsertCardmarketSnapshot } from '../lib/db.js';
import { ingestAuthorized, unwrapSnapshotBody } from '../lib/cardmarket.js';

function queryDate(req) {
  if (req.query && req.query.date != null) return String(req.query.date).trim();
  try {
    const u = new URL(req.url || '/', 'http://localhost');
    return (u.searchParams.get('date') || '').trim();
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!requireOwner(req, res)) return;
      await ensureSchema();
      const rawDate = queryDate(req);
      if (rawDate && !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        json(res, 400, { error: 'date 必須是 YYYY-MM-DD' });
        return;
      }
      const dates = await listCardmarketDates(90);
      const row = await getCardmarketSnapshot(rawDate || null);
      json(res, 200, {
        date: row?.date || null,
        seller: row?.seller || null,
        scraped_at: row?.scraped_at || null,
        updated_at: row?.updated_at || null,
        snapshot: row?.snapshot || null,
        dates,
      });
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const owner = !!readSession(req)?.owner;
      if (!owner && !ingestAuthorized(req)) {
        json(res, 401, { error: 'unauthorized' });
        return;
      }
      const body = await readJson(req);
      const parsed = unwrapSnapshotBody(body);
      if (parsed.error) {
        json(res, 400, { error: parsed.error });
        return;
      }
      await ensureSchema();
      const saved = await upsertCardmarketSnapshot(parsed);
      json(res, 200, {
        ok: true,
        date: saved?.date || parsed.date,
        seller: saved?.seller || parsed.seller,
        scraped_at: saved?.scraped_at || parsed.scrapedAt,
      });
      return;
    }

    json(res, 405, { error: 'method' });
  } catch (e) {
    const status = e instanceof SyntaxError ? 400 : 500;
    json(res, status, { error: String(e.message || e) });
  }
}
