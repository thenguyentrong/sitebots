import data from '@/data/purchasing/contacts.json';
import type { PriceCurrent } from '@/lib/spec/types';

export type SalesContact = {
  name: string; country: string; contactUrl: string; email: string; phone: string; phoneLabel: string;
  sourceUrl: string; reviewedAt: string; verification: string;
};
export type BuyingRoute = {
  seller: string; name: string; url: string; region: string; configurations: string[];
  contact: SalesContact | null; checkedAt: string; indexed: boolean; eligibility?: string; delivery?: string;
};
const contacts = data.contacts as Record<string, SalesContact>;
const makerContacts = data.manufacturerContacts as Record<string, string>;

export function manufacturerSalesContact(slug: string): SalesContact | null {
  return contacts[makerContacts[slug]] ?? null;
}
function host(url: string): string { return new URL(url).hostname.replace(/^www\./, ''); }

/** A price estimate or a global listing does not establish a German purchase route. */
export function germanyBuyingRoutes(manufacturer: string, model: string, variant: string, prices: PriceCurrent[]): BuyingRoute[] {
  const routes = new Map<string, BuyingRoute>();
  for (const p of prices) {
    if (p.tier > 2 || !p.direct || !['DE', 'EU'].includes(p.region)) continue;
    const seller = host(p.source_url);
    const existing = routes.get(p.source_url);
    if (existing) { if (!existing.configurations.includes(p.config)) existing.configurations.push(p.config); continue; }
    const contact = contacts[seller] ?? null;
    routes.set(p.source_url, { seller, name: contact?.name ?? seller, url: p.source_url, region: p.region, configurations: [p.config], contact, checkedAt: p.observed_at, indexed: false });
  }
  for (const listing of data.listings) {
    if (listing.robot !== `${manufacturer}/${model}` || listing.variant !== variant) continue;
    const contact = contacts[listing.seller] ?? null;
    routes.set(listing.productUrl, { seller: listing.seller, name: contact?.name ?? listing.seller, url: listing.productUrl, region: listing.region, configurations: [listing.configuration], contact, checkedAt: listing.reviewedAt, indexed: listing.verification === 'indexed', eligibility: listing.eligibility, delivery: listing.delivery });
  }
  return [...routes.values()].sort((a,b) => (a.region === 'DE' ? 0 : 1) - (b.region === 'DE' ? 0 : 1));
}
