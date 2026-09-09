import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import robotsParser from 'robots-parser';

/**
 * robots.txt, honoured for the user agent we declare. Cached per host for a
 * day on disk so a run does not fetch it once per page.
 *
 * Fail closed on a server error: if a host cannot tell us its rules we do not
 * assume it has none. A missing file (404) is the one case that means "no
 * rules", and the standard says so.
 */
const DIR = join(process.cwd(), '.cache', 'robots');
const TTL_MS = 24 * 3600 * 1000;

type Cached = { fetchedAt: number; status: number; text: string };

const memo = new Map<string, Promise<Cached>>();

async function load(origin: string, ua: string): Promise<Cached> {
  mkdirSync(DIR, { recursive: true });
  const file = join(DIR, origin.replace(/[^a-z0-9.-]/gi, '_') + '.json');
  if (existsSync(file)) {
    const c = JSON.parse(readFileSync(file, 'utf8')) as Cached;
    if (Date.now() - c.fetchedAt < TTL_MS) return c;
  }
  let status = 0;
  let text = '';
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'user-agent': ua, accept: 'text/plain,*/*;q=0.5' },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });
    status = res.status;
    text = res.ok ? await res.text() : '';
  } catch {
    status = 0;
  }
  const c: Cached = { fetchedAt: Date.now(), status, text };
  writeFileSync(file, JSON.stringify(c));
  return c;
}

export type RobotsVerdict = { ok: boolean; reason?: string };

export async function allowed(url: string, ua: string): Promise<RobotsVerdict> {
  const { origin } = new URL(url);
  let p = memo.get(origin);
  if (!p) {
    p = load(origin, ua);
    memo.set(origin, p);
  }
  const c = await p;
  if (c.status === 404 || c.status === 410) return { ok: true };
  if (c.status === 0 || c.status >= 500) return { ok: false, reason: `robots.txt unavailable (${c.status || 'network'})` };
  if (c.status === 401 || c.status === 403) {
    // The standard treats these as "no access at all".
    return { ok: false, reason: `robots.txt returned ${c.status}` };
  }
  const parser = robotsParser(`${origin}/robots.txt`, c.text);
  const verdict = parser.isAllowed(url, ua);
  if (verdict === false) return { ok: false, reason: 'disallowed by robots.txt' };
  return { ok: true };
}
