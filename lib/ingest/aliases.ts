import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { FORM_FACTORS } from '@/lib/spec/enums';

const RobotAlias = z.object({
  name: z.string(),
  form_factor: z.enum(FORM_FACTORS),
  aliases: z.array(z.string()).default([]),
  variants: z.record(z.string(), z.array(z.string())).optional(),
  note: z.string().optional(),
});

const ManufacturerAlias = z.object({
  name: z.string(),
  country: z.string().length(2).optional(),
  website: z.url().optional(),
  aliases: z.array(z.string()).default([]),
  note: z.string().optional(),
});

export const AliasFile = z.object({
  manufacturers: z.record(z.string(), ManufacturerAlias).default({}),
  robots: z.record(z.string(), z.record(z.string(), RobotAlias)).default({}),
});
export type AliasFile = z.infer<typeof AliasFile>;
export type RobotAlias = z.infer<typeof RobotAlias>;
export type ManufacturerAlias = z.infer<typeof ManufacturerAlias>;

/**
 * Two alias files, one policy.
 *
 * data/aliases.yaml is curated by hand and wins every conflict. It carries
 * the variants (G1 base vs EDU) and the manufacturers we care about.
 *
 * data/aliases.generated.yaml is produced by scripts/aliases-generate.ts from
 * the (maker, model) pairs the aggregators publish, so the catalogue can grow
 * past what one person types. It is reviewed as a git diff, and a generated
 * entry never overrides a curated one: resolution runs against the curated
 * file first and only then against the generated one.
 */
const cache = new Map<string, AliasFile | null>();

function load(file: string): AliasFile | null {
  if (cache.has(file)) return cache.get(file)!;
  const path = join(process.cwd(), 'data', file);
  const parsed = existsSync(path) ? AliasFile.parse(parse(readFileSync(path, 'utf8')) ?? {}) : null;
  cache.set(file, parsed);
  return parsed;
}

export function curatedAliases(): AliasFile {
  return load('aliases.yaml') ?? { manufacturers: {}, robots: {} };
}

export function generatedAliases(): AliasFile | null {
  return load('aliases.generated.yaml');
}

/** Curated over generated, merged per manufacturer. */
export function loadAliases(): AliasFile {
  const c = curatedAliases();
  const g = generatedAliases();
  if (!g) return c;
  const manufacturers = { ...g.manufacturers, ...c.manufacturers };
  const robots: AliasFile['robots'] = {};
  for (const slug of new Set([...Object.keys(g.robots), ...Object.keys(c.robots)])) {
    robots[slug] = { ...(g.robots[slug] ?? {}), ...(c.robots[slug] ?? {}) };
  }
  return { manufacturers, robots };
}

export function resetAliasCache(): void {
  cache.clear();
}

export function manufacturerAlias(slug: string): ManufacturerAlias {
  const m = loadAliases().manufacturers[slug];
  if (!m) throw new Error(`Unknown manufacturer slug "${slug}" — add it to data/aliases.yaml`);
  return m;
}

export function robotAlias(manufacturerSlug: string, modelSlug: string): RobotAlias {
  const r = loadAliases().robots[manufacturerSlug]?.[modelSlug];
  if (!r) throw new Error(`Unknown robot "${manufacturerSlug}/${modelSlug}" — add it to data/aliases.yaml`);
  return r;
}
