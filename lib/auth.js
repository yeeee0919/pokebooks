import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const COOKIE = 'pokeledger_session';
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return s;
}

export function hashPassword(password, salt) {
  const s = salt || randomBytes(16).toString('hex');
  const hash = scryptSync(password, s, 32).toString('hex');
  return `${s}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !password) return false;
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) {
    const env = process.env.OWNER_PASSWORD || '';
    if (!env) return false;
    const a = Buffer.from(password);
    const b = Buffer.from(env);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, 'hex');
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function ownerPasswordOk(password) {
  const env = process.env.OWNER_PASSWORD || '';
  if (!env || !password) return false;
  const a = Buffer.from(String(password));
  const b = Buffer.from(env);
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function unsign(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expect = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookie(owner = true) {
  const token = sign({ owner, exp: Date.now() + MAX_AGE * 1000 });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function readSession(req) {
  const raw = req.headers.cookie || '';
  const m = raw.split(/;\s*/).find(p => p.startsWith(COOKIE + '='));
  if (!m) return null;
  return unsign(m.slice(COOKIE.length + 1));
}

export function requireOwner(req, res) {
  const s = readSession(req);
  if (!s?.owner) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return s;
}

export function json(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function readJson(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export function randomCode(len = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}
