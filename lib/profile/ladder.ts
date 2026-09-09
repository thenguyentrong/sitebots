import { RequirementSchema, type Requirements } from '@/lib/match/requirements';
import type { Candidate, CriterionResult } from '@/lib/match/types';

/**
 * Threshold ladders. The matcher's criteria answer yes/no to a requirement;
 * asked at several rising values, the share of "yes" is a 0–1 score with no
 * new formula behind it — the same rules the matcher publishes. A criterion
 * that reports unknown makes the whole part unknown, never zero.
 */

export type Part = { score: number | null; status: 'known' | 'unknown'; text: string };

type Crit = (c: Candidate, req: Requirements) => CriterionResult | null;

/** Requirement objects are parsed once so defaults are exactly the matcher's. */
const reqCache = new Map<string, Requirements>();
export function reqWith(patch: Record<string, unknown>): Requirements {
  const key = JSON.stringify(patch);
  let r = reqCache.get(key);
  if (!r) {
    r = RequirementSchema.parse(patch);
    reqCache.set(key, r);
  }
  return r;
}

export function ladder(c: Candidate, fn: Crit, key: keyof Requirements, steps: readonly unknown[], extra: Record<string, unknown> = {}): Part {
  let passes = 0;
  const graded: number[] = [];
  let lastText = '';
  let bestPass = '';
  for (const v of steps) {
    const res = fn(c, reqWith({ ...extra, [key]: v }));
    if (!res) continue;
    if (res.status === 'unknown') return { score: null, status: 'unknown', text: res.text };
    if (res.kind === 'soft' && res.status !== 'fail') graded.push(res.score);
    else if (res.status === 'pass') passes++;
    else if (res.status === 'partial') passes += res.score;
    if (res.status === 'pass' || res.status === 'partial') bestPass = res.text;
    else if (!bestPass && !lastText) lastText = res.text;
  }
  lastText = bestPass || lastText;
  // Graded criteria (runtime, terrain, dust) already return a continuous score; use it directly.
  if (graded.length) return { score: graded.reduce((a, b) => a + b, 0) / graded.length, status: 'known', text: lastText };
  return { score: passes / steps.length, status: 'known', text: lastText };
}

/** One criterion, asked once. */
export function single(c: Candidate, fn: Crit, patch: Record<string, unknown>): Part {
  const res = fn(c, reqWith(patch));
  if (!res) return { score: null, status: 'unknown', text: 'not asked' };
  if (res.status === 'unknown') return { score: null, status: 'unknown', text: res.text };
  return { score: res.score, status: 'known', text: res.text };
}

export function combine(parts: Part[]): { score: number | null; status: 'known' | 'partial' | 'unknown'; basis: string } {
  const known = parts.filter((p) => p.status === 'known' && p.score !== null);
  if (!known.length) return { score: null, status: 'unknown', basis: parts[0]?.text ?? 'not published' };
  const score = known.reduce((a, p) => a + (p.score as number), 0) / known.length;
  return { score, status: known.length === parts.length ? 'known' : 'partial', basis: known.map((p) => p.text).join(' · ') };
}

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
