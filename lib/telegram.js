const API = 'https://api.telegram.org/bot';

export function botToken() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return t;
}

export async function tg(method, body) {
  const res = await fetch(`${API}${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) console.warn('[telegram]', method, data);
  return data;
}

export async function sendMessage(chatId, text) {
  const chunks = splitMessage(text);
  for (const chunk of chunks) {
    await tg('sendMessage', { chat_id: chatId, text: chunk });
  }
}

function splitMessage(text, max = 3900) {
  const s = String(text || '');
  if (s.length <= max) return [s];
  const parts = [];
  let rest = s;
  while (rest.length) {
    parts.push(rest.slice(0, max));
    rest = rest.slice(max);
  }
  return parts;
}

export async function downloadTelegramFile(fileId) {
  const info = await tg('getFile', { file_id: fileId });
  const filePath = info.result?.file_path;
  if (!filePath) return null;
  const res = await fetch(`https://api.telegram.org/file/bot${botToken()}/${filePath}`);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = filePath.endsWith('.png') ? 'image/png'
    : filePath.endsWith('.webp') ? 'image/webp'
    : 'image/jpeg';
  return { bytes: buf, mime, name: filePath.split('/').pop() };
}

export function largestPhoto(photos) {
  if (!photos?.length) return null;
  return [...photos].sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0];
}

export function isAllowedUser(bind, fromId) {
  if (!bind?.userId) return false;
  return String(bind.userId) === String(fromId);
}
