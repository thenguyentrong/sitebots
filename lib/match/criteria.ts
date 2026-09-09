import { FORM_FACTOR_LABEL, pickPayloadKey, qualifierLabel } from '@/lib/spec/display';
import type { Requirements } from './requirements';
import type { Candidate, CriterionResult, CriterionStatus, PriceQuote } from './types';
import { LABELS, WEIGHTS } from './weights';

/**
 * One function per criterion. Each returns null when the requirement was not
 * asked, otherwise a result whose `text` is the sentence the page shows.
 *
 * Unknown is a status, not a failure: "IP rating not published" is listed as
 * unverified and drops out of the denominator. Only `strict_unknowns` turns it
 * into a fail, and that is the visitor's choice.
 */

type Ctx = { usdToEur: number; today: Date };

function r(
  id: string,
  kind: 'hard' | 'soft',
  status: CriterionStatus,
  score: number,
  text: string,
  weight = kind === 'soft' ? (WEIGHTS as Record<string, number>)[id] ?? 1 : 0,
): CriterionResult {
  return { id, label: LABELS[id] ?? id, kind, weight, status, score, text };
}

const f1 = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 1 });
const f2 = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 2 });

export function formFactor(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.form_factor === 'any') return null;
  const ok = c.card.form_factor === req.form_factor;
  return r('form_factor', 'hard', ok ? 'pass' : 'fail', ok ? 1 : 0, ok ? `${FORM_FACTOR_LABEL[c.card.form_factor]}` : `${FORM_FACTOR_LABEL[c.card.form_factor]}, not a ${FORM_FACTOR_LABEL[req.form_factor].toLowerCase()}`);
}

export function payload(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.payload_kg === undefined) return null;
  const v = c.card.payload_kg_conservative;
  if (v === null) return r('payload', 'hard', 'unknown', 0, 'payload not published');
  const key = pickPayloadKey(c.card.specs ?? {});
  const q = key ? qualifierLabel(key.split(':')[1]) : null;
  const label = q ? ` ${q.split(',')[0]}` : '';
  const verb = v >= req.payload_kg ? 'meets' : 'fails';
  const sign = v >= req.payload_kg ? '≥' : '<';
  return r('payload', 'hard', v >= req.payload_kg ? 'pass' : 'fail', v >= req.payload_kg ? 1 : 0, `${verb}: ${f1(v)} kg${label} ${sign} ${f1(req.payload_kg)} kg needed`);
}

export function reach(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.reach_height_m === undefined) return null;
  const need = req.reach_height_m;
  if (c.card.reach_m !== null) {
    const ok = c.card.reach_m >= need;
    return r('reach', 'hard', ok ? 'pass' : 'fail', ok ? 1 : 0, `${ok ? 'meets' : 'fails'}: reach ${f2(c.card.reach_m)} m ${ok ? '≥' : '<'} ${f2(need)} m needed`);
  }
  const h = c.card.height_max_m ?? c.card.height_m;
  if (h === null) return r('reach', 'hard', 'unknown', 0, 'reach and height not published');
  if (c.card.form_factor === 'quadruped') {
    // A quadruped reaches what its payload mount reaches; without an arm that is its own back.
    const ok = h >= need;
    return r('reach', 'hard', ok ? 'pass' : 'fail', ok ? 1 : 0, `${ok ? 'meets' : 'fails'}: mount height ${f2(h)} m ${ok ? '≥' : '<'} ${f2(need)} m needed (no arm assumed)`);
  }
  const est = Math.round(h * 1.15 * 100) / 100;
  const ok = est >= need;
  return r('reach', 'hard', ok ? 'pass' : 'fail', ok ? 1 : 0, `${ok ? 'meets' : 'fails'}: ~${f2(est)} m estimated from ${f2(h)} m height ${ok ? '≥' : '<'} ${f2(need)} m needed`);
}

export function tasks(c: Candidate, req: Requirements): CriterionResult | null {
  if (!req.tasks.length) return null;
  const caps = c.card.task_capabilities ?? [];
  if (!caps.length) return r('tasks', 'hard', 'unknown', 0, 'site tasks not assessed yet');
  const missing = req.tasks.filter((t) => !caps.includes(t));
  const pretty = (l: string[]) => l.map((t) => t.replace(/_/g, ' ')).join(', ');
  if (!missing.length) return r('tasks', 'hard', 'pass', 1, `covers ${pretty(req.tasks)}`);
  return r('tasks', 'hard', 'fail', 0, `no evidence of ${pretty(missing)}`);
}

