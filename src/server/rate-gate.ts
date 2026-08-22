/**
 * Serializes upstream provider calls to respect the ~1 req/sec usage
 * policy. Best-effort per process instance; platform-level caching
 * (Cache-Control s-maxage) is the primary shield on multi-instance hosts.
 */
const MIN_INTERVAL_MS = 1100;
let lastStart = 0;
let chain: Promise<void> = Promise.resolve();

export function acquireProviderSlot(): Promise<void> {
  const run = chain.then(async () => {
    const wait = Math.max(0, lastStart + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastStart = Date.now();
  });
  chain = run.catch(() => {});
  return run;
}
