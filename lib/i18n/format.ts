import { LOCALE, type Lang } from './config';

// Numbers, money, dates and country names in the page's language: 2,580 and 14 June 2024 on English
// pages, 2.580 and 14. Juni 2024 on German ones. Client-safe.

const numbers = new Map<string, Intl.NumberFormat>();

/** A number with grouping, up to `digits` decimals (and at least `min`). */
export function formatNumber(value: number, lang: Lang, digits = 0, min = 0): string {
  const key = lang + digits + ':' + min;
  let format = numbers.get(key);
  if (!format) numbers.set(key, format = new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: digits, minimumFractionDigits: min }));
  return format.format(value);
}

/** Euro the way each language writes it: €23,000 in English, 23.000 € in German. */
export function formatEur(value: number, lang: Lang, digits = 0): string {
  const amount = formatNumber(value, lang, digits, digits);
  return lang === 'de' ? amount + ' €' : '€' + amount;
}

/** Another currency, with its code: USD 16,000 or 16.000 USD. */
export function formatMoney(value: number, currency: string, lang: Lang): string {
  if (currency === 'EUR') return formatEur(value, lang);
  const amount = formatNumber(value, lang);
  return lang === 'de' ? amount + ' ' + currency : currency + ' ' + amount;
}

/** A percentage with one decimal where it has one: 27.5% or 27,5 %. */
export function formatPercent(value: number, lang: Lang, digits = 1): string {
  const text = formatNumber(value, lang, digits, digits);
  return lang === 'de' ? text + ' %' : text + '%';
}

/** An ISO date as a day: 19 November 2026 / 19. November 2026. `month` 'short' gives 19 Nov 2026. */
export function formatDate(iso: string, lang: Lang, month: 'long' | 'short' = 'long'): string {
  const date = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' }).format(date);
}

const regions = new Map<Lang, Intl.DisplayNames>();
/** A country's name from its ISO code, in the page's language. */
export function regionName(code: string, lang: Lang): string {
  let names = regions.get(lang);
  if (!names) regions.set(lang, names = new Intl.DisplayNames([lang], { type: 'region' }));
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Rewrites a figure printed the English way ("2.58", "200,000+", "−30%") for a German page ("2,58",
 * "200.000+", "−30 %"). Used for values stored as text in the data files, which are written in English.
 */
export function localiseFigure(text: string, lang: Lang): string {
  if (lang === 'en') return text;
  return text.replace(/\d[\d,]*(?:\.\d+)?/g, (digits) => digits.replace(/[.,]/g, (mark) => mark === ',' ? '.' : ',')).replace(/(\d)%/g, '$1 %');
}