export function stairs(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.stairs !== 'required') return null;
  const v = c.card.stair_capable;
  if (v === null) return r('stairs', 'hard', 'unknown', 0, 'stair capability not published');
  return r('stairs', 'hard', v ? 'pass' : 'fail', v ? 1 : 0, v ? `climbs stairs${c.card.step_height_m ? ` (step height ${f2(c.card.step_height_m)} m)` : ''}` : 'does not climb stairs');
}

export function slope(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.slope_deg === undefined) return null;
  const v = c.card.max_slope_deg;
  if (v === null) return r('slope', 'hard', 'unknown', 0, 'slope limit not published');
  const ok = v >= req.slope_deg;
  return r('slope', 'hard', ok ? 'pass' : 'fail', ok ? 1 : 0, `${ok ? 'meets' : 'fails'}: rated ${f1(v)}° ${ok ? '≥' : '<'} ${f1(req.slope_deg)}° on site`);
}

export function terrain(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.terrain === 'paved') return null;
  const ff = c.card.form_factor;
  if (req.terrain === 'gravel') {
    if (ff === 'quadruped') return r('terrain', 'soft', 'pass', 1, 'quadruped, gravel is routine');
    if (c.card.outdoor_rated === true) return r('terrain', 'soft', 'partial', 0.7, 'outdoor-rated; gravel not specifically stated');
    if (c.card.outdoor_rated === false) return r('terrain', 'soft', 'fail', 0.2, 'indoor robot on gravel');
    return r('terrain', 'soft', 'unknown', 0, 'terrain capability not published');
  }
  // rubble, mud: a physical limit, not a preference
  if (ff === 'quadruped') return r('terrain', 'hard', 'pass', 1, `quadruped, ${req.terrain} is within the design envelope`);
  return r('terrain', 'hard', 'fail', 0, `${FORM_FACTOR_LABEL[ff].toLowerCase()}s are not rated for ${req.terrain}`);
}

export function outdoor(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.environment === 'indoor') return null;
  const v = c.card.outdoor_rated;
  if (v === true) return r('outdoor', 'hard', 'pass', 1, `outdoor use${c.card.ip_rating ? ` (${c.card.ip_rating})` : ''}`);
  if (v === false) return r('outdoor', 'hard', 'fail', 0, 'indoor only');
  if (c.card.ip_liquid !== null && c.card.ip_liquid >= 4) return r('outdoor', 'hard', 'partial', 0.6, `${c.card.ip_rating} suggests outdoor use; the maker does not say`);
  return r('outdoor', 'hard', 'unknown', 0, 'outdoor rating not published');
}

export function dust(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.dust !== 'high') return null;
  const s = c.card.ip_solid;
  if (s === null) return r('dust', 'soft', 'unknown', 0, 'IP rating not published');
  if (s >= 6) return r('dust', 'soft', 'pass', 1, `${c.card.ip_rating}: dust-tight`);
  if (s >= 5) return r('dust', 'soft', 'pass', 0.8, `${c.card.ip_rating}: dust-protected`);
  return r('dust', 'soft', 'fail', 0, `${c.card.ip_rating}: not dust-protected`);
}

export function wet(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.wet === 'dry') return null;
  const l = c.card.ip_liquid;
  const kind = req.wet === 'rain' ? 'hard' : 'soft';
  if (l === null) return r('wet', kind, 'unknown', 0, 'IP rating not published');
  const need = req.wet === 'rain' ? 5 : 4;
  if (l >= need) return r('wet', kind, 'pass', 1, `${c.card.ip_rating}: ${req.wet === 'rain' ? 'rain' : 'splash'}-proof`);
  return r('wet', kind, 'fail', req.wet === 'damp' && l >= 1 ? 0.3 : 0, `${c.card.ip_rating}: not rated for ${req.wet}`);
}

export function temperature(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.temp_min_c === undefined && req.temp_max_c === undefined) return null;
  const { temp_min_c: lo, temp_max_c: hi } = c.card;
  if (lo === null && hi === null) return r('temperature', 'hard', 'unknown', 0, 'operating temperature not published');
  const failLo = req.temp_min_c !== undefined && lo !== null && lo > req.temp_min_c;
  const failHi = req.temp_max_c !== undefined && hi !== null && hi < req.temp_max_c;
  const rated = `${lo !== null ? f1(lo) : '?'} to ${hi !== null ? f1(hi) : '?'} °C`;
  const site = `${req.temp_min_c !== undefined ? f1(req.temp_min_c) : '?'} to ${req.temp_max_c !== undefined ? f1(req.temp_max_c) : '?'} °C`;
  if (failLo || failHi) return r('temperature', 'hard', 'fail', 0, `rated ${rated} does not cover site ${site}`);
  return r('temperature', 'hard', 'pass', 1, `rated ${rated} covers site ${site}`);
}

