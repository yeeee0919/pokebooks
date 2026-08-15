# Telegram capture inbox writes drafts, then posts to one live ledger

v1 in-the-moment capture is a Telegram bot. LINE / WhatsApp / Cursor are out of scope.

The previous app stored the live ledger in `localStorage`. A Telegram webhook cannot write that store, so drafts and posted rows live in one EU Postgres database (**Supabase**). The web UI and the bot are both clients. After a one-time import, the browser is a cache plus editor, not the source of truth.

Conversation rules from grilling: the model may only propose labeled guesses; kind (BUY / SELL / EXPENSE) and account scope are always answered by the owner; products are chosen from existing inventory; pre-KOR business expenses must record BTW (including none); non-EUR amounts use the ECB daily rate or the owner types EUR — never a third-party rate; one active Q&A with `/later` to park; Telegram cannot edit after post.
