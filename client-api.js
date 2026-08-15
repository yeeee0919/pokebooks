'use strict';
const PokeApi = (() => {
  async function req(path, opts = {}) {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText || 'request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    me: () => req('/api/auth'),
    login: (password) => req('/api/auth', { method: 'POST', body: JSON.stringify({ password }) }),
    logout: () => req('/api/auth', { method: 'DELETE' }),
    getLedger: () => req('/api/ledger'),
    putLedger: (ledger, version) => req('/api/ledger', { method: 'PUT', body: JSON.stringify({ ledger, version }) }),
    listDrafts: () => req('/api/drafts'),
    patchDraft: (id, fields, status) => req('/api/drafts', { method: 'PATCH', body: JSON.stringify({ id, fields, status }) }),
    postDraft: (id) => req('/api/drafts', { method: 'POST', body: JSON.stringify({ id }) }),
    pairStatus: () => req('/api/pair'),
    pairStart: () => req('/api/pair', { method: 'POST' }),
    photoUrl: (id) => `/api/photos/${encodeURIComponent(id)}`,
  };
})();