export function runtime(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.runtime_h_per_shift === undefined) return null;
  const v = c.card.runtime_h;
  const swap = c.card.hot_swap;
  if (v === null) return r('runtime', 'soft', 'unknown', 0, 'runtime not published');
  const basis = c.card.runtime_basis && c.card.runtime_basis !== 'unstated' ? c.card.runtime_basis : 'basis unstated';
  if (v >= req.runtime_h_per_shift) return r('runtime', 'soft', 'pass', 1, `${f1(v)} h (${basis}) covers an ${f1(req.runtime_h_per_shift)} h shift`);
  if (swap === true) return r('runtime', 'soft', 'pass', 0.9, `${f1(v)} h per battery, swappable — shift covered by swapping`);
  const ratio = v / req.runtime_h_per_shift;
  const swapText = swap === false ? 'no battery swap' : 'battery swap not published';
  if (!req.hot_swap_acceptable) return r('runtime', 'hard', 'fail', 0, `${f1(v)} h (${basis}) < ${f1(req.runtime_h_per_shift)} h shift; ${swapText}`);
  return r('runtime', 'soft', 'partial', Math.max(0.1, Math.min(0.8, ratio)), `${f1(v)} h (${basis}) < ${f1(req.runtime_h_per_shift)} h shift; ${swapText}`);
}

export function autonomy(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.autonomy === 'teleop_ok') return null;
  const v = c.card.requires_operator;
  if (!v) return r('autonomy', 'hard', 'unknown', 0, 'level of autonomy not assessed');
  const okLevels = req.autonomy === 'autonomous' ? ['none'] : ['none', 'supervised'];
  const ok = okLevels.includes(v);
  const words: Record<string, string> = { none: 'runs autonomously', supervised: 'autonomous with supervision', teleop: 'teleoperated' };
  return r('autonomy', 'hard', ok ? 'pass' : 'fail', ok ? 1 : 0, `${words[v] ?? v}${ok ? '' : `; ${req.autonomy === 'autonomous' ? 'autonomous' : 'supervised'} operation required`}`);
}

export function certifications(c: Candidate, req: Requirements): CriterionResult | null {
  if (!req.certifications_required.length) return null;
  const have = c.card.certifications ?? [];
  if (!have.length) return r('certifications', 'hard', 'unknown', 0, 'certifications not published');
  const missing = req.certifications_required.filter((x) => !have.includes(x));
  const pretty = (l: string[]) => l.map((x) => x.replace(/_/g, ' ')).join(', ');
  if (!missing.length) return r('certifications', 'hard', 'pass', 1, `${pretty(have)}`);
  return r('certifications', 'hard', 'fail', 0, `missing ${pretty(missing)} (has ${pretty(have)})`);
}

/** The price a buyer in the requested region should reckon with, in EUR, with its basis. */
export function quote(c: Candidate, req: Requirements, ctx: Ctx): PriceQuote | null {
  const regions = [req.region, 'EU', 'GLOBAL'];
  const toEur = (amount: number, currency: string): number | null => {
    if (currency === 'EUR') return amount;
    if (currency === 'USD') return amount * ctx.usdToEur;
    return null;
  };
  const byBasis = (rows: typeof c.prices, basis: PriceQuote['basis']): PriceQuote | null => {
    for (const p of rows) {
      const eur = toEur(p.amount, p.currency);
      if (eur === null) continue;
      return { amount_eur: Math.round(eur), original: { amount: p.amount, currency: p.currency, region: p.region, tier: p.tier, source_url: p.source_url, observed_at: p.observed_at }, basis };
    }
    return null;
  };
  const sortByRegion = (rows: typeof c.prices) => [...rows].sort((a, b) => regions.indexOf(a.region) - regions.indexOf(b.region) || a.tier - b.tier || a.amount - b.amount);

  const listed = sortByRegion(c.prices.filter((p) => p.tier <= 2 && regions.includes(p.region) && p.currency === 'EUR'));
  const q1 = byBasis(listed, 'listed');
  if (q1) return q1;
  const store = [...c.prices.filter((p) => p.tier <= 2)].sort((a, b) => a.tier - b.tier || a.amount - b.amount);
  const q2 = byBasis(store, 'converted');
  if (q2) return q2;
  const est = [...c.prices.filter((p) => p.tier === 3 && p.config === 'base')].sort((a, b) => a.amount - b.amount);
  return byBasis(est, 'estimate');
}

