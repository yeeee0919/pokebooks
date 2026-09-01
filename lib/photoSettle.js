/** Wait until the photo count stops growing (user finished sending evidence). */
export async function waitForPhotoQuiet(getCount, {
  quietMs = 5000,
  pollMs = 600,
  maxWaitMs = 22000,
  sleepFn = ms => new Promise(r => setTimeout(r, ms)),
} = {}) {
  const start = Date.now();
  let lastCount = -1;
  let stableSince = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const count = await getCount();
    if (count !== lastCount) {
      lastCount = count;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= quietMs) {
      return count;
    }
    await sleepFn(pollMs);
  }
  return getCount();
}
