# PokeLedger — Domain Glossary

Shared language for agents and humans working on this codebase.

## Account scope

**Account scope** — which ledger a transaction belongs to: `biz` (commercial / tax-reporting) or `priv` (personal). Every BUY, SELL, and GRADE transaction carries exactly one scope.

**Legacy default** — transactions with no `scope` field are treated as `priv`.

**Scope pair** — when the user records a **commercial BUY** (especially opening inbreng / private transfer), the system may create two linked transactions (one `biz`, one `priv`) sharing a `pairId`, so commercial book value and private acquisition cost can differ. Shared fields (product, date, quantity, source) stay in sync on edit; **unit cost does not sync**. Deleting the `biz` row also deletes the paired `priv` row; deleting `priv` alone does not touch `biz`.

**Sales are single-scope** — a SELL is recorded on exactly one account scope. Commercial sales never mirror into private, and private sales never appear on commercial inventory, KOR, or business P&L.
_Avoid_: pairing SELL across biz/priv

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

## KOR & BTW

**Company start** — the eenmanszaak founding date (Yi Trading: 2026-08-12). Opening inbreng and the pre-KOR BTW window start here.
_Avoid_: treating the founding date as KOR start

**KOR start** — the date the kleineondernemersregeling begins (Yi Trading: 2026-10-01). From this date commercial sales are KOR-exempt omzet and input VAT is generally not reclaimable.
_Avoid_: using KOR start as the opening-inventory transfer date

**KOR revenue** — sum of commercial (`biz`) SELL revenue in the fiscal year. Private sales do not count toward the €20,000 KOR limit.

**Pre-KOR BTW period** — from company start up to (but not including) KOR start. Commercial sales in this window must be filed on the omzetbelasting return; reclaimable input VAT is recorded on business expenses.
_Avoid_: assuming no quarterly BTW filing in the founding year

## Expenses

**Business expense** — a commercial Kosten entry (`isPrivate === false`). Hits business P&L and IB. Private expenses do not.

**Expense net amount** — the IB / P&L amount on a business expense. When voorbelasting is recorded, this is excl. VAT.
_Avoid_: booking the iDEAL/gross paid amount as IB kosten when VAT is reclaimed

**Voorbelasting** — input VAT on a business purchase in the pre-KOR BTW period. Reclaimable on the BTW return; excluded from IB kosten.
_Avoid_: booking reclaimable VAT as an income-tax expense
