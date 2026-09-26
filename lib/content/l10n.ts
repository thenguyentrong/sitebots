import type { Locale } from './vocab';

/** A bilingual string. `de` may be empty while a record is a draft; published content is checked with missingGerman(). */
export type L10n = { en: string; de: string };

export function pick(text: L10n, locale: Locale): string {
  return locale === 'de' && text.de.trim() ? text.de : text.en;
}

function isL10n(value: unknown): value is L10n {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value as object);
  return keys.length === 2 && keys.includes('en') && keys.includes('de') && typeof (value as L10n).en === 'string' && typeof (value as L10n).de === 'string';
}

/** Dotted paths of every {en, de} pair whose German text is empty, anywhere inside `value`. */
export function missingGerman(value: unknown, path = ''): string[] {
  if (isL10n(value)) return value.de.trim() ? [] : [path || '(root)'];
  if (Array.isArray(value)) return value.flatMap((v, i) => missingGerman(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => missingGerman(v, path ? `${path}.${k}` : k));
  }
  return [];
}
