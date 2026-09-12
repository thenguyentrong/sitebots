const SKIP_PATH = /\/(news|blog|press|media|posts?|articles?|careers|jobs|case[-_]?stud|events?|support|docs?|legal|privacy|terms|about|contact|investors?|tag|category|wp-content|feed)(\/|$|\.)/i;

export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/([a-z])([0-9])/g, '$1 $2').replace(/([0-9])([a-z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 0 && !['the', 'robot', 'robotics', 'inc', 'ltd', 'co', 'gmbh', 'technologies', 'series', 'humanoid'].includes(t));
}

export function scorePath(url: string, modelTok: string[], site: string): number {
  let path: string;
  try {
    const u = new URL(url);
    if (u.host.replace(/^www\./, '') !== new URL(site).host.replace(/^www\./, '')) return 0;
    path = decodeURIComponent(u.pathname).toLowerCase();
  } catch {
    return 0;
  }
  if (SKIP_PATH.test(path)) return 0;
  // An extra model number is another generation (Apollo 2, G1 2), not a spelling variant.
  const digits=tokens(path).filter(t=>/^\d+$/.test(t));
  if(digits.some(t=>!modelTok.includes(t))) return 0;
  const hay = ` ${tokens(path).join(' ')} `;
  if (!modelTok.every((t) => hay.includes(` ${t} `))) return 0;
  return 10 - Math.min(6, path.split('/').filter(Boolean).length) + (/(product|robot)s?\//.test(path) ? 1 : 0);
}
