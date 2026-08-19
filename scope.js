'use strict';
// ════════════════════════════════════════════════════════════════
//  Scope Ledger — account scope rules for PokeLedger
// ════════════════════════════════════════════════════════════════

const ScopeLedger = (() => {
  const BIZ = 'biz';
  const PRIV = 'priv';
  const LEGACY_DEFAULT = PRIV;

  /** Fields copied from the commercial row onto the paired private row on edit.
   *  Private-side edits never write back to commercial (same asymmetry as delete).
   *  Unit price/cost is never synced automatically. */
  const PAIR_SYNC_FIELDS = [
    'productId', 'date', 'quantity',
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

  /** Build transaction record(s) from modal scope input.
   *  opts.privPricePerUnitEUR — optional private-side unit cost when creating a biz pair.
   *  If omitted, private copies the commercial unit cost (legacy-compatible). */
  function createFromInput(scopeInput, baseTx, uidFn, opts = {}) {
    const uid = uidFn;
    const scope = scopeInput === PRIV ? PRIV : BIZ;

    if (scope === PRIV) {
      return [{ ...baseTx, id: uid(), scope: PRIV }];
    }

    // biz → paired biz + priv (shared fields, independent unit costs)
    const pairId = uid();
    const sharedNote = (baseTx.note || '').replace(/ \(商業＋私人同時.*?\)/, '').trim();
    const bizPrice = Number(baseTx.pricePerUnitEUR);
    const hasPrivPrice = opts.privPricePerUnitEUR != null && opts.privPricePerUnitEUR !== '';
    const privPrice = hasPrivPrice ? Number(opts.privPricePerUnitEUR) : bizPrice;
    return [
      { ...baseTx, id: uid(), scope: BIZ, pairId, note: sharedNote, pricePerUnitEUR: bizPrice },
      { ...baseTx, id: uid(), scope: PRIV, pairId, note: sharedNote, pricePerUnitEUR: privPrice },
    ];
  }

  /** Apply edit to tx.
   *  Commercial edit: pair receives PAIR_SYNC_FIELDS (not unit cost unless
   *  opts.pairedPricePerUnitEUR is set).
   *  Private edit: commercial books are never mutated. */
  function applyPairedEdit(transactions, txId, updates, opts = {}) {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return [];

    const syncUpdates = {};
    for (const key of PAIR_SYNC_FIELDS) {
      if (key in updates) syncUpdates[key] = updates[key];
    }

    // Unit cost applies to the edited row only unless explicitly provided for the pair
    if ('pricePerUnitEUR' in updates) {
      tx.pricePerUnitEUR = updates.pricePerUnitEUR;
    }
    Object.assign(tx, syncUpdates);

    const paired = findPairedTx(tx, transactions);
    const editedScope = normalizeScope(tx, transactions);
    if (paired && editedScope !== PRIV) {
      Object.assign(paired, syncUpdates);
      if (opts.pairedPricePerUnitEUR != null && opts.pairedPricePerUnitEUR !== '') {
        paired.pricePerUnitEUR = Number(opts.pairedPricePerUnitEUR);
      }
      return [tx.id, paired.id];
    }
    return [tx.id];
  }

  function scopeForTab(tab) {
    if (tab === 'inventory-priv') return PRIV;
    if (tab === 'inventory') return PRIV;
    if (tab === 'inventory-biz') return BIZ;
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
