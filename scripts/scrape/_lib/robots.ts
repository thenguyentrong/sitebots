import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import robotsParser from 'robots-parser';
import { CACHE_ROOT } from './cache';

/**
 * robots.txt, honoured for the user agent we declare. Cached per host for a
 * day on disk so a run does not fetch it once per page.
 *
 * Fail closed on a server error: if a host cannot tell us its rules we do not
 * assume it has none. A 4xx answer (404, but also the 403 of image hosts)
 * means "no rules", as RFC 9309 says.
 */
const DIR = join(CACHE_ROOT, 'robots');
const TTL_MS = 24 * 3600 * 1000;

type Cached = { fetchedAt: number; status: number; text: string };

const memo = new Map<string, Promise<Cached>>();

async function load(origin: string, ua: string): Promise<Cached> {
  mkdirSync(DIR, { recursive: true });
  const file = join(DIR, origin.replace(/[^a-z0-9.-]/gi, '_') + '.json');
  if (existsSync(/* turbopackIgnore: true */ file)) {
    const c = JSON.parse(readFileSync(/* turbopackIgnore: true */ file, 'utf8')) as Cached;
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
  if (c.status === 0 || c.status >= 500) return { ok: false, reason: `robots.txt unavailable (${c.status || 'network'})` };
  // RFC 9309, 2.3.1.3: a robots.txt that answers with any 4xx is "unavailable", and the crawler may access the
  // server. Image hosts (Webflow, Framer, Wix, S3 buckets) answer 403 for a file they do not have. A 403 on the
  // page or picture itself still stops us (fetch.ts).
  if (c.status >= 400 && c.status < 500) return { ok: true };
  const parser = robotsParser(`${origin}/robots.txt`, c.text);
  const verdict = parser.isAllowed(url, ua);
  if (verdict === false) return { ok: false, reason: 'disallowed by robots.txt' };
  return { ok: true };
}
