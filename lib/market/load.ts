import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NeedsBatchSchema, type UseCaseNeeds } from './requirements';
import { DossierSchema, type Dossier } from './schema';

// Server-side only. Reads the Germany market records, the per-use-case needs and the
// picture manifest written by scripts/assets/market-pictures.ts.

export type Picture = { src: string; width: number; height: number; credit: string; pageUrl: string; alt: string; sourceUrl?: string };
/** `picture` is the first picture; `gallery` holds the others, in the order of the record's `images`. */
export type MarketRobot = Dossier & { picture: Picture | null; gallery: Picture[] };

const root = () => join(process.cwd(), 'data', 'market');
const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, ''));

let robotsCache: MarketRobot[] | null = null;
let needsCache: Map<string, UseCaseNeeds> | null = null;

function pictures(): { pictures: Record<string, Picture>; gallery: Record<string, Picture[]> } {
  const file = join(root(), 'pictures.json');
  const manifest = existsSync(file) ? readJson(file) : {};
  return { pictures: manifest.pictures ?? {}, gallery: manifest.gallery ?? {} };
}

/** Production and tests fail loudly on an invalid record, so a broken file never silently drops a robot.
 * Development skips it with a warning while research is still writing files. */
export function loadMarket({ strict = process.env.NODE_ENV === 'production' || !!process.env.VITEST }: { strict?: boolean } = {}): MarketRobot[] {
  if (robotsCache) return robotsCache;
  const dir = join(root(), 'de');
  const manifest = pictures();
  const robots = (existsSync(dir) ? readdirSync(dir) : []).filter((name) => name.endsWith('.json')).sort().flatMap((name) => {
    let raw: unknown;
    try { raw = readJson(join(dir, name)); } catch (error) { raw = { invalidJson: String(error) }; }
    const parsed = DossierSchema.safeParse(raw);
    if (!parsed.success) {
      const message = 'Invalid market record ' + name + ': ' + parsed.error.issues.map((issue) => issue.path.join('.') + ' ' + issue.message).join('; ');
      if (strict) throw new Error(message);
      console.warn(message);
      return [];
    }
    return [{ ...parsed.data, picture: manifest.pictures[parsed.data.id] ?? null, gallery: manifest.gallery[parsed.data.id] ?? [] }];
  });
  const ids = new Set<string>();
  for (const robot of robots) {
    if (ids.has(robot.id)) throw new Error('Duplicate market record ' + robot.id);
    ids.add(robot.id);
  }
  if (process.env.NODE_ENV === 'production') robotsCache = robots;
  return robots;
}

export function loadNeeds(): Map<string, UseCaseNeeds> {
  if (needsCache) return needsCache;
  const dir = join(root(), 'requirements');
  const needs = new Map<string, UseCaseNeeds>();
  for (const name of (existsSync(dir) ? readdirSync(dir) : []).filter((file) => file.endsWith('.json')).sort()) {
    for (const row of NeedsBatchSchema.parse(readJson(join(dir, name))).useCases) {
      if (needs.has(row.id)) throw new Error('Duplicate needs for ' + row.id);
      needs.set(row.id, row);
    }
  }
  if (process.env.NODE_ENV === 'production') needsCache = needs;
  return needs;
}
