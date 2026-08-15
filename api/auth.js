import { ownerPasswordOk, sessionCookie, clearSessionCookie, readSession, json, readJson } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const s = readSession(req);
    json(res, 200, { ok: !!s?.owner });
    return;
  }
  if (req.method === 'DELETE') {
    json(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
    return;
  }
  if (req.method !== 'POST') {
    json(res, 405, { error: 'method' });
    return;
  }
  try {
    const body = await readJson(req);
    if (!ownerPasswordOk(body.password || '')) {
      json(res, 401, { error: '密碼錯誤' });
      return;
    }
    json(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(true) });
  } catch (e) {
    json(res, 400, { error: String(e.message || e) });
  }
}
