import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../_lib/types';
import { humanoidGuide } from './humanoid-guide';
import { humanoidHub } from './humanoidhub';
import { robotPriceIndex } from './robotpriceindex';
import { robothub } from './robothub';
import { unitreeShop } from './unitree-shop';

function snap(file: string, url: string): Snapshot {
  const body = readFileSync(join(process.cwd(), 'tests', 'fixtures', file), 'utf8');
  return {
    url,
    finalUrl: url,
    status: 200,
    contentType: null,
    etag: null,
    lastModified: null,
    fetchedAt: '2026-09-08T12:00:00.000Z',
    body,
    sha256: 'x',
    bytes: body.length,
    fromCache: true,
  };
}

describe('humanoid-guide parse', () => {
  const records = humanoidGuide.parse(snap('humanoid-guide.json', 'https://humanoid.guide/wp-json/wc/store/v1/products?page=1'), { slug: 'page-1', url: '' });

  it('keeps robots and drops reports', () => {
    expect(records.map((r) => r.subject.model_raw).sort()).toEqual(['Booster T2', 'H2 Plus']);
  });

  it('maps attributes onto canonical fields with units', () => {
    const t2 = records.find((r) => r.subject.model_raw === 'Booster T2')!;
    expect(t2.subject.manufacturer_raw).toBe('Booster Robotics');
    expect(t2.subject.form_factor_hint).toBe('humanoid');
    expect(t2.subject.website_hint).toBe('http://booster.tech/');
    const f = Object.fromEntries(t2.fields.map((x) => [x.field, x.value]));
    expect(f.height_m).toBe('140 cm');
    expect(f.weight_kg).toBe('43 kg');
    expect(f.dof_total).toBe('31');
    expect(f.max_speed_ms).toBe('7 km/h');
    expect(f.payload_kg).toBe('10 kg');
    expect(f.finger_count).toBe(5);
    expect(f.ip_rating).toBeUndefined(); // N/A is not a value
    expect(t2.prices[0]).toMatchObject({ amount: 45000, currency: 'USD', tier: 3, region: 'GLOBAL' });
  });
});

describe('robothub parse', () => {
  const url = 'https://www.robothub.app/en/robots/unitree-g1';
  const [rec] = robothub.parse(snap('robothub-unitree-g1.html', url), { slug: 'unitree-g1', url });

  it('reads the schema.org product block', () => {
    expect(rec.subject).toMatchObject({ manufacturer_raw: 'Unitree Robotics', model_raw: 'Unitree G1', form_factor_hint: 'humanoid', status_hint: 'shipping' });
    const f = Object.fromEntries(rec.fields.map((x) => [x.field, x]));
    expect(f.height_m.value).toBe('127 cm');
    expect(f.weight_kg.value).toBe('35 kg');
    expect(f.dof_total.value).toBe('23-43');
    expect(f.max_speed_ms.value).toBe('7.2 km/h');
    expect(f.payload_kg).toMatchObject({ value: '6 kg', qualifier: 'rated_dual' });
    expect(f.has_lidar.value).toBe(true);
    expect(rec.prices[0]).toMatchObject({ amount: 12246, currency: 'USD', tier: 3 });
  });

  it('only accepts robot URLs from the sitemap', async () => {
    const entries = await robothub.fetchIndex({
      fetch: async () =>
        ({
          body: '<urlset><url><loc>https://www.robothub.app/en/robots/unitree-g1</loc></url><url><loc>https://www.robothub.app/trap</loc></url><url><loc>https://www.robothub.app/en/companies/unitree</loc></url></urlset>',
        }) as Snapshot,
      log: () => {},
    });
    expect(entries.map((e) => e.slug)).toEqual(['unitree-g1']);
  });
});

