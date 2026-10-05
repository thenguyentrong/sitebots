import { siteOrigin } from './site-origin';

/**
 * Operator identity and the facts the legal pages and the crawler are built
 * from. One object, rendered everywhere, so nothing drifts.
 *
 * The site is public and German-operated, so §5 DDG applies: a reachable
 * Impressum naming the operator with a postal address. The operator fields
 * are empty until a c/o or Impressumsservice address exists — a home address
 * was not going to be published. `LEGAL_READY` gates the Impressum so it says
 * the details are missing rather than inventing a placeholder.
 */
export const SITE = {
  name: 'sitebots',
  tagline: 'Which jobs can robots do today, and where to buy them in Germany',
  url: siteOrigin(process.env.SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.NODE_ENV === 'production'),
  email: process.env.SCRAPER_CONTACT_EMAIL || '',

  // ── FILL THESE IN ────────────────────────────────────────────────────────
  operator: '',
  street: '',
  city: '',
  country: 'Deutschland',
  phone: '',
  vatId: '',
  register: '',
  // ─────────────────────────────────────────────────────────────────────────
} as const;

/** True once the Impressum has the minimum §5 DDG fields. */
export const LEGAL_READY = Boolean(SITE.operator && SITE.street && SITE.city);

/**
 * How the crawler introduces itself. The URL resolves to /bot on the live
 * site, which says what we fetch, how often, and how to opt out. Sources that
 * want to block us can, and the polite ones will write first.
 */
export function scraperUserAgent(): string {
  const contact = process.env.SCRAPER_CONTACT_URL || `${SITE.url}/bot`;
  const mail = SITE.email ? `; mailto:${SITE.email}` : '';
  return `SitebotsBot/0.1 (+${contact}${mail})`;
}
