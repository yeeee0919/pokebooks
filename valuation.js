'use strict';
// ════════════════════════════════════════════════════════════════
//  Valuation Engine — WACC, COGS, inventory qty
// ════════════════════════════════════════════════════════════════

const ValuationEngine = {
  create(getTransactions) {
    let _waccCache = new Map();

    function invalidate() {
      _waccCache = new Map();
    }

    function txScope(t) {
      return ScopeLedger.normalizeScope(t, getTransactions());
    }

    function scopeMatches(t, scope) {
      return ScopeLedger.matchesScope(t, scope, getTransactions());
    }

    /** Quantity in stock for a product, filtered by scope ('biz'|'priv'|'all') */
    function getQty(productId, scope = 'all') {
      let qty = 0;
      for (const t of getTransactions()) {
        if (!scopeMatches(t, scope)) continue;

        if (t.productId === productId) {
          if (t.type === 'BUY') qty += t.quantity;
          if (t.type === 'SELL') qty -= t.quantity;
          if (t.type === 'GRADE') qty -= t.quantity;
        }
        if (t.type === 'GRADE' && t.targetProductId === productId) {
          qty += t.quantity;
        }
      }
      return Math.max(0, qty);
    }

    function getWACC(productId, asOfDate, scope = 'all') {
      const cacheKey = `${productId}|${asOfDate}|${scope}`;
      if (_waccCache.has(cacheKey)) return _waccCache.get(cacheKey);

      let totalCost = 0;
      let totalQty = 0;
      const txns = getTransactions()
        .filter(t => t.date <= asOfDate && scopeMatches(t, scope))
        .sort((a, b) => a.date.localeCompare(b.date));

      for (const t of txns) {
        if (t.productId === productId && t.type === 'BUY') {
          totalCost += t.quantity * (t.pricePerUnitEUR || 0);
          totalQty += t.quantity;
        }
        if (t.type === 'GRADE' && t.targetProductId === productId) {
          const srcWacc = getWACC(t.productId, t.date, scope);
          const gradeFee = t.feePerUnitEUR || 0;
          totalCost += t.quantity * (srcWacc + gradeFee);
          totalQty += t.quantity;
        }
      }

      const result = totalQty > 0 ? totalCost / totalQty : 0;
      _waccCache.set(cacheKey, result);
      return result;
    }

    function getInventoryCost(productId, scope = 'all') {
      return getWACC(productId, '9999-99-99', scope) * getQty(productId, scope);
    }

    function computeCogs(productId, date, qty, scope = 'all') {
      return getWACC(productId, date, scope) * qty;
    }

    /** COGS for a SELL tx — frozen cogsPerUnit when present, else recompute */
    function cogsForSell(tx) {
      if (!tx || tx.type !== 'SELL') return 0;
      if (tx.cogsPerUnit != null) return tx.cogsPerUnit * tx.quantity;
      const scope = txScope(tx);
      return computeCogs(tx.productId, tx.date, tx.quantity, scope);
    }

    function snapshotCogsForSell(productId, date, scope) {
      return getWACC(productId, date, scope);
    }

    /** Recalculate cogsPerUnit on a single SELL */
    function recalcSellCogs(tx) {
      if (!tx || tx.type !== 'SELL') return;
      const scope = txScope(tx);
      tx.cogsPerUnit = getWACC(tx.productId, tx.date, scope);
    }

    /** After BUY edit: recalc all downstream SELL for same product+scope */
    function recalcDownstreamSells(buyTx) {
      if (!buyTx || buyTx.type !== 'BUY') return;
      invalidate();
      const scope = txScope(buyTx);
      const productId = buyTx.productId;

      for (const t of getTransactions()) {
        if (t.type === 'SELL' && t.productId === productId && txScope(t) === scope) {
          recalcSellCogs(t);
          // Also update paired SELL if exists
          const paired = ScopeLedger.findPairedTx(t, getTransactions());
          if (paired && paired.type === 'SELL') recalcSellCogs(paired);
        }
      }
    }

    /** Call after any transaction mutation */
    function onTransactionMutated(editedTx, changedFields = []) {
      invalidate();

      if (!editedTx) return;

      const buyFields = ['date', 'pricePerUnitEUR', 'quantity', 'productId', 'scope'];
      const sellFields = ['date', 'productId', 'quantity', 'scope'];

      if (editedTx.type === 'BUY' && changedFields.some(f => buyFields.includes(f))) {
        recalcDownstreamSells(editedTx);
      }

      if (editedTx.type === 'SELL' && changedFields.some(f => sellFields.includes(f))) {
        recalcSellCogs(editedTx);
        const paired = ScopeLedger.findPairedTx(editedTx, getTransactions());
        if (paired && paired.type === 'SELL') recalcSellCogs(paired);
      }
    }

    function onBulkMutated() {
      invalidate();
      for (const t of getTransactions()) {
        if (t.type === 'SELL') recalcSellCogs(t);
      }
    }

    return {
      getQty,
      getWACC,
      getInventoryCost,
      computeCogs,
      cogsForSell,
      snapshotCogsForSell,
      recalcSellCogs,
      recalcDownstreamSells,
      onTransactionMutated,
      onBulkMutated,
      invalidate,
    };
  },
};

window.ValuationEngine = ValuationEngine;
