# Sales stay on a single account scope

Commercial SELL used to create a mirrored private SELL (and the UI KOR preview ignored the selected scope), so private and business ledgers looked mixed and private sales could be mistaken for commercial. **Writes** still go to exactly one scope: a SELL is never copied onto the other ledger, and private never hits KOR / business inventory / business P&L.

Private **collection view** (inventory + private transactions tab) overlays commercial SELL and GRADE: remaining drops, 售出／明細列出原本的 `biz` 列，鑑定卡用私人成本＋評鑑費進個人均進價。商務銷售在個人頁的利潤／回本用私人買進價。Overlay does not create a second row and does not change KOR. Commercial quantity is unchanged by private sales.
