import { requireOwner, json, readJson } from '../lib/auth.js';
import { getLedger, putLedger, listDrafts, getDraft, saveDraft, ensureSchema } from '../lib/db.js';
import { postDraftToLedger } from '../lib/post.js';
import { canPost, missingFields } from '../lib/completeness.js';
import { nextQuestion } from '../lib/conversation.js';

export default async function handler(req, res) {
  if (!requireOwner(req, res)) return;
  try {
    await ensureSchema();
    if (req.method === 'GET') {
      const id = req.query?.id;
      if (id) {
        const draft = await getDraft(id);
        if (!draft) return json(res, 404, { error: 'not found' });
        const { ledger } = await getLedger();
        json(res, 200, { draft, missing: missingFields(draft.fields || {}, ledger.settings || {}) });
        return;
      }
      const drafts = await listDrafts();
      json(res, 200, { drafts });
      return;
    }
    if (req.method === 'PATCH') {
      const body = await readJson(req);
      const draft = await getDraft(body.id);
      if (!draft) return json(res, 404, { error: 'not found' });
      if (draft.status === 'posted' || draft.status === 'cancelled') {
        return json(res, 400, { error: '不能改已過帳或已取消的草稿' });
      }
      if (body.fields) draft.fields = { ...draft.fields, ...body.fields };
      if (body.status === 'pending' || body.status === 'active') draft.status = body.status;
      const { ledger } = await getLedger();
      const q = nextQuestion(draft, ledger.settings || {});
      draft.waitingFor = q.waitingFor;
      await saveDraft(draft);
      json(res, 200, { draft, missing: missingFields(draft.fields, ledger.settings || {}) });
      return;
    }
    if (req.method === 'POST') {
      const body = await readJson(req);
      const draft = await getDraft(body.id);
      if (!draft) return json(res, 404, { error: 'not found' });
      const current = await getLedger();
      if (!canPost(draft.fields, current.ledger.settings || {})) {
        return json(res, 400, {
          error: 'incomplete',
          missing: missingFields(draft.fields, current.ledger.settings || {}),
        });
      }
      const result = postDraftToLedger(current.ledger, draft);
      if (!result.ok) return json(res, 400, result);
      const saved = await putLedger(result.ledger, current.version);
      if (!saved.ok) return json(res, 409, { error: 'conflict', version: saved.version });
      draft.status = 'posted';
      draft.postedAt = new Date().toISOString();
      draft.postedRef = result.postedRef;
      await saveDraft(draft);
      json(res, 200, { ok: true, postedRef: result.postedRef, version: saved.version, ledger: saved.ledger });
      return;
    }
    json(res, 405, { error: 'method' });
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
}
