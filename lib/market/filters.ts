import type { RobotCardData } from './cards';
import { DE_STATUS, type GermanyStatus } from './schema';

// Buyer filters on the robots page. They live in the URL, so a filtered list is a link to send on.

export const MAX_PRICES = [20000, 50000, 100000, 200000] as const;
export const MIN_PAYLOADS = [3, 5, 10, 20] as const;
export const SELLER_SCOPES = ['de', 'eu'] as const;
export const SORTS = ['price_asc', 'price_desc'] as const;
type SellerScope = (typeof SELLER_SCOPES)[number];
type Sort = (typeof SORTS)[number];

const EU = new Set(['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK']);
/** German VAT. Sellers publish net or gross prices; a price limit has to compare one basis. */
const VAT = 1.19;

export type Filters = { maxPrice: number | null; status: GermanyStatus | null; seller: SellerScope | null; minPayload: number | null; hands: boolean; sort: Sort | null };
export type FilterParams = Partial<Record<'max' | 'status' | 'seller' | 'payload' | 'hands' | 'sort', string>>;

const pick = <T extends string | number>(list: readonly T[], raw: string | undefined): T | null =>
  list.find((item) => String(item) === raw) ?? null;

export function readFilters(sp: FilterParams): Filters {
  return {
    maxPrice: pick(MAX_PRICES, sp.max),
    status: pick(DE_STATUS.filter((status) => status !== 'not_sold'), sp.status),
    seller: pick(SELLER_SCOPES, sp.seller),
    minPayload: pick(MIN_PAYLOADS, sp.payload),
    hands: sp.hands === '1',
    sort: pick(SORTS, sp.sort),
  };
}

/** Back to URL parameters, for links that keep the filters (type tabs, search). */
export function filterParams(f: Filters): FilterParams {
  return {
    max: f.maxPrice ? String(f.maxPrice) : undefined, status: f.status ?? undefined, seller: f.seller ?? undefined,
    payload: f.minPayload ? String(f.minPayload) : undefined, hands: f.hands ? '1' : undefined, sort: f.sort ?? undefined,
  };
}

/** Sorting alone does not narrow the list. */
export const narrows = (f: Filters) => Boolean(f.maxPrice || f.status || f.seller || f.minPayload || f.hands);
export const isFiltered = (f: Filters) => narrows(f) || f.sort !== null;

/** The published German price incl. VAT. An unknown basis counts as stated: adding VAT to a price
 *  that may already include it would hide robots the buyer can afford. */
export function grossEur(card: Pick<RobotCardData, 'germany'>): number | null {
  const price = card.germany.price;
  if (!price) return null;
  return price.basis === 'net' ? Math.round(price.amount * VAT) : price.amount;
}

export function matchesFilters(card: RobotCardData, f: Filters, { ignorePrice = false } = {}): boolean {
  if (f.status && card.germany.status !== f.status) return false;
  if (f.maxPrice && !ignorePrice) {
    const gross = grossEur(card);
    if (gross === null || gross > f.maxPrice) return false;
  }
  if (f.seller === 'de' && !card.germany.sellers.some((seller) => seller.country === 'DE')) return false;
  if (f.seller === 'eu' && !card.germany.sellers.some((seller) => EU.has(seller.country))) return false;
  // An unpublished payload is no pass: the buyer asked for robots known to lift that much.
  if (f.minPayload && (card.armPayloadKg === null || card.armPayloadKg < f.minPayload)) return false;
  if (f.hands && card.handsIncluded !== true) return false;
  return true;
}

/** Cheapest or dearest first; robots without a published price go last either way. */
export function byPrice(sort: Sort) {
  return (a: Pick<RobotCardData, 'germany'>, b: Pick<RobotCardData, 'germany'>) => {
    const pa = grossEur(a), pb = grossEur(b);
    if (pa === null || pb === null) return (pa === null ? 1 : 0) - (pb === null ? 1 : 0);
    return sort === 'price_asc' ? pa - pb : pb - pa;
  };
}
