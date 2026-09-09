import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Snapshot } from './types';

/**
 * On-disk HTTP cache under .cache/http/{host}/{hash}. A re-run of an adapter
 * while its parser is being fixed must not hit the source again, and a
 * revalidation (ETag / Last-Modified) is one cheap request instead of a page.
 */
const ROOT = join(process.cwd(), '.cache', 'http');
export const DEFAULT_TTL_MS = 7 * 24 * 3600 * 1000;

type Meta = Omit<Snapshot, 'body' | 'fromCache'>;

function paths(url: string): { meta: string; body: string } {
  const host = new URL(url).hostname;
  const key = createHash('sha1').update(url).digest('hex').slice(0, 24);
  const base = join(ROOT, host, key);
  return { meta: base + '.json', body: base + '.body' };
}

export function lookup(url: string): Snapshot | null {
  const p = paths(url);
  if (!existsSync(p.meta) || !existsSync(p.body)) return null;
  try {
    const meta = JSON.parse(readFileSync(p.meta, 'utf8')) as Meta;
    const body = readFileSync(p.body, 'utf8');
    return { ...meta, body, fromCache: true };
  } catch {
    return null;
  }
}

export function isFresh(snap: Snapshot, ttlMs = DEFAULT_TTL_MS): boolean {
  return Date.now() - new Date(snap.fetchedAt).getTime() < ttlMs;
}

export function store(snap: Snapshot): void {
  const p = paths(snap.url);
  mkdirSync(dirname(p.meta), { recursive: true });
  const { body, fromCache: _ignored, ...meta } = snap;
  writeFileSync(p.meta, JSON.stringify(meta, null, 2));
  writeFileSync(p.body, body);
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
