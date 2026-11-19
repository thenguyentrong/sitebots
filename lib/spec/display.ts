import { fieldDef, splitSpecKey } from './fields';
import { summarizeJson } from './parts';
import type { SpecValue } from './types';
import type { FormFactor } from './enums';
import type { Lang } from '@/lib/i18n/config';
import { LOCALE } from '@/lib/i18n/config';
import { formatDate as formatDay, formatNumber } from '@/lib/i18n/format';
import { MARKET_TEXT } from '@/lib/i18n/market';

// Every function here takes the page's language last and defaults to English, the language of the
// adviser's tools, the scripts and the tests.

export function qualifierLabel(q: string | null | undefined, lang: Lang = 'en'): string | null {
  if (!q) return null;
  return MARKET_TEXT[lang].qualifier[q] ?? q.replace(/_/g, ' ');
}

export { pickPayloadKey } from './payload';

function num(n: number, decimals: number, lang: Lang = 'en'): string {
  return formatNumber(n, lang, decimals);
}

/** Source text keeps its dashes in the data; the site shows none, so a range reads "20 to 80" and a pause a comma. */
export function plainDashes(text: string): string {
  return text.replace(/(\d)\s*[–—]\s*(?=[-+]?\d)/g, '$1 to ').replace(/\s+[–—]\s+/g, ', ').replace(/[–—]/g, '-');
}

/** Human-readable value for a spec cell, in the field's canonical unit. */
export function formatSpec(key: string, spec: SpecValue, lang: Lang = 'en'): string {
  const t = MARKET_TEXT[lang];
  const { field } = splitSpecKey(key);
  const def = fieldDef(field);
  const decimals = def?.decimals ?? 1;
  const raw = spec.unit ?? def?.unit ?? '';
  // The only unit written as a word; the others (kg, m, h, °C) read the same in German.
  const unit = lang === 'de' && raw === 'months' ? 'Monate' : raw;
  const sep = unit === '°' || unit === '°C' || unit === '%' ? '' : ' ';

  if (def?.kind === 'bool' || typeof spec.value === 'boolean') {
    return spec.value === true ? t.yes : spec.value === false ? t.no : t.notPublished;
  }
  if (spec.min != null || spec.max != null) {
    if (spec.min != null && spec.max != null) {
      return spec.min === spec.max ? `${num(spec.min, decimals, lang)}${sep}${unit}` : `${num(spec.min, decimals, lang)} ${t.to} ${num(spec.max, decimals, lang)}${sep}${unit}`.trim();
    }
    if (spec.min != null) return `≥ ${num(spec.min, decimals, lang)}${sep}${unit}`.trim();
    return `≤ ${num(spec.max as number, decimals, lang)}${sep}${unit}`.trim();
  }
  if (typeof spec.value === 'number') return `${num(spec.value, decimals, lang)}${sep}${unit}`.trim();
  if (def?.kind === 'json') return field === 'deployment_evidence' && Array.isArray(spec.value) ? spec.value.map((d) => { const x = d as { site?: string; year?: number }; return `${x.site ?? ''}${x.year ? ` (${x.year})` : ''}`; }).join(', ') : summarizeJson(field, spec.value, lang);
  if (Array.isArray(spec.value)) return spec.value.length ? spec.value.map((v) => String(v).replace(/_/g, ' ')).join(', ') : t.notPublished;
  if (spec.value && typeof spec.value === 'object') return JSON.stringify(spec.value);
  if (spec.value == null || spec.value === '') return t.notPublished;
  return String(spec.value);
}

export function formatMoney(amount: number, currency: string, lang: Lang = 'en'): string {
  try {
    return new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${num(amount, 0, lang)}`;
  }
}

export function formatDate(iso: string | Date, lang: Lang = 'en'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (lang !== 'en') return formatDay(d.toISOString(), lang, 'short');
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

export const TRUST_LABEL: Record<string, string> = MARKET_TEXT.en.trust;
export const TRUST_HINT: Record<string, string> = MARKET_TEXT.en.trustHint;
export const PRICE_TIER_LABEL: Record<number, string> = MARKET_TEXT.en.priceTier;
export const trustLabel = (trust: string, lang: Lang = 'en'): string => MARKET_TEXT[lang].trust[trust] ?? trust;
export const trustHint = (trust: string, lang: Lang = 'en'): string => MARKET_TEXT[lang].trustHint[trust] ?? '';
export const priceTierLabel = (tier: number, lang: Lang = 'en'): string | undefined => MARKET_TEXT[lang].priceTier[tier];

export const FORM_FACTOR_LABEL: Record<FormFactor, string> = MARKET_TEXT.en.formFactor as Record<FormFactor, string>;
export const formFactorLabel = (form: string, lang: Lang = 'en'): string => MARKET_TEXT[lang].formFactor[form] ?? form;

const { pilot_only: _pilotOnly, ...catalogueStatus } = MARKET_TEXT.en.lifecycle;
export const STATUS_LABEL: Record<string, string> = catalogueStatus;
/** A catalogue status (shipping, prototype ...) or a market lifecycle in the page's language. */
export const statusLabel = (status: string, lang: Lang = 'en'): string => MARKET_TEXT[lang].lifecycle[status] ?? status;

export const AVAILABILITY_LABEL: Record<string, string> = MARKET_TEXT.en.availability;
export const availabilityLabel = (status: string, lang: Lang = 'en'): string => MARKET_TEXT[lang].availability[status] ?? status;
