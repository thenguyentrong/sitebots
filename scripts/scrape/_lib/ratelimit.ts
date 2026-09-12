// One request every two seconds per host, whatever the adapter does. Slower
// than it needs to be for a JSON feed and fast enough for everything else;
// the disk cache makes re-runs free, so the cost of politeness is paid once.

const DEFAULT_INTERVAL_MS = 2000;
const INTERVAL_MS: Record<string, number> = {
  'shop.unitree.com': 1000,
};

const last = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function take(host: string): Promise<void> {
  const interval = INTERVAL_MS[host] ?? DEFAULT_INTERVAL_MS;
  const prev = last.get(host) ?? 0;
  const slot = Math.max(Date.now(), prev + interval);
  // Reserve before awaiting: concurrent workers must not wake into the same slot.
  last.set(host, slot);
  const wait = slot - Date.now();
  if (wait > 0) await sleep(wait);
}
