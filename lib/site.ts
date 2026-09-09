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
  tagline: 'Which robot can work on your construction site',
  url: process.env.SITE_URL || 'http://localhost:3000',
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
