import type { Specs, SpecValue } from './types';

const PREFERENCE = ['rated', 'sustained', 'carry_walking', 'rated_dual', '', 'peak', 'peak_dual', 'instant'];
const WORKING = new Set(['rated', 'sustained', 'carry_walking', 'rated_dual']);

/** A published lower bound; an upper-only range cannot establish a working load. */
export function publishedLowerBound(spec: SpecValue | undefined): number | null {
  if (!spec) return null;
  if (spec.min != null) return Number.isFinite(spec.min) ? spec.min : null;
  if (spec.max != null) return null;
  return typeof spec.value === 'number' && Number.isFinite(spec.value) ? spec.value : null;
}

/** One source and measurement basis for headlines, projection and matching. */
export function pickPayloadKey(specs: Specs): string | null {
  const keys = Object.keys(specs).filter((key) => (key === 'payload_kg' || key.startsWith('payload_kg:')) &&
    (publishedLowerBound(specs[key]) !== null || (specs[key].max != null && Number.isFinite(specs[key].max))));
  keys.sort((a, b) => {
    const tier = specs[a].source_tier - specs[b].source_tier;
    if (tier) return tier;
    const rank = (key: string) => {
      const index = PREFERENCE.indexOf(key.split(':')[1] ?? '');
      return index < 0 ? PREFERENCE.length : index;
    };
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  return keys[0] ?? null;
}

export type PayloadChoice = {
  rated: number | null;
  peak: number | null;
  conservative: number | null;
  key: string | null;
  /** The selected claim does not establish a working load; no numeric estimate is made. */
  estimated: boolean;
};

export function conservativePayload(specs: Specs): PayloadChoice {
  const key = pickPayloadKey(specs);
  const working = key !== null && WORKING.has(key.split(':')[1] ?? '');
  return {
    rated: publishedLowerBound(specs['payload_kg:rated']),
    peak: publishedLowerBound(specs['payload_kg:peak']),
    conservative: working ? publishedLowerBound(specs[key!]) : null,
    key,
    estimated: key !== null && !working,
  };
}
