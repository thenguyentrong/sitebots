import reviewData from '@/data/manufacturers/review.json';
import logoData from '@/data/manufacturers/logos.json';

export type ManufacturerStatus = 'commercial' | 'developing' | 'research' | 'inactive' | 'unverified';
export type ManufacturerReview = {
  name: string;
  status: ManufacturerStatus;
  reviewedAt: string;
  reason: string;
  website: string | null;
  canonicalSlug?: string;
  evidence: { url: string; kind: string; note: string }[];
};
export type ManufacturerLogo = { src: string; background: 'light' | 'dark'; sourceUrl: string; reviewedAt: string };
const reviews = reviewData.manufacturers as Record<string, ManufacturerReview>;
const logos = logoData as Record<string, ManufacturerLogo>;

export const manufacturerStatusLabels: Record<ManufacturerStatus, string> = {
  commercial: 'Commercial supplier',
  developing: 'In development',
  research: 'Research project',
  inactive: 'Historical / inactive',
  unverified: 'Not verified',
};

export function canonicalManufacturerSlug(slug: string): string {
  const seen = new Set<string>();
  while (reviews[slug]?.canonicalSlug && !seen.has(slug)) {
    seen.add(slug);
    slug = reviews[slug].canonicalSlug!;
  }
  return slug;
}

export function manufacturerReview(slug: string): ManufacturerReview | null {
  return reviews[canonicalManufacturerSlug(slug)] ?? null;
}

/** New scraper discoveries need an evidence review before joining the buying catalogue. */
export function isPublicManufacturer(slug: string): boolean {
  const status = manufacturerReview(slug)?.status;
  return status === 'commercial' || status === 'developing';
}

export function publicManufacturerSlugs(): string[] {
  return Object.keys(reviews).filter(isPublicManufacturer);
}

export function manufacturerAliases(slug: string): string[] {
  const canonical = canonicalManufacturerSlug(slug);
  const matches = Object.keys(reviews).filter((key) => canonicalManufacturerSlug(key) === canonical);
  return matches.length ? matches : [slug];
}

export function manufacturerLogo(slug: string): ManufacturerLogo | null {
  return logos[canonicalManufacturerSlug(slug)] ?? null;
}

export function manufacturerDisplayName(slug: string, fallback: string): string {
  return manufacturerReview(slug)?.name ?? fallback;
}