export function budget(c: Candidate, req: Requirements, ctx: Ctx): CriterionResult | null {
  if (req.budget_eur === undefined) return null;
  const q = quote(c, req, ctx);
  if (!q) return r('budget', 'soft', 'unknown', 0, 'no published price; quote only');
  const eur = `€${q.amount_eur.toLocaleString('en-GB')}`;
  const basis =
    q.basis === 'listed'
      ? `listed in ${q.original.region}`
      : q.basis === 'converted'
        ? `${q.original.currency} ${q.original.amount.toLocaleString('en-GB')} list price converted, before duties and VAT`
        : `reported estimate, ${new URL(q.original.source_url).hostname.replace(/^www\./, '')}`;
  if (q.amount_eur <= req.budget_eur) return r('budget', 'soft', 'pass', 1, `${eur} (${basis}) within €${req.budget_eur.toLocaleString('en-GB')}`);
  const over = q.amount_eur / req.budget_eur;
  if (over <= 1.25) return r('budget', 'soft', 'partial', 0.5, `${eur} (${basis}), ${Math.round((over - 1) * 100)}% over €${req.budget_eur.toLocaleString('en-GB')}`);
  return r('budget', 'soft', 'fail', 0, `${eur} (${basis}), ${Math.round((over - 1) * 100)}% over budget`);
}

export function leadTime(c: Candidate, req: Requirements, ctx: Ctx): CriterionResult | null {
  if (!req.needed_by) return null;
  const regions = [req.region, 'EU', 'GLOBAL', 'US'];
  const rows = [...c.availability].sort((a, b) => regions.indexOf(a.region) - regions.indexOf(b.region));
  const a = rows[0];
  if (!a) return r('lead_time', 'soft', 'unknown', 0, 'availability not published');
  const days = Math.round((new Date(req.needed_by).getTime() - ctx.today.getTime()) / 86_400_000);
  const when = `needed in ${days} days`;
  if (a.lead_time_days_max !== null && a.lead_time_days_max !== undefined) {
    const ok = a.lead_time_days_max <= days;
    return r('lead_time', 'soft', ok ? 'pass' : 'fail', ok ? 1 : 0, `delivery ${a.lead_time_days_min ?? '?'}–${a.lead_time_days_max} days (${a.region}), ${when}`);
  }
  switch (a.status) {
    case 'for_sale':
      return r('lead_time', 'soft', 'pass', a.in_stock ? 1 : 0.8, `for sale${a.in_stock ? ', in stock' : ''} (${a.region}); lead time not published, ${when}`);
    case 'pre_order':
      return r('lead_time', 'soft', 'partial', 0.5, `pre-order (${a.region}); ship date not published, ${when}`);
    case 'enterprise_only':
      return r('lead_time', 'soft', 'partial', 0.5, `quote only (${a.region}); lead time not published, ${when}`);
    case 'not_sold':
      return r('lead_time', 'soft', 'fail', 0, `not sold yet, ${when}`);
    case 'discontinued':
      return r('lead_time', 'soft', 'fail', 0, 'discontinued');
    default:
      return r('lead_time', 'soft', 'unknown', 0, 'availability not published');
  }
}

export function noise(c: Candidate, req: Requirements): CriterionResult | null {
  if (req.noise_limit_db === undefined) return null;
  const v = c.card.noise_db;
  if (v === null) return r('noise', 'soft', 'unknown', 0, 'noise level not published');
  const ok = v <= req.noise_limit_db;
  return r('noise', 'soft', ok ? 'pass' : 'fail', ok ? 1 : 0, `${f1(v)} dB ${ok ? '≤' : '>'} ${f1(req.noise_limit_db)} dB limit`);
}

/** Always on, low weight: better-documented robots rank above equally-matching unknowns. */
export function evidence(c: Candidate): CriterionResult {
  const total = Object.keys(c.card.specs ?? {}).length;
  const verified = c.card.verified_fields?.length ?? 0;
  const score = Math.min(1, 0.5 * (c.card.completeness ?? 0) + 0.5 * Math.min(1, verified / 8));
  return r('evidence', 'soft', total ? 'pass' : 'unknown', score, `${total} values, ${verified} verified by the maker`);
}

export function evaluateAll(c: Candidate, req: Requirements, ctx: Ctx): CriterionResult[] {
  return [
    formFactor(c, req),
    payload(c, req),
    reach(c, req),
    tasks(c, req),
    stairs(c, req),
    slope(c, req),
    terrain(c, req),
    outdoor(c, req),
    dust(c, req),
    wet(c, req),
    temperature(c, req),
    runtime(c, req),
    autonomy(c, req),
    certifications(c, req),
    budget(c, req, ctx),
    leadTime(c, req, ctx),
    noise(c, req),
    evidence(c),
  ].filter((x): x is CriterionResult => x !== null);
}
