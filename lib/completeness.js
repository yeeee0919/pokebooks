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

function positiveMoney(n) {
  const x = Number(n);
  return n != null && !Number.isNaN(x) && x > 0;
}

function hasBookableAmount(fields) {
  if (positiveMoney(fields.amountEur)) return true;
  if ((fields.kind === 'BUY' || fields.kind === 'SELL') && positiveMoney(fields.pricePerUnitEUR)) return true;
  if (positiveMoney(fields.originalAmount) && (fields.currency || 'EUR') === 'EUR') return true;
  return false;
}

export function missingFields(fields, settings) {
  const missing = [];
  if (!fields.kind) missing.push('kind');
  if (!fields.scope) missing.push('scope');
  if (!fields.date) missing.push('date');
  if (!hasBookableAmount(fields)) missing.push('amountEur');

  if (fields.kind === 'EXPENSE') {
    if (!fields.desc) missing.push('desc');
    if (!fields.category || !EXPENSE_CATEGORIES[fields.category]) missing.push('category');
    if (needsBtw(fields, settings) && !fields.btwAnswered) missing.push('btw');
  }

  if (fields.kind === 'BUY' || fields.kind === 'SELL') {
    if (!fields.productId) missing.push('productId');
    if (!fields.quantity || fields.quantity < 1) missing.push('quantity');
    if (!positiveMoney(fields.pricePerUnitEUR) && !positiveMoney(fields.amountEur)) {
      missing.push('pricePerUnitEUR');
    }
  }

  return missing;
}

export function canPost(fields, settings) {
  return missingFields(fields, settings).length === 0;
}

export function unitPriceEur(fields) {
  if (positiveMoney(fields.pricePerUnitEUR)) return roundEur(fields.pricePerUnitEUR);
  const qty = Number(fields.quantity) || 0;
  const amt = Number(fields.amountEur);
  if (qty > 0 && positiveMoney(amt)) return roundEur(amt / qty);
  return null;
}

export function roundEur(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
