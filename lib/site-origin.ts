const PUBLIC_ORIGIN = 'https://sitebots.vercel.app';

/** Deployment metadata must never tell crawlers that localhost is the public site. */
export function siteOrigin(siteUrl?: string, vercelProductionUrl?: string, production = false): string {
  for (const value of [siteUrl, vercelProductionUrl ? 'https://' + vercelProductionUrl : undefined]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue;
      const local = url.hostname === 'localhost' || url.hostname === '[::1]' || url.hostname.startsWith('127.') || url.hostname === '0.0.0.0' || url.hostname.endsWith('.localhost');
      if (production && (local || url.protocol !== 'https:')) continue;
      return url.origin;
    } catch { /* Invalid optional configuration falls back to the known public origin. */ }
  }
  return production ? PUBLIC_ORIGIN : 'http://localhost:3000';
}
