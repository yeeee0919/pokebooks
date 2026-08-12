# PokeLedger — Domain Glossary

Shared language for agents and humans working on this codebase.

## Account scope

**Account scope** — which ledger a transaction belongs to: `biz` (commercial / tax-reporting) or `priv` (personal). Every BUY, SELL, and GRADE transaction carries exactly one scope.

**Legacy default** — transactions with no `scope` field are treated as `priv`.

**Scope pair** — when the user records a **commercial BUY or SELL**, the system creates two linked transactions (one `biz`, one `priv`) sharing a `pairId`. Shared fields (product, date, quantity, source, etc.) stay in sync on edit; **unit cost / unit price does not sync** across the pair. Deleting the `biz` row also deletes the paired `priv` row; deleting `priv` alone does not touch `biz`.

**Pure private entry** — when the user selects **私人 (priv)**, only one transaction is created with no pair.

**Commercial unit cost** — the per-unit amount booked on the `biz` BUY (e.g. fair market value for opening inbreng). Drives commercial WACC/COGS and tax inventory; never mixed into private valuation.

**Private unit cost** — the per-unit amount booked on the `priv` BUY (e.g. the owner's actual acquisition cost). Drives private WACC only; excluded from KOR and business P&L.
_Avoid_: treating private acquisition cost as commercial book value

## Inventory & valuation

**WACC** — weighted average cost per unit for a product within an account scope, computed from BUY and GRADE-in transactions up to a given date.

**COGS** — cost of goods sold for a SELL transaction. Snapshotted as `cogsPerUnit` at write time; recalculated when the SELL is edited or when an upstream BUY that affects the same product+scope is edited.

**Commercial inventory** — stock and P&L figures filtered to `scope === 'biz'`. Used for KOR reporting and the business P&L report.

**Private inventory** — stock figures filtered to `scope === 'priv'`. Excluded from KOR and business P&L.

## Modules (architecture)

**Scope Ledger** (`scope.js`) — normalizes scope, creates scope pairs, and enforces delete/edit rules across paired transactions.

**Valuation Engine** (`valuation.js`) — WACC, COGS, and quantity calculations; owns cache invalidation.

**Transaction Ledger** (`ledger.js`) — CRUD seam for transactions; returns enriched view models for UI render adapters.

## KOR

**KOR revenue** — sum of commercial (`biz`) SELL revenue in the fiscal year. Private sales do not count toward the €20,000 KOR limit.
