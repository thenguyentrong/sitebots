import { evaluateAll, quote } from '@/lib/match/criteria';
import type { Candidate, CriterionResult, PriceQuote } from '@/lib/match/types';
import type { Requirements } from '@/lib/match/requirements';
import type { Trust } from '@/lib/spec/enums';

export type EvidenceLink = { label: string; url: string; observedAt: string; trust: Trust };
export type PlanResult = {
  id: string; name: string; href: string; manufacturer: string; supplierHref: string; variant: string;
  criteria: CriterionResult[]; sources: EvidenceLink[]; blocked: boolean; open: number;
  price: PriceQuote | null;
};
export type PlanResponse = { results: PlanResult[]; considered: number; blocked: number; missing: string[] };
export function assessCandidate(candidate: Candidate, requirements: Requirements, usdToEur = 0.92): PlanResult {
  const card = candidate.card;
  const criteria = evaluateAll(candidate, requirements, { usdToEur, today: new Date() }).filter((criterion) => criterion.id !== 'evidence');
  const sources = Object.entries(card.specs).filter(([key]) => /^(task_capabilities|payload_kg|reach_m|stair_capable|max_slope_deg|runtime_h|outdoor_rated|requires_operator)/.test(key))
    .filter(([, value]) => /^https?:\/\//.test(value.evidence_url || value.source_url))
    .map(([key, value]) => ({ label: key.replaceAll('_', ' '), url: value.evidence_url || value.source_url, observedAt: value.observed_at, trust: value.trust }));
  return {
    id: card.id, name: card.name, href: '/robots/' + card.manufacturer_slug + '/' + card.model_slug + (card.variant === 'base' ? '' : '?variant=' + encodeURIComponent(card.variant)),
    manufacturer: card.manufacturer_name, supplierHref: '/brands/' + card.manufacturer_slug, variant: card.variant,
    criteria, sources, blocked: criteria.some((criterion) => criterion.kind === 'hard' && criterion.status === 'fail'),
    open: criteria.filter((criterion) => criterion.status === 'unknown' || criterion.status === 'partial').length,
    price: quote(candidate, requirements, { usdToEur, today: new Date() }),
  };
}
