import { expect, it } from 'vitest';
import { productJsonLd } from './jsonld';
import type { AvailabilityCurrent, PriceCurrent, RobotCard } from './spec/types';
const robot = { name: 'Robot', manufacturer_name: 'Maker', specs: {}, form_factor: 'quadruped' } as RobotCard;
const price = { amount: 100, currency: 'EUR', region: 'DE', tier: 2, direct: true, stale: false, observed_at: new Date().toISOString(), source_url: 'https://seller.example/robot' } as PriceCurrent;
const availability = { region: 'DE', status: 'for_sale', source_url: price.source_url, source_kind: 'distributor', source_tier: 2, observed_at: price.observed_at, in_stock: null } as AvailabilityCurrent;
it('only exports stock confirmed by the same seller in the same market', () => {
  const offer = (a: AvailabilityCurrent) => productJsonLd(robot, [price], [a], '/robot').offers;
  expect(offer(availability)).not.toHaveProperty('availability', 'https://schema.org/InStock');
  expect(offer({ ...availability, in_stock: true })).toHaveProperty('availability', 'https://schema.org/InStock');
  expect(offer({ ...availability, in_stock: true, region: 'US' })).not.toHaveProperty('availability', 'https://schema.org/InStock');
  expect(offer({ ...availability, in_stock: true, source_tier: 3 })).not.toHaveProperty('availability', 'https://schema.org/InStock');
  expect(productJsonLd(robot, [{ ...price, direct: false }], [availability], '/robot')).not.toHaveProperty('offers');
});
