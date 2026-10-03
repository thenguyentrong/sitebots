import { fieldDef, splitSpecKey } from './fields';
import { summarizeJson } from './parts';
import type { SpecValue } from './types';
import type { FormFactor } from './enums';

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

export { pickPayloadKey } from './payload';

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
  reported: 'Reported by a third-party source; manufacturer confirmation is not established.',
  unknown: 'No confirmed value is recorded for this field.',
};

export const PRICE_TIER_LABEL: Record<number, string> = {
  1: 'manufacturer store',
  2: 'distributor listing',
  3: 'reported estimate',
};

export const FORM_FACTOR_LABEL: Record<FormFactor, string> = {
  humanoid: 'Humanoid',
  quadruped: 'Quadruped',
  mobile_manipulator: 'Mobile manipulator',
  amr_agv: 'AMR / AGV',
  industrial_arm: 'Industrial arm',
  cobot: 'Cobot',
  dedicated_robot: 'Dedicated robot',
  integrated_cell: 'Integrated cell',
};

export const STATUS_LABEL: Record<string, string> = {
  concept: 'Concept',
  prototype: 'Prototype',
  pre_order: 'Pre-order',
  shipping: 'Available to order',
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
