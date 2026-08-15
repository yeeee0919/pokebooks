import { requireOwner } from '../../lib/auth.js';
import { getPhoto, ensureSchema } from '../../lib/db.js';

export default async function handler(req, res) {
  if (!requireOwner(req, res)) return;
  try {
    await ensureSchema();
    const id = req.query?.id;
    if (!id) {
      res.statusCode = 400;
      res.end('missing id');
      return;
    }
    const row = await getPhoto(id);
    if (!row) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', row.mime || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.end(Buffer.from(row.bytes));
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e.message || e));
  }
}
