import { requireOwner, json, readJson } from '../lib/auth.js';
import { getLedger, putLedger, ensureSchema } from '../lib/db.js';

export default async function handler(req, res) {
  if (!requireOwner(req, res)) return;
  try {
    await ensureSchema();
    if (req.method === 'GET') {
      const { version, ledger } = await getLedger();
      json(res, 200, { version, ledger });
      return;
    }
    if (req.method === 'PUT') {
      const body = await readJson(req);
      const result = await putLedger(body.ledger, body.version);
      if (!result.ok) {
        json(res, 409, { error: 'conflict', version: result.version, ledger: result.ledger });
        return;
      }
      json(res, 200, { version: result.version, ledger: result.ledger });
      return;
    }
    json(res, 405, { error: 'method' });
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
}
