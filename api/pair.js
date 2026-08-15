import { requireOwner, json, randomCode } from '../lib/auth.js';
import { ensureSchema, setPairing, getBind } from '../lib/db.js';

export default async function handler(req, res) {
  if (!requireOwner(req, res)) return;
  try {
    await ensureSchema();
    if (req.method === 'GET') {
      const bind = await getBind();
      json(res, 200, { paired: !!bind.userId, userId: bind.userId || null, pairedAt: bind.pairedAt || null });
      return;
    }
    if (req.method === 'POST') {
      const code = randomCode(6);
      const expiresAt = Date.now() + 10 * 60 * 1000;
      await setPairing(code, expiresAt);
      json(res, 200, { code, expiresAt });
      return;
    }
    json(res, 405, { error: 'method' });
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
}
