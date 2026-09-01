/** Race a promise against a deadline; rejects on timeout. */
export function withTimeout(promise, ms, label = 'task') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 45_000;
