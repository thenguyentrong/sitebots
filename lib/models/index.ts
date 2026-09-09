import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IndexFile, type ModelEntry } from './schemas';

/**
 * Which robots have a 3D model. Server-only (reads the filesystem).
 * data/models/index.json is committed and points at Blob; index.local.json is
 * written by `convert.ts --local` and points at /public/models-dev — it wins
 * in development so a fresh conversion shows up on the next request.
 */
function read(file: string): IndexFile | null {
  const p = join(process.cwd(), 'data', 'models', file);
  if (!existsSync(p)) return null;
  try {
    return IndexFile.parse(JSON.parse(readFileSync(p, 'utf8')));
  } catch (e) {
    console.error(`[models] ${file} is invalid:`, e);
    return null;
  }
}

export function indexKey(robotKey: string, variants: string[]): string {
  return variants.includes('base') ? robotKey : `${robotKey}#${variants[0]}`;
}

/**
 * A variant only gets a model when the source lists it. A B2-W is not a B2
 * with the wheels left off, so the base model must not stand in for it.
 */
export function getRobotModel(robotKey: string, variant = 'base'): ModelEntry | null {
  const files = process.env.NODE_ENV === 'production' ? ['index.json'] : ['index.local.json', 'index.json'];
  for (const f of files) {
    const idx = read(f);
    if (!idx) continue;
    const exact = idx.robots[`${robotKey}#${variant}`];
    if (exact) return exact;
    const base = idx.robots[robotKey];
    if (base?.variants.includes(variant)) return base;
  }
  return null;
}

export function listModelKeys(): string[] {
  const files = process.env.NODE_ENV === 'production' ? ['index.json'] : ['index.local.json', 'index.json'];
  const keys = new Set<string>();
  for (const f of files) for (const k of Object.keys(read(f)?.robots ?? {})) keys.add(k.split('#')[0]);
  return [...keys];
}
