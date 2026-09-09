import { isDeniedUrl } from '@/lib/ingest/sources';

/**
 * URLs the fetch layer refuses outright.
 *
 * The denylist itself lives in data/sources.json (trust = 'deny'): the AI
 * content farms that cite each other, and the sites that told crawlers to go
 * away. The trap list is separate and hard-coded because it is not a policy
 * decision — robothub.app publishes /trap in its robots.txt as a honeypot, and
 * following it once gets the IP range blocked from a source we need.
 */
const TRAPS = [/^https?:\/\/(www\.)?robothub\.app\/trap(\/|$)/i];

export function isDenied(url: string): boolean {
  return isDeniedUrl(url);
}

export function isTrap(url: string): boolean {
  return TRAPS.some((re) => re.test(url));
}
