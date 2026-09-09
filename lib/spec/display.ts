import { fieldDef, splitSpecKey } from './fields';
import { summarizeJson } from './parts';
import type { SpecValue } from './types';

const QUALIFIER_LABELS: Record<string, string> = {
  rated: 'rated, one arm',
  rated_dual: 'rated, both arms',
  peak: 'peak, one arm',
  peak_dual: 'peak, both arms',
  sustained: 'sustained',
  instant: 'instant',
  carry_walking: 'carried while walking',
  idle: 'idle',
  walking: 'walking',
  loaded: 'loaded',
  unstated: 'basis unstated',
};

export function qualifierLabel(q: string | null | undefined): string | null {
  if (!q) return null;
  return QUALIFIER_LABELS[q] ?? q.replace(/_/g, ' ');
}

const PAYLOAD_PREFERENCE = ['rated', 'sustained', 'carry_walking', 'rated_dual', null, 'peak', 'peak_dual', 'instant'];

/**
 * The payload spec to headline: best evidence first, then the most
 * conservative measurement. A tier-3 "strength" figure must not outrank the
 * maker's rated figure just because it sorts first in the object.
 */
export function pickPayloadKey(specs: Record<string, SpecValue>): string | null {
  const keys = Object.keys(specs).filter((k) => k === 'payload_kg' || k.startsWith('payload_kg:'));
  if (!keys.length) return null;
  keys.sort((a, b) => {
    const t = specs[a].source_tier - specs[b].source_tier;
    if (t) return t;
    const qa = PAYLOAD_PREFERENCE.indexOf(a.split(':')[1] ?? null);
    const qb = PAYLOAD_PREFERENCE.indexOf(b.split(':')[1] ?? null);
    return (qa === -1 ? 99 : qa) - (qb === -1 ? 99 : qb);
  });
  return keys[0];
}

function num(n: number, decimals: number): string {
  return n.toLocaleString('en-GB', { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

/** Human-readable value for a spec cell, in the field's canonical unit. */
export function formatSpec(key: string, spec: SpecValue): string {
  const { field } = splitSpecKey(key);
  const def = fieldDef(field);
  const decimals = def?.decimals ?? 1;
  const unit = spec.unit ?? def?.unit ?? '';
  const sep = unit === '°' || unit === '°C' || unit === '%' ? '' : ' ';

  if (def?.kind === 'bool' || typeof spec.value === 'boolean') {
    return spec.value === true ? 'Yes' : spec.value === false ? 'No' : '—';
  }
  if (spec.min != null || spec.max != null) {
    if (spec.min != null && spec.max != null) {
      return spec.min === spec.max ? `${num(spec.min, decimals)}${sep}${unit}` : `${num(spec.min, decimals)}–${num(spec.max, decimals)}${sep}${unit}`.trim();
    }
    if (spec.min != null) return `≥ ${num(spec.min, decimals)}${sep}${unit}`.trim();
    return `≤ ${num(spec.max as number, decimals)}${sep}${unit}`.trim();
  }
  if (typeof spec.value === 'number') return `${num(spec.value, decimals)}${sep}${unit}`.trim();
  if (def?.kind === 'json') return field === 'deployment_evidence' && Array.isArray(spec.value) ? spec.value.map((d) => { const x = d as { site?: string; year?: number }; return `${x.site ?? ''}${x.year ? ` (${x.year})` : ''}`; }).join(', ') : summarizeJson(field, spec.value);
  if (Array.isArray(spec.value)) return spec.value.length ? spec.value.map((v) => String(v).replace(/_/g, ' ')).join(', ') : '—';
  if (spec.value && typeof spec.value === 'object') return JSON.stringify(spec.value);
  if (spec.value == null || spec.value === '') return '—';
  return String(spec.value);
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${num(amount, 0)}`;
  }
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

export const TRUST_LABEL: Record<string, string> = {
  verified: 'Verified',
  assessed: 'Assessed',
  reported: 'Reported',
  unknown: 'Unknown',
};

export const TRUST_HINT: Record<string, string> = {
  verified: 'A manufacturer-domain source states this value.',
  assessed: 'Curated by us from evidence; the note says which.',
  reported: 'Only third-party databases report this value.',
  unknown: 'Not published anywhere we could find.',
};

export const PRICE_TIER_LABEL: Record<number, string> = {
  1: 'manufacturer store',
  2: 'distributor listing',
  3: 'reported estimate',
};

export const FORM_FACTOR_LABEL: Record<string, string> = {
  humanoid: 'Humanoid',
  quadruped: 'Quadruped',
  mobile_manipulator: 'Mobile manipulator',
};

export const STATUS_LABEL: Record<string, string> = {
  concept: 'Concept',
  prototype: 'Prototype',
  pre_order: 'Pre-order',
  shipping: 'Shipping',
  discontinued: 'Discontinued',
  unknown: 'Status unknown',
};

export const AVAILABILITY_LABEL: Record<string, string> = {
  for_sale: 'For sale',
  pre_order: 'Pre-order',
  enterprise_only: 'Enterprise only',
  not_sold: 'Not sold yet',
  discontinued: 'Discontinued',
  unknown: 'Unknown',
};
