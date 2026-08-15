import { EXPENSE_CATEGORIES } from './constants.js';

export function isPreKorDate(dateStr, settings) {
  const d = String(dateStr || '');
  const kor = String(settings?.korStart || '2026-10-01');
  return !!(d && kor && d < kor);
}

export function needsBtw(fields, settings) {
  return fields.kind === 'EXPENSE'
    && fields.scope === 'biz'
    && isPreKorDate(fields.date, settings);
}

export function missingFields(fields, settings) {
  const missing = [];
  if (!fields.kind) missing.push('kind');
  if (!fields.scope) missing.push('scope');
  if (!fields.date) missing.push('date');
  if (fields.amountEur == null && fields.pricePerUnitEUR == null) missing.push('amountEur');

  if (fields.kind === 'EXPENSE') {
    if (!fields.desc) missing.push('desc');
    if (!fields.category || !EXPENSE_CATEGORIES[fields.category]) missing.push('category');
    if (needsBtw(fields, settings) && !fields.btwAnswered) missing.push('btw');
  }

  if (fields.kind === 'BUY' || fields.kind === 'SELL') {
    if (!fields.productId) missing.push('productId');
    if (!fields.quantity || fields.quantity < 1) missing.push('quantity');
    if (fields.pricePerUnitEUR == null && fields.amountEur == null) missing.push('pricePerUnitEUR');
  }

  return missing;
}

export function canPost(fields, settings) {
  return missingFields(fields, settings).length === 0;
}

export function unitPriceEur(fields) {
  if (fields.pricePerUnitEUR != null) return Number(fields.pricePerUnitEUR);
  const qty = Number(fields.quantity) || 0;
  const amt = Number(fields.amountEur);
  if (qty > 0 && amt != null && !Number.isNaN(amt)) return roundEur(amt / qty);
  return null;
}

export function roundEur(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
