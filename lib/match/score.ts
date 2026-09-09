import { evaluateAll, quote } from './criteria';
import type { Requirements } from './requirements';
import type { Candidate, CriterionResult, Excluded, MatchOutput, Ranked } from './types';

export type RankOptions = { usdToEur?: number; today?: Date; limit?: number };

/**
 * Pure: candidates + requirements → ranked and excluded lists with the
 * reasons attached. No database, no randomness, so it is tested on fixtures.
 *
 * A robot is excluded by any hard fail (or, in strict mode, by any hard
 * unknown). The score is the weighted mean of the soft criteria whose value
 * is known; unknown soft criteria are listed but drop out of the denominator,
 * so a robot is never punished for a gap in what its maker publishes — it is
 * shown as unverified instead.
 */
export function rankRobots(candidates: Candidate[], req: Requirements, opts: RankOptions = {}): MatchOutput {
  const ctx = { usdToEur: opts.usdToEur ?? 0.92, today: opts.today ?? new Date() };
  const ranked: Ranked[] = [];
  const excluded: Excluded[] = [];

  for (const c of candidates) {
    const results = evaluateAll(c, req, ctx);
    const hardFails = results.filter((x) => x.kind === 'hard' && (x.status === 'fail' || (req.strict_unknowns && x.status === 'unknown')));
    if (hardFails.length) {
      excluded.push({ robot: c.card, reasons: hardFails.map((x) => `${x.label}: ${x.text}`), results });
      continue;
    }
    const soft = results.filter((x) => x.kind === 'soft');
    const known = soft.filter((x) => x.status !== 'unknown');
    if (req.strict_unknowns && soft.length !== known.length) {
      excluded.push({ robot: c.card, reasons: soft.filter((x) => x.status === 'unknown').map((x) => `${x.label}: ${x.text}`), results });
      continue;
    }
    const wsum = known.reduce((s, x) => s + x.weight, 0);
    const score = wsum ? known.reduce((s, x) => s + x.weight * x.score, 0) / wsum : 0;
    const applicable = results.length;
    const coverage = applicable ? results.filter((x) => x.status !== 'unknown').length / applicable : 1;
    ranked.push({ robot: c.card, score: Math.round(score * 1000) / 1000, coverage: Math.round(coverage * 100) / 100, results, price: quote(c, req, ctx) });
  }

  // A robot whose stair or outdoor rating is simply unpublished must not rank
  // above one that is proven to pass. Hard criteria still open sort first,
  // then the soft score, then how much of the rest is known.
  const openHard = (r: Ranked) => r.results.filter((x) => x.kind === 'hard' && x.status === 'unknown').length;
  ranked.sort(
    (a, b) =>
      openHard(a) - openHard(b) ||
      b.score - a.score ||
      b.coverage - a.coverage ||
      (b.robot.verified_fields?.length ?? 0) - (a.robot.verified_fields?.length ?? 0) ||
      (a.price?.amount_eur ?? Infinity) - (b.price?.amount_eur ?? Infinity) ||
      a.robot.name.localeCompare(b.robot.name),
  );
  excluded.sort((a, b) => a.reasons.length - b.reasons.length || a.robot.name.localeCompare(b.robot.name));

  return {
    ranked: opts.limit ? ranked.slice(0, opts.limit) : ranked,
    excluded,
    considered: candidates.length,
  };
}

export function summarize(results: CriterionResult[]): { pass: number; partial: number; fail: number; unknown: number } {
  const out = { pass: 0, partial: 0, fail: 0, unknown: 0 };
  for (const x of results) out[x.status]++;
  return out;
}
