/**
 * European Central Bank daily reference rates against EUR.
 * Currencies not on the ECB list (e.g. TWD) return null — never invent a rate.
 */
const ECB_DAILY = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

export async function fetchEcbRate(currency, fetchFn = fetch) {
  const code = String(currency || '').trim().toUpperCase();
  if (!code || code === 'EUR') return { rate: 1, date: new Date().toISOString().slice(0, 10), source: 'ECB' };
  const res = await fetchFn(ECB_DAILY);
  if (!res.ok) throw new Error('ECB rate fetch failed');
  const xml = await res.text();
  const dateMatch = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);
  const re = new RegExp(`currency=['"]${code}['"]\\s+rate=['"]([0-9.]+)['"]`);
  const m = xml.match(re);
  if (!m) return null;
  const perEur = Number(m[1]);
  if (!perEur) return null;
  // ECB quotes units of foreign currency per 1 EUR. We need EUR per 1 foreign unit.
  return { rate: 1 / perEur, date, source: 'ECB', perEur };
}
