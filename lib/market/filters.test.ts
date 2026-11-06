import { describe, expect, it } from 'vitest';
import type { RobotCardData } from './cards';
import { byPrice, filterParams, grossEur, matchesFilters, readFilters } from './filters';

const card = (patch: { price?: RobotCardData['germany']['price']; status?: RobotCardData['germany']['status']; countries?: string[] } & Partial<Pick<RobotCardData, 'armPayloadKg' | 'handsIncluded'>> = {}) => ({
  id: 'r', name: 'R', maker: 'M', makerCountry: 'CN', robotType: 'humanoid', summary: '', officialUrl: null, body: '', picture: null, lifecycle: 'shipping',
  germany: {
    status: patch.status ?? 'buy_now', note: '', price: patch.price === undefined ? { amount: 50000, basis: 'gross', kind: 'list' } : patch.price, priceOther: null, leadTime: null, checkedAt: '2026-10-21',
    sellers: (patch.countries ?? ['DE']).map((country) => ({ name: 's', country, role: 'reseller', productUrl: null, contactUrl: null, email: null, phone: null, priceEur: null, priceBasis: null })),
  },
  hands: 'optional', arms: 2, handsIncluded: patch.handsIncluded ?? null, armPayloadKg: patch.armPayloadKg ?? null, carryPayloadKg: null, runtimeH: null,
  ipRating: null, stairs: null, outdoor: null, roughGround: null, specs: [], evidenceCount: 0, jobKey: null, href: '/r',
}) satisfies RobotCardData;

describe('robot filters', () => {
  it('reads only the offered values from the URL', () => {
    const f = readFilters({ max: '50000', status: 'not_sold', seller: 'eu', payload: '7', hands: '1', sort: 'price_asc' });
    expect(f).toEqual({ maxPrice: 50000, status: null, seller: 'eu', minPayload: null, hands: true, sort: 'price_asc' });
    expect(readFilters(filterParams(f))).toEqual(f);
  });
  it('compares net prices with VAT added', () => {
    expect(grossEur(card({ price: { amount: 45000, basis: 'net', kind: 'from' } }))).toBe(53550);
    const f = readFilters({ max: '50000' });
    expect(matchesFilters(card({ price: { amount: 45000, basis: 'net', kind: 'from' } }), f)).toBe(false);
    expect(matchesFilters(card({ price: { amount: 49980, basis: 'gross', kind: 'list' } }), f)).toBe(true);
  });
  it('leaves robots without a published price out of a price limit', () => {
    expect(matchesFilters(card({ price: null }), readFilters({ max: '200000' }))).toBe(false);
    expect(matchesFilters(card({ price: null }), readFilters({ max: '200000' }), { ignorePrice: true })).toBe(true);
  });
  it('tells a German seller from one elsewhere in the EU', () => {
    expect(matchesFilters(card({ countries: ['FR'] }), readFilters({ seller: 'de' }))).toBe(false);
    expect(matchesFilters(card({ countries: ['FR'] }), readFilters({ seller: 'eu' }))).toBe(true);
    expect(matchesFilters(card({ countries: ['CA', 'CN'] }), readFilters({ seller: 'eu' }))).toBe(false);
  });
  it('needs a stated payload and hands that come with the robot', () => {
    expect(matchesFilters(card({ armPayloadKg: null }), readFilters({ payload: '5' }))).toBe(false);
    expect(matchesFilters(card({ armPayloadKg: 7 }), readFilters({ payload: '5' }))).toBe(true);
    expect(matchesFilters(card({ handsIncluded: null }), readFilters({ hands: '1' }))).toBe(false);
  });
  it('sorts by price with unpriced robots last', () => {
    const cheap = card({ price: { amount: 20000, basis: 'gross', kind: 'list' } });
    const dear = card({ price: { amount: 80000, basis: 'net', kind: 'list' } });
    const none = card({ price: null });
    expect([dear, none, cheap].sort(byPrice('price_asc'))).toEqual([cheap, dear, none]);
    expect([cheap, none, dear].sort(byPrice('price_desc'))).toEqual([dear, cheap, none]);
  });
});
