# Sales stay on a single account scope

Commercial SELL used to create a mirrored private SELL (and the UI KOR preview ignored the selected scope), so private and business ledgers looked mixed and private sales could be mistaken for commercial. Sales now write to exactly one scope: private never hits KOR/business inventory, and commercial no longer mirrors into private.
