import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

// Server-side only. Public reviews of the robots, found and checked by hand (data/market/reviews.json): the quote is on
// the page, the page is independent of the maker unless the kind says otherwise.

export const REVIEW_KINDS = ['press', 'hands_on', 'owner', 'customer', 'forum', 'study', 'maker_testimonial', 'reddit', 'github', 'ros_community', 'hacker_news', 'blog', 'video'] as const;
export const reviewSchema = z.object({
  url: z.string().url(),
  publisher: z.string().min(1),
  author: z.string().nullable(),
  date: z.string().regex(/^\d{4}(-\d{2}){0,2}$/).nullable(),
  kind: z.enum(REVIEW_KINDS),
  stance: z.enum(['positive', 'mixed', 'negative']),
  summary: z.string().min(10),
  quote: z.string().min(10).max(400),
});
export type Review = z.infer<typeof reviewSchema>;
export const reviewsFileSchema = z.record(z.string(), z.array(reviewSchema).min(1));

let cached: Record<string, (Review & { series: boolean })[]> | null = null;
function all() {
  if (cached) return cached;
  const file = reviewsFileSchema.parse(JSON.parse(readFileSync(join(process.cwd(), 'data', 'market', 'reviews.json'), 'utf8')));
  // One page can review a whole family: it sits under every variant and says so.
  const users = new Map<string, number>();
  for (const list of Object.values(file)) for (const r of list) users.set(r.url, (users.get(r.url) ?? 0) + 1);
  cached = Object.fromEntries(Object.entries(file).map(([id, list]) => [id, list.map((r) => ({ ...r, series: (users.get(r.url) ?? 0) > 1 }))]));
  return cached;
}

/** Reviews of the given market records (a catalogue page can carry several configurations). */
export function reviewsFor(ids: string[]): (Review & { series: boolean })[] {
  const byUrl = new Map<string, Review & { series: boolean }>();
  for (const id of ids) for (const r of all()[id] ?? []) if (!byUrl.has(r.url)) byUrl.set(r.url, r);
  return [...byUrl.values()];
}
export const reviewedIds = (): string[] => Object.keys(all());
