import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { SqlClient } from '@/lib/db';
import { SOURCE_KINDS } from '@/lib/spec/enums';

const SourceRow = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  kind: z.enum(SOURCE_KINDS),
  tier: z.number().int().min(0).max(4),
  trust: z.enum(['high', 'normal', 'medium', 'low', 'deny']).default('normal'),
  attribution_text: z.string().optional(),
  homepage_url: z.string().optional(),
  robots_note: z.string().optional(),
  notes: z.string().optional(),
});
export type SourceRow = z.infer<typeof SourceRow>;

const SourceFile = z.object({ sources: z.array(SourceRow) });

let cached: SourceRow[] | null = null;

/** data/sources.json, validated and cached per process. */
export function loadSources(root = process.cwd()): SourceRow[] {
  if (cached) return cached;
  const text = readFileSync(join(root, 'data', 'sources.json'), 'utf8');
  cached = SourceFile.parse(JSON.parse(text)).sources;
  return cached;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/** Longest registered domain that the URL's host equals or ends with. */
export function sourceForUrl(url: string): SourceRow | null {
  const host = hostOf(url);
  if (!host) return null;
  let best: SourceRow | null = null;
  for (const s of loadSources()) {
    const d = s.domain.toLowerCase();
    if (d.includes('/')) {
      // path-scoped ids such as github.com/jk4e
      if (url.toLowerCase().includes(d) && (!best || d.length > best.domain.length)) best = s;
      continue;
    }
    if ((host === d || host.endsWith('.' + d)) && (!best || d.length > best.domain.length)) best = s;
  }
  return best;
}

export function sourceIdForUrl(url: string): string | null {
  return sourceForUrl(url)?.id ?? null;
}

export function isDeniedUrl(url: string): boolean {
  return sourceForUrl(url)?.trust === 'deny';
}

export async function upsertSources(sql: SqlClient): Promise<number> {
  const rows = loadSources();
  for (const s of rows) {
    await sql`
      insert into sources (id, name, domain, kind, tier, trust, attribution_text, homepage_url, robots_note, notes)
      values (${s.id}, ${s.name}, ${s.domain}, ${s.kind}, ${s.tier}, ${s.trust},
              ${s.attribution_text ?? null}, ${s.homepage_url ?? null}, ${s.robots_note ?? null}, ${s.notes ?? null})
      on conflict (id) do update set
        name = excluded.name, domain = excluded.domain, kind = excluded.kind, tier = excluded.tier,
        trust = excluded.trust, attribution_text = excluded.attribution_text,
        homepage_url = excluded.homepage_url, robots_note = excluded.robots_note, notes = excluded.notes`;
  }
  return rows.length;
}
