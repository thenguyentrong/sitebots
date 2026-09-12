import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scraperUserAgent } from '@/lib/site';
import { DEFAULT_TTL_MS, isFresh, lookup, sha256, store } from './cache';
import { isDenied, isTrap } from './denylist';
import { take } from './ratelimit';
import { allowed } from './robots';
import type { FetchOptions, Snapshot } from './types';

/**
 * The one way out to the network. Order of checks matters and is the same
 * for every adapter:
 *
 *   denylist → honeypot → disk cache → robots.txt → rate limit → request
 *
 * A 403 is treated as the source telling us to stop, not as a retry case. A
 * 429 or 503 is retried three times honouring Retry-After. Everything that
 * comes back 2xx is stored on disk with its validators so the next run can
 * revalidate instead of re-download.
 */
export class FetchRefused extends Error {
  constructor(
    public code: 'denied' | 'trap' | 'robots' | 'blocked' | 'http' | 'network',
    message: string,
    public url: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'FetchRefused';
  }
}

const UA = scraperUserAgent();
const TIMEOUT_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(res: Response, attempt: number): number {
  const h = res.headers.get('retry-after');
  if (h) {
    const s = Number(h);
    if (Number.isFinite(s)) return Math.min(s * 1000, 120_000);
    const d = Date.parse(h);
    if (!Number.isNaN(d)) return Math.max(0, Math.min(d - Date.now(), 120_000));
  }
  return Math.min(2000 * 2 ** attempt, 60_000);
}

export async function politeFetch(url: string, opts: FetchOptions = {}): Promise<Snapshot> {
  if (isDenied(url)) throw new FetchRefused('denied', 'source is on the denylist', url);
  if (isTrap(url)) throw new FetchRefused('trap', 'honeypot URL', url);

  const cached = lookup(url);
  if (cached && !opts.fresh && isFresh(cached, opts.ttlMs ?? DEFAULT_TTL_MS)) return cached;

  const verdict = await allowed(url, UA);
  if (!verdict.ok) throw new FetchRefused('robots', verdict.reason ?? 'robots.txt', url);

  const { hostname } = new URL(url);
  // Browser-like Accept, and no Accept-Language: PrestaShop (generationrobots.com)
  // treats a request that accepts JSON as an AJAX call and answers an empty
  // 200. Adapters that want JSON say so explicitly. Sites that need a language
  // carry it in the URL (/en/), and the aggregators filter language copies.
  const headers: Record<string, string> = {
    ...opts.headers,
    'user-agent': UA,
    accept: opts.accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  // Validators only when the cached copy is one we would accept: a --fresh run
  // must not be answered with a 304 that points at the stale body.
  if (cached && !opts.fresh) {
    if (cached.etag) headers['if-none-match'] = cached.etag;
    if (cached.lastModified) headers['if-modified-since'] = cached.lastModified;
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    await take(hostname);
    let res: Response;
    try {
      res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      if (attempt === 3) throw new FetchRefused('network', String(e), url);
      await sleep(2000 * 2 ** attempt);
      continue;
    }

    if (res.status === 304 && cached) {
      const refreshed = { ...cached, fetchedAt: new Date().toISOString(), fromCache: true };
      store(refreshed);
      return refreshed;
    }
    if (res.status === 429 || res.status === 503) {
      if (attempt === 3) throw new FetchRefused('http', `gave up after ${res.status}`, url, res.status);
      await sleep(retryAfterMs(res, attempt));
      continue;
    }
    if (res.status === 403 || res.status === 401) {
      throw new FetchRefused('blocked', `source refused us with ${res.status}`, url, res.status);
    }
    if (!res.ok) throw new FetchRefused('http', `HTTP ${res.status}`, url, res.status);

    const body = await res.text();
    // An empty 200 is a server quirk, not a page (generationrobots.com does it
    // for some request headers). Never cache it as if it were content.
    if (!body.trim()) throw new FetchRefused('http', 'empty 200 body', url, res.status);
    const snap: Snapshot = {
      url,
      finalUrl: res.url || url,
      status: res.status,
      contentType: res.headers.get('content-type'),
      etag: res.headers.get('etag'),
      lastModified: res.headers.get('last-modified'),
      fetchedAt: new Date().toISOString(),
      body,
      sha256: sha256(body),
      bytes: Buffer.byteLength(body),
      fromCache: false,
    };
    store(snap);
    return snap;
  }
  throw new FetchRefused('network', 'unreachable', url);
}

/** Binary downloads use the same declared crawler identity, access checks and host pacing. */
export async function politeAsset(url: string, timeoutMs = 60_000): Promise<Buffer> {
  if (isDenied(url)) throw new FetchRefused('denied', 'source is on the denylist', url);
  if (isTrap(url)) throw new FetchRefused('trap', 'honeypot URL', url);
  const cacheDir=join(process.cwd(),'.cache','binary');
  const cacheFile=join(cacheDir,sha256(url));
  if(existsSync(cacheFile) && Date.now()-statSync(cacheFile).mtimeMs<24*3600*1000) return readFileSync(cacheFile);
  const verdict = await allowed(url, UA);
  if (!verdict.ok) throw new FetchRefused('robots', verdict.reason ?? 'robots.txt', url);
  for (let attempt=0; attempt<3; attempt++) {
    await take(new URL(url).hostname);
    const response=await fetch(url,{headers:{'user-agent':UA,accept:'*/*'},signal:AbortSignal.timeout(timeoutMs)});
    if ((response.status===429 || response.status===503) && attempt<2) { await sleep(retryAfterMs(response,attempt)); continue; }
    if (!response.ok) throw new FetchRefused('http','HTTP '+response.status,url,response.status);
    const bytes=Buffer.from(await response.arrayBuffer());
    mkdirSync(cacheDir,{recursive:true});
    writeFileSync(cacheFile,bytes);
    return bytes;
  }
  throw new FetchRefused('network','download retries exhausted',url);
}
