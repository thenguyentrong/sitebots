// The site speaks English and German, one URL per language. English keeps the bare paths it always had
// (/robots), German lives under /de (/de/robots). The CDN caches every catalogue page by its URL for a
// week, so the language must be in the URL: a page whose HTML changed with a cookie or with
// Accept-Language would hand one visitor's language to everyone after them.
//
// Edge-safe and client-safe: proxy.ts, server components and the browser all import this file.

export const LANGS = ['en', 'de'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

/** Set only by the EN | DE switch. It records a choice, so it beats the browser's language. */
export const LANG_COOKIE = 'sitebots-lang';
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The locale for Intl formatting and for <html lang>, Open Graph and hreflang. */
export const LOCALE: Record<Lang, string> = { en: 'en-GB', de: 'de-DE' };
export const OG_LOCALE: Record<Lang, string> = { en: 'en_GB', de: 'de_DE' };

export const isLang = (value: unknown): value is Lang => value === 'en' || value === 'de';

/** Paths that never carry a language: route handlers, the admin pages and files. */
const UNLOCALISED = /^\/(?:api|admin|_next|_vercel)(?:\/|$)/;
const FILE = /\/[^/]*\.[a-z0-9]+$/i;

/** True for an internal page path the language prefix belongs on. */
export function isLocalisable(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !UNLOCALISED.test(path) && !FILE.test(path.split(/[?#]/)[0]);
}

/**
 * Splits a pathname into its language and the path without the prefix. /en/... counts as English too:
 * it is the internal address the proxy rewrites English pages to, and a server render may still see it.
 */
export function splitLang(pathname: string): { lang: Lang; path: string; prefixed: boolean } {
  const match = /^\/(en|de)(?=\/|$)/.exec(pathname);
  if (!match) return { lang: DEFAULT_LANG, path: pathname || '/', prefixed: false };
  return { lang: match[1] as Lang, path: pathname.slice(match[0].length) || '/', prefixed: true };
}

/**
 * The address of a page in a language: '/robots?type=humanoid#list' → '/de/robots?type=humanoid#list'.
 * English is the bare path. An address that already has a prefix is moved to the asked language, and
 * anything that is not a page (an API route, a file, another site) comes back unchanged.
 */
export function localePath(href: string, lang: Lang): string {
  if (!isLocalisable(href)) return href;
  const cut = href.search(/[?#]/);
  const pathname = cut < 0 ? href : href.slice(0, cut);
  const rest = cut < 0 ? '' : href.slice(cut);
  const { path } = splitLang(pathname);
  if (lang === DEFAULT_LANG) return path + rest;
  return '/' + lang + (path === '/' ? '' : path) + rest;
}

/**
 * The language a browser asks for first, of the two the site speaks. Entries are taken by their q value,
 * the first that is German or English wins, and a browser that names neither (or a crawler that sends
 * nothing) gets English.
 */
export function preferredLang(acceptLanguage: string | null | undefined): Lang {
  if (!acceptLanguage) return DEFAULT_LANG;
  const ranked = acceptLanguage.split(',').map((part, index) => {
    const [tag, ...params] = part.trim().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const weight = q ? Number(q.slice(2)) : 1;
    return { tag: tag.trim().toLowerCase(), weight: Number.isFinite(weight) ? weight : 0, index };
  }).filter((entry) => entry.tag && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { tag } of ranked) {
    const primary = tag.split('-')[0];
    if (isLang(primary)) return primary;
  }
  return DEFAULT_LANG;
}

/**
 * Where an unprefixed page request goes. A choice made with the switch (the cookie) wins; without one the
 * browser's language decides. Only ever asked for unprefixed paths: a /de link always stays German.
 */
export function chooseLang({ cookie, acceptLanguage }: { cookie?: string | null; acceptLanguage?: string | null }): Lang {
  if (isLang(cookie)) return cookie;
  return preferredLang(acceptLanguage);
}

/**
 * The lang attribute for free text from the robot records (summaries, notes, evidence, quotes), which is
 * written in English for now: on a German page it tells screen readers and translation tools that this
 * block is English. On an English page it adds nothing, so it is left off.
 */
export const recordLang = (lang: Lang): 'en' | undefined => (lang === 'en' ? undefined : 'en');