describe('robotpriceindex parse', () => {
  const records = robotPriceIndex.parse(snap('robotpriceindex.html', 'https://robotpriceindex.com/'), { slug: 'index', url: '' });

  it('reads humanoid and quadruped tables only', () => {
    const kinds = new Set(records.map((r) => r.subject.form_factor_hint));
    expect([...kinds].sort()).toEqual(['humanoid', 'quadruped']);
    expect(records.length).toBeGreaterThan(60);
    expect(records.some((r) => /myCobot/.test(r.subject.model_raw))).toBe(false);
  });

  it('splits price ranges and maps status', () => {
    const r1 = records.find((r) => r.subject.model_raw === 'Unitree R1')!;
    expect(r1.subject).toMatchObject({ manufacturer_raw: 'Unitree Robotics', country_hint: 'China' });
    expect(r1.prices.map((p) => [p.config, p.amount])).toEqual([
      ['base', 4150],
      ['max', 5900],
    ]);
    expect(r1.availability[0].status).toBe('for_sale');
    const f = Object.fromEntries(r1.fields.map((x) => [x.field, x.value]));
    expect(f.height_m).toBe('121 cm');
    expect(f.dof_total).toBe('26');
    const go2 = records.find((r) => r.subject.model_raw === 'Unitree Go2')!;
    expect(go2.fields.find((x) => x.field === 'payload_kg')).toMatchObject({ value: '8 kg', qualifier: 'sustained' });
  });
});

describe('humanoidhub parse', () => {
  const url = 'https://www.humanoidhub.ai/robots/digit';
  const [rec] = humanoidHub.parse(snap('humanoidhub-digit.html', url), { slug: 'digit', url });

  it('reads the product block and skips unspecified quick facts', () => {
    expect(rec.subject).toMatchObject({ manufacturer_raw: 'Agility Robotics', model_raw: 'Digit', form_factor_hint: 'humanoid' });
    const f = Object.fromEntries(rec.fields.map((x) => [x.field, x.value]));
    expect(f.height_m).toBeUndefined();
    expect(f.runtime_h).toBe('4 hours');
  });
});

describe('unitree-shop parse', () => {
  it('turns the placeholder price into enterprise-only availability', () => {
    const body = JSON.stringify({
      products: [
        { id: 1, title: 'Unitree H2 Plus', handle: 'unitree-h2-plus', vendor: 'Unitree', images: [], variants: [{ id: 1, title: 'Default Title', sku: null, price: '100000.00', available: false, grams: 0 }] },
        { id: 2, title: 'Unitree Go2', handle: 'unitree-go2', vendor: 'Unitree', images: [], variants: [
          { id: 3, title: 'Go2 Pro（without controller）', sku: 'a', price: '2800.00', available: true, grams: 0 },
          { id: 4, title: 'Go2 Pro（with controller）', sku: 'b', price: '3050.00', available: true, grams: 0 },
        ] },
        { id: 3, title: 'Go2 Battery', handle: 'go2-battery', vendor: 'Unitree', images: [], variants: [{ id: 5, title: 'BT2-05', sku: null, price: '500.00', available: true, grams: 0 }] },
      ],
    });
    const records = unitreeShop.parse({ ...snap('humanoid-guide.json', ''), body }, { slug: 'products', url: '' });
    // two robots, plus one equipment record for the robot the battery names
    expect(records).toHaveLength(3);
    const gear = records.find((r) => r.fields.some((x) => x.field === 'equipment_options'))!;
    expect(gear.subject.model_raw).toBe('Go2');
    expect(gear.fields[0].value).toEqual([{ type: 'battery', name: 'Go2 Battery', maker: 'Unitree', url: 'https://shop.unitree.com/products/go2-battery', included: false }]);
    const plus = records.find((r) => r.subject.model_raw === 'Unitree H2 Plus')!;
    expect(plus.prices).toHaveLength(0);
    expect(plus.availability[0].status).toBe('enterprise_only');
    const go2 = records.find((r) => r.subject.model_raw === 'Unitree Go2')!;
    expect(go2.subject.variant_raw).toBe('Go2 Pro');
    expect(go2.prices.map((p) => [p.config, p.amount])).toEqual([
      ['base', 2800],
      ['controller', 3050],
    ]);
  });
});
