'use strict';
// ════════════════════════════════════════════════════════════════
//  BTW — Dutch VAT helpers (margeregeling on commercial SELL)
// ════════════════════════════════════════════════════════════════

const BtwEngine = (() => {
  const RATE = 0.21;

  function roundEur(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  /** Individuele margeregeling: BTW on max(0, VAT-inclusive selling price − purchase price) × 21/121. */
  function suggestedMarginBtw(revenueIncl, purchasePrice) {
    const margin = roundEur((Number(revenueIncl) || 0) - (Number(purchasePrice) || 0));
    if (!(margin > 0)) return 0;
    return roundEur(margin * RATE / (1 + RATE));
  }

  function sellRevenueIncl(tx) {
    if (!tx) return 0;
    return roundEur((Number(tx.quantity) || 0) * (Number(tx.pricePerUnitEUR) || 0));
  }

  /** Recorded output VAT on a SELL. Legacy rows without a charged flag count as 0. */
  function sellOutputBtw(tx) {
    if (!tx || tx.type !== 'SELL') return 0;
    if (tx.btwCharged === false) return 0;
    return roundEur(tx.btwEur || 0);
  }

  function sellOmzetExclBtw(tx) {
    return roundEur(sellRevenueIncl(tx) - sellOutputBtw(tx));
  }

  /** Split an overridden total across lines, proportional to suggested amounts. */
  function allocateBtw(suggestedAmounts, charged, overriddenTotal) {
    const suggested = (suggestedAmounts || []).map(n => roundEur(n));
    if (!charged) return suggested.map(() => 0);
    if (overriddenTotal == null) return suggested;
    const target = roundEur(overriddenTotal);
    if (suggested.length === 0) return [];
    const sum = roundEur(suggested.reduce((s, n) => s + n, 0));
    if (sum <= 0) {
      return suggested.map((_, i) => (i === 0 ? target : 0));
    }
    const out = suggested.map(n => roundEur(target * n / sum));
    const drift = roundEur(target - out.reduce((s, n) => s + n, 0));
    out[out.length - 1] = roundEur(out[out.length - 1] + drift);
    return out;
  }

  return {
    RATE,
    roundEur,
    suggestedMarginBtw,
    sellRevenueIncl,
    sellOutputBtw,
    sellOmzetExclBtw,
    allocateBtw,
  };
})();

if (typeof window !== 'undefined') window.BtwEngine = BtwEngine;
