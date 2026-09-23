import { readFileSync } from 'node:fs';
import path from 'node:path';
import { requireOwner, json } from '../lib/auth.js';

function loadHistory() {
  const file = path.join(process.cwd(), 'data', 'supplier-history.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

function forSite(history) {
  return {
    ...history,
    items: (history.items || []).map((item) => ({
      ...item,
      image: typeof item.image === 'string'
        ? item.image.replace(/^\/images\//, '/prices/images/')
        : item.image,
    })),
  };
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    json(res, 405, { error: 'method' });
    return;
  }
  if (!requireOwner(req, res)) return;
  try {
    json(res, 200, forSite(loadHistory()), { 'Cache-Control': 'private, no-store' });
  } catch (e) {
    json(res, 500, { error: '進價資料不存在' });
  }
}
