# PokeLedger — Domain Glossary

Shared language for agents and humans working on this codebase.

## Account scope

**Account scope** — which ledger a transaction belongs to: `biz` (commercial / tax-reporting) or `priv` (personal). Every BUY, SELL, and GRADE transaction carries exactly one scope.

**Legacy default** — transactions with no `scope` field are treated as `priv`.

**Scope pair** — when the user records a **commercial BUY** (especially opening inbreng / private transfer), the system may create two linked transactions (one `biz`, one `priv`) sharing a `pairId`, so commercial book value and private acquisition cost can differ. Editing the **commercial** row copies shared fields (product, date, quantity, source) onto the paired private row; **unit cost does not sync**. Editing the **private** row of a pair updates only that private row — commercial books are not touched. Deleting the `biz` row also deletes the paired `priv` row; deleting `priv` alone does not touch `biz`.

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

## Capture inbox

**Capture inbox** — Telegram (v1) and the web 待補 list are clients of the same draft store. A message or photo becomes a **draft**, not a posted ledger row.

**Draft** — an incomplete capture. Missing required fields stay `pending` / `active`. Drafts do not affect KOR, inventory, WACC, COGS, or P&L.

**Post** — writing a complete draft into the live ledger after the owner confirms. Telegram confirm is answering 「對」 to the summary; the web inbox confirm is the 過帳 button. After a Telegram post, that chat cannot edit the row.

**Live ledger** — the single backend copy of products, transactions, expenses, documents, settings (Supabase Postgres). The browser is not the source of truth.

**Labeled guess** — a value extracted from photo/text that is asked back as 「對嗎？」. The model has no post right and no skip right.

**Smart turn** — free-form Telegram replies are interpreted by an LLM that may update draft fields and answer unexpected situations, but still cannot post without an explicit user confirm, and must not invent kind/scope.

_Avoid_: treating a Telegram message as posted; creating products from chat; using a non-ECB rate; posting a pre-KOR business expense without a BTW answer (including 「沒有」)

## Modules (architecture)

**Scope Ledger** (`scope.js`) — normalizes scope, creates scope pairs, and enforces delete/edit rules across paired transactions.

**Valuation Engine** (`valuation.js`) — WACC, COGS, and quantity calculations; owns cache invalidation.

**Transaction Ledger** (`ledger.js`) — CRUD seam for transactions; returns enriched view models for UI render adapters.

**Capture inbox** (`lib/conversation.js`, `lib/post.js`) — draft Q&A and the completeness gate before post. BUY/SELL post reuses Scope Ledger / Transaction Ledger so pairing and COGS stay consistent.

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
