'use strict';
// ════════════════════════════════════════════════════════════════
//  Scope Ledger — account scope rules for PokeLedger
// ════════════════════════════════════════════════════════════════

const ScopeLedger = (() => {
  const BIZ = 'biz';
  const PRIV = 'priv';
  const LEGACY_DEFAULT = PRIV;

  /** Fields synced bidirectionally between paired biz/priv transactions */
  const PAIR_SYNC_FIELDS = [
    'productId', 'date', 'quantity', 'pricePerUnitEUR',
    'platform', 'currency', 'fee', 'feePerUnitEUR', 'note', 'type',
    'targetProductId', 'gradingService', 'gradingScore',
  ];

  function normalizeScope(tx, transactions) {
    if (!tx) return LEGACY_DEFAULT;
    if (tx.scope === BIZ || tx.scope === PRIV) return tx.scope;

    if (tx.type === 'GRADE') {
      return inferGradeScope(tx, transactions);
    }

    return LEGACY_DEFAULT;
  }

  function inferGradeScope(tx, transactions) {
    const txns = transactions || [];
    const sourceId = tx.productId;
    if (!sourceId) return LEGACY_DEFAULT;

    // Prefer scope of the most recent BUY/SELL/GRADE on the source product before this date
    const prior = txns
      .filter(t =>
        t.id !== tx.id &&
        t.date <= (tx.date || '9999-99-99') &&
        (t.productId === sourceId || (t.type === 'GRADE' && t.targetProductId === sourceId))
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    for (const t of prior) {
      const s = t.scope;
      if (s === BIZ || s === PRIV) return s;
    }
    return LEGACY_DEFAULT;
  }

  function matchesScope(tx, scope, transactions) {
    if (scope === 'all') return true;
    return normalizeScope(tx, transactions) === scope;
  }

  function filterByScope(transactions, scope) {
    if (scope === 'all') return transactions.slice();
    return transactions.filter(t => matchesScope(t, scope, transactions));
  }

  function findPairedTx(tx, transactions) {
    if (!tx?.pairId) return null;
    return transactions.find(t => t.id !== tx.id && t.pairId === tx.pairId) || null;
  }

  function getPairedPriv(tx, transactions) {
    if (!tx?.pairId || normalizeScope(tx, transactions) !== BIZ) return null;
    return transactions.find(t => t.pairId === tx.pairId && normalizeScope(t, transactions) === PRIV) || null;
  }

  /** Returns transaction IDs to delete (biz delete cascades priv; priv delete is solo) */
  function getDeleteIds(txId, transactions) {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return [];

    if (normalizeScope(tx, transactions) === BIZ && tx.pairId) {
      const paired = findPairedTx(tx, transactions);
      if (paired && normalizeScope(paired, transactions) === PRIV) {
        return [txId, paired.id];
      }
    }
    return [txId];
  }

  /** Build transaction record(s) from modal scope input */
  function createFromInput(scopeInput, baseTx, uidFn) {
    const uid = uidFn;
    const scope = scopeInput === PRIV ? PRIV : BIZ;

    if (scope === PRIV) {
      return [{ ...baseTx, id: uid(), scope: PRIV }];
    }

    // biz → paired biz + priv
    const pairId = uid();
    const sharedNote = (baseTx.note || '').replace(/ \(商業＋私人同時.*?\)/, '').trim();
    return [
      { ...baseTx, id: uid(), scope: BIZ, pairId, note: sharedNote },
      { ...baseTx, id: uid(), scope: PRIV, pairId, note: sharedNote },
    ];
  }

  /** Apply edit to tx and its pair (bidirectional sync) */
  function applyPairedEdit(transactions, txId, updates) {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return [];

    const syncUpdates = {};
    for (const key of PAIR_SYNC_FIELDS) {
      if (key in updates) syncUpdates[key] = updates[key];
    }

    Object.assign(tx, syncUpdates);

    const paired = findPairedTx(tx, transactions);
    if (paired) {
      Object.assign(paired, syncUpdates);
      return [tx.id, paired.id];
    }
    return [tx.id];
  }

  function scopeForTab(tab) {
    if (tab === 'inventory-priv') return PRIV;
    if (tab === 'inventory-biz' || tab === 'inventory') return BIZ;
    return 'all';
  }

  /** UI scope value when opening edit modal for an existing tx */
  function uiScopeForTx(tx) {
    return normalizeScope(tx) === PRIV ? PRIV : BIZ;
  }

  function normalizeScopeOnLoad(transactions) {
    transactions.forEach(t => {
      if (t.scope !== BIZ && t.scope !== PRIV) {
        t.scope = normalizeScope(t, transactions);
      }
      if (t.type === 'GRADE' && !t.scope) {
        t.scope = inferGradeScope(t, transactions);
      }
    });
  }

  return {
    BIZ,
    PRIV,
    LEGACY_DEFAULT,
    PAIR_SYNC_FIELDS,
    normalizeScope,
    matchesScope,
    filterByScope,
    findPairedTx,
    getPairedPriv,
    getDeleteIds,
    createFromInput,
    applyPairedEdit,
    scopeForTab,
    uiScopeForTx,
    normalizeScopeOnLoad,
    inferGradeScope,
  };
})();

window.ScopeLedger = ScopeLedger;
