/**
 * Local development server for PokeLedger.
 *
 * Production runs on Vercel: static assets from the repo root plus serverless
 * functions under `api/`. This script reproduces that routing locally so the
 * app can be exercised end to end without the Vercel CLI. It serves static
 * files and dispatches `/api/*` requests to the matching handler's default
 * export, shimming the small Vercel-specific request/response surface the
 * handlers rely on (`req.query`, `req.body`, `res.status().json()`).
 *
 * Run: node scripts/dev-server.mjs   (honours PORT, defaults to 3000)
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.map': 'application/json; charset=utf-8',
};

const STATIC_FILES = new Set([
  '/index.html', '/app.js', '/style.css', '/client-api.js',
  '/ledger.js', '/scope.js', '/valuation.js', '/btw.js', '/favicon.svg',
]);

const API_ROUTES = {
  '/api/auth': 'api/auth.js',
  '/api/ledger': 'api/ledger.js',
  '/api/drafts': 'api/drafts.js',
  '/api/pair': 'api/pair.js',
  '/api/telegram': 'api/telegram.js',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Add the Vercel helpers (`res.status`, `res.json`) the handlers expect. */
function enhanceRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

async function dispatchApi(req, res, modulePath, query) {
  const raw = await readBody(req);
  const ct = req.headers['content-type'] || '';
  if (raw.length) {
    if (ct.includes('application/json')) {
      try { req.body = JSON.parse(raw.toString('utf8')); }
      catch { req.body = raw.toString('utf8'); }
    } else {
      req.body = raw.toString('utf8');
    }
  }
  req.query = query;
  enhanceRes(res);
  const mod = await import(pathToFileURL(join(ROOT, modulePath)).href);
  await mod.default(req, res);
}

async function serveStatic(res, pathname) {
  const rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = join(ROOT, rel);
  try {
    const buf = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
    res.end(buf);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const query = Object.fromEntries(url.searchParams.entries());
  try {
    if (API_ROUTES[pathname]) {
      await dispatchApi(req, res, API_ROUTES[pathname], query);
      return;
    }
    const photoMatch = pathname.match(/^\/api\/photos\/([^/]+)$/);
    if (photoMatch) {
      query.id = decodeURIComponent(photoMatch[1]);
      await dispatchApi(req, res, 'api/photos/[id].js', query);
      return;
    }
    if (pathname === '/' || STATIC_FILES.has(pathname)) {
      await serveStatic(res, pathname);
      return;
    }
    // Unknown path: fall back to index.html so the SPA can route it.
    await serveStatic(res, '/index.html');
  } catch (e) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: String(e && e.message || e) }));
    }
    console.error('[dev-server]', pathname, e);
  }
});

server.listen(PORT, () => {
  console.log(`PokeLedger dev server on http://localhost:${PORT}`);
});
