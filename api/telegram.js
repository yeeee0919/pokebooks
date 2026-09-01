import { handleUpdate } from '../lib/bot.js';
import { waitUntil } from '@vercel/functions';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('method not allowed');
    return;
  }
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers['x-telegram-bot-api-secret-token'];
    if (got !== secret) {
      res.statusCode = 401;
      res.end('unauthorized');
      return;
    }
  }
  let update;
  try {
    update = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    console.error('[telegram webhook] bad body', e);
    res.statusCode = 400;
    res.end('bad request');
    return;
  }
  // Ack Telegram immediately so it does not retry while OCR / LLM runs.
  res.statusCode = 200;
  res.end('ok');
  waitUntil(
    handleUpdate(update).catch(e => console.error('[telegram webhook]', e)),
  );
}
