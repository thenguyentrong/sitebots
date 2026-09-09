import { AVAILABILITY_LABEL } from '@/lib/spec/display';
import type { AvailabilityCurrent, PriceCurrent, RobotCard } from '@/lib/spec/types';
import { SITE } from '@/lib/site';

/**
 * schema.org markup for a robot page.
 *
 * Only what we can stand behind: `additionalProperty` carries verified and
 * assessed values, never third-party "reported" ones, and `offers` appears
 * only when a price was read on a store or distributor page (tier ≤ 2) and is
 * not stale. No aggregateRating, ever — we have none, and inventing one is
 * how the AI-content farms got on our denylist.
 */

const SCHEMA_AVAILABILITY: Record<string, string> = {
  for_sale: 'https://schema.org/InStock',
  pre_order: 'https://schema.org/PreOrder',
  enterprise_only: 'https://schema.org/InStoreOnly',
  not_sold: 'https://schema.org/OutOfStock',
  discontinued: 'https://schema.org/Discontinued',
};

export function productJsonLd(robot: RobotCard, prices: PriceCurrent[], availability: AvailabilityCurrent[], path: string) {
  const url = `${SITE.url}${path}`;
  const props = Object.entries(robot.specs ?? {})
    .filter(([, s]) => s.trust === 'verified' || s.trust === 'assessed')
    .filter(([, s]) => typeof s.value === 'number' || typeof s.value === 'string' || typeof s.value === 'boolean')
    .slice(0, 30)
    .map(([key, s]) => ({
      '@type': 'PropertyValue',
      name: key,
      value: s.min != null && s.max != null ? `${s.min}–${s.max}` : String(s.value),
      ...(s.unit ? { unitText: s.unit } : {}),
    }));

  const fresh = prices.filter((p) => p.tier <= 2 && !p.stale);
  const offers = fresh.map((p) => {
    const a = availability.find((x) => x.region === p.region) ?? availability[0];
    return {
      '@type': 'Offer',
      price: p.amount,
      priceCurrency: p.currency,
      url,
      availability: a ? SCHEMA_AVAILABILITY[a.status] ?? undefined : undefined,
      priceValidUntil: new Date(new Date(p.observed_at).getTime() + 90 * 86_400_000).toISOString().slice(0, 10),
      eligibleRegion: p.region === 'GLOBAL' ? undefined : p.region,
      seller: { '@type': 'Organization', name: new URL(p.source_url).hostname.replace(/^www\./, '') },
    };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: robot.name,
    url,
    brand: { '@type': 'Brand', name: robot.manufacturer_name },
    category: robot.form_factor === 'humanoid' ? 'Humanoid robot' : robot.form_factor === 'quadruped' ? 'Quadruped robot' : 'Mobile manipulator',
    ...(robot.summary ? { description: robot.summary } : {}),
    ...(robot.image_url ? { image: robot.image_url } : {}),
    ...(props.length ? { additionalProperty: props } : {}),
    ...(offers.length ? { offers: offers.length === 1 ? offers[0] : offers } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: `${SITE.url}${it.path}` } : {}),
    })),
  };
}

export function availabilityLabel(status: string): string {
  return AVAILABILITY_LABEL[status] ?? status;
}
