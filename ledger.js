'use strict';
// ════════════════════════════════════════════════════════════════
//  Transaction Ledger — CRUD seam between UI and DB.transactions
// ════════════════════════════════════════════════════════════════

const TransactionLedger = {
  create({ getTransactions, getProducts, valuation, uid }) {
    function txns() {
      return getTransactions();
    }

    function findById(id) {
      return txns().find(t => t.id === id);
    }

    function enrichRow(t) {
      const p = getProducts().find(x => x.id === t.productId);
      const productName = p?.name || '已刪除';
      const scope = ScopeLedger.normalizeScope(t, txns());
      const isSell = t.type === 'SELL';
      const total = t.quantity * (t.pricePerUnitEUR || 0);
      const cogs = isSell ? valuation.cogsForSell(t) : null;
      const fee = isSell ? (t.fee || 0) : null;
      const grossProfit = isSell ? total - (cogs || 0) - fee : null;
      return {
        tx: t,
        id: t.id,
        productName,
        scope,
        isSell,
        total,
        cogs,
        fee,
        grossProfit,
        hasPair: !!t.pairId,
      };
    }

    /** Query + optional enrich for render adapters */
    function query(filters = {}) {
      let list = txns().slice();

      if (filters.scope && filters.scope !== 'all') {
        list = ScopeLedger.filterByScope(list, filters.scope);
      }
      if (filters.year && filters.year !== 'all') {
        const yr = String(filters.year);
        list = list.filter(t => t.date && t.date.startsWith(yr));
      }
      if (filters.type) {
        list = list.filter(t => t.type === filters.type);
      }
      if (filters.productId) {
        const pid = filters.productId;
        list = list.filter(t =>
          t.productId === pid || (t.type === 'GRADE' && t.targetProductId === pid)
        );
      }

      list.sort((a, b) => b.date.localeCompare(a.date));

      if (filters.enrich === false) return list;
      return list.map(enrichRow);
    }

    function scopeSummary(rows) {
      const txList = rows.map(r => (r.tx ? r.tx : r));
      const rev = txList.filter(t => t.type === 'SELL').reduce((s, t) => s + t.quantity * (t.pricePerUnitEUR || 0), 0);
      const buyCost = txList.filter(t => t.type === 'BUY').reduce((s, t) => s + t.quantity * (t.pricePerUnitEUR || 0), 0);
      return { count: txList.length, rev, buyCost };
    }

    function recordBuy({ scopeInput, fields, editId }) {
      const base = { ...fields, type: 'BUY' };

      if (editId) {
        const updates = { ...base };
        ScopeLedger.applyPairedEdit(txns(), editId, updates);
        const edited = findById(editId);
        valuation.onTransactionMutated(edited, Object.keys(updates));
        const paired = ScopeLedger.findPairedTx(edited, txns());
        if (paired?.type === 'BUY') valuation.recalcDownstreamSells(paired);
        return { txs: [edited, paired].filter(Boolean), ids: [edited?.id, paired?.id].filter(Boolean) };
      }

      const created = ScopeLedger.createFromInput(scopeInput, base, uid);
      txns().push(...created);
      return { txs: created, ids: created.map(t => t.id) };
    }

    function recordSell({ scopeInput, fields, editId, fee }) {
      const base = { ...fields, type: 'SELL' };

      if (editId) {
        const existing = findById(editId);
        const paired = ScopeLedger.findPairedTx(existing, txns());
        const feeEach = (paired && paired.type === 'SELL') ? fee / 2 : fee;
        const updates = { ...base, fee: feeEach };
        ScopeLedger.applyPairedEdit(txns(), editId, updates);
        const edited = findById(editId);
        valuation.recalcSellCogs(edited);
        if (paired?.type === 'SELL') valuation.recalcSellCogs(paired);
        valuation.onTransactionMutated(edited, Object.keys(updates));
        return { txs: [edited, paired].filter(Boolean), ids: [edited?.id, paired?.id].filter(Boolean) };
      }

      if (scopeInput === 'biz') {
        const pairId = uid();
        const halfFee = fee / 2;
        const created = [
          {
            ...base,
            id: uid(),
            scope: 'biz',
            pairId,
            fee: halfFee,
            cogsPerUnit: valuation.snapshotCogsForSell(base.productId, base.date, 'biz'),
          },
          {
            ...base,
            id: uid(),
            scope: 'priv',
            pairId,
            fee: halfFee,
            cogsPerUnit: valuation.snapshotCogsForSell(base.productId, base.date, 'priv'),
          },
        ];
        txns().push(...created);
        return { txs: created, ids: created.map(t => t.id) };
      }

      const tx = {
        ...base,
        id: uid(),
        scope: 'priv',
        fee,
        cogsPerUnit: valuation.snapshotCogsForSell(base.productId, base.date, 'priv'),
      };
      txns().push(tx);
      return { txs: [tx], ids: [tx.id] };
    }

    function recordGrade(fields) {
      const tx = { ...fields, id: uid(), type: 'GRADE' };
      txns().push(tx);
      return { txs: [tx], ids: [tx.id] };
    }

    function recordInitialBuy(fields) {
      const tx = { ...fields, id: uid(), type: 'BUY', scope: 'priv' };
      txns().push(tx);
      return { txs: [tx], ids: [tx.id] };
    }

    /** Resolve IDs to delete (biz cascades paired priv) */
    function resolveDeleteIds(txId) {
      return ScopeLedger.getDeleteIds(txId, txns());
    }

    function resolveBulkDeleteIds(txIds) {
      const set = new Set();
      txIds.forEach(id => resolveDeleteIds(id).forEach(did => set.add(did)));
      return [...set];
    }

    function deleteByIds(ids) {
      const idSet = new Set(ids);
      const remaining = txns().filter(t => !idSet.has(t.id));
      txns().length = 0;
      txns().push(...remaining);
      valuation.invalidate();
      return ids.length;
    }

    function bulkUpdate(selectedIds, patch) {
      const idSet = new Set(selectedIds);
      let count = 0;
      const editedBuys = [];

      txns().forEach(t => {
        if (!idSet.has(t.id)) return;
        if (patch.date != null) t.date = patch.date;
        if (patch.platform != null) t.platform = patch.platform;
        if (patch.pricePerUnitEUR != null) t.pricePerUnitEUR = patch.pricePerUnitEUR;
        if (patch.fee != null && t.type === 'SELL') t.fee = patch.fee;
        if (patch.note != null) t.note = patch.note;
        if (t.type === 'BUY') editedBuys.push(t);
        if (t.type === 'SELL') valuation.recalcSellCogs(t);
        count++;
      });

      editedBuys.forEach(t => valuation.recalcDownstreamSells(t));
      valuation.onBulkMutated();
      return count;
    }

    function checkSellStock(productId, scopeInput, qty) {
      const scope = scopeInput === 'priv' ? 'priv' : 'biz';
      const avail = valuation.getQty(productId, scope);
      return { ok: qty <= avail, avail, scope };
    }

    return {
      query,
      enrichRow,
      scopeSummary,
      findById,
      recordBuy,
      recordSell,
      recordGrade,
      recordInitialBuy,
      resolveDeleteIds,
      resolveBulkDeleteIds,
      deleteByIds,
      bulkUpdate,
      checkSellStock,
    };
  },
};

window.TransactionLedger = TransactionLedger;
