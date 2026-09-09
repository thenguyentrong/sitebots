import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RawField, Snapshot } from '../_lib/types';
import { generationRobots } from './dist/generation-robots';
import { leadTime, openelab } from './dist/openelab';
import { euro, quadrupedDe } from './dist/quadruped-de';
import { bostonDynamics } from './mfr/boston-dynamics';
import { deepRobotics } from './mfr/deep-robotics';
import { onex } from './mfr/onex';
import { pal } from './mfr/pal';
import { unitree } from './mfr/unitree';

function snap(file: string, url: string): Snapshot {
  const body = readFileSync(join(process.cwd(), 'tests', 'fixtures', file), 'utf8');
  return { url, finalUrl: url, status: 200, contentType: null, etag: null, lastModified: null, fetchedAt: '2026-09-08T12:00:00.000Z', body, sha256: 'x', bytes: body.length, fromCache: true };
}

const byField = (fields: RawField[]) => Object.fromEntries(fields.map((x) => [x.qualifier ? `${x.field}:${x.qualifier}` : x.field, x.value]));

describe('unitree manufacturer pages', () => {
  it('splits the G1 columns into base and EDU and reads the price row', () => {
    const url = 'https://www.unitree.com/g1';
    const recs = unitree.parse(snap('unitree-g1.html', url), { slug: 'g1', url });
    expect(recs.map((r) => r.subject.variant_raw)).toEqual(['G1', 'G1 EDU']);
    const base = byField(recs[0].fields);
    expect(base.height_m).toBe('1320 mm');
    expect(base.weight_kg).toBe('35 kg');
    expect(base.dof_total).toBe('23');
    expect(base.dof_legs).toBe(12);
    expect(base.dof_arms).toBe(10);
    expect(base['payload_kg:rated']).toBe('2 kg');
    expect(base['runtime_h:unstated']).toBe('2 h');
    expect(base.hot_swap).toBe(true);
    expect(base.warranty_months).toBe('8 months');
    expect(recs[0].prices[0]).toMatchObject({ amount: 13500, currency: 'USD', tier: 1 });
    const edu = byField(recs[1].fields);
    expect(edu.dof_total).toBe('23–43');
    expect(edu['payload_kg:rated']).toBe('3 kg');
    expect(recs[1].prices).toHaveLength(0);
    expect(recs[1].availability[0].status).toBe('enterprise_only');
  });

  it('reads the Go2 trims from the versions header', () => {
    const url = 'https://www.unitree.com/go2';
    const recs = unitree.parse(snap('unitree-go2.html', url), { slug: 'go2', url });
    expect(recs.map((r) => r.subject.variant_raw)).toEqual(['AIR', 'PRO', 'X', 'EDU']);
    const air = byField(recs[0].fields);
    expect(air.height_m).toBe('40 cm');
    expect(air.weight_kg).toBe('15 kg');
    expect(air['payload_kg:sustained']).toBe('7 kg');
    expect(air['payload_kg:instant']).toBe('10 kg');
    expect(air.max_speed_ms).toBe('2.5 m/s');
    expect(air.step_height_m).toBe('15 cm');
    expect(air.max_slope_deg).toBe('30 °');
    const pro = byField(recs[1].fields);
    expect(pro.max_speed_ms).toBe('3.5 m/s');
    expect(pro.max_slope_deg).toBe('40 °');
  });

  it('reads the B2 single-column list including IP67 and temperature', () => {
    const url = 'https://www.unitree.com/b2';
    const [b2] = unitree.parse(snap('unitree-b2.html', url), { slug: 'b2', url });
    expect(b2.subject.model_raw).toBe('Unitree B2');
    const f = byField(b2.fields);
    expect(f.height_m).toBe('645 mm');
    expect(f.weight_kg).toBe('60 kg');
    expect(f.battery_wh).toBe('2250 Wh');
    expect(f['runtime_h:unstated']).toBe('4–6 h');
    expect(f['payload_kg:instant']).toBe('120 kg');
    expect(f['payload_kg:carry_walking']).toBe('40 kg');
    expect(f.step_height_m).toBe('20–25 cm');
    expect(f.stair_capable).toBe(true);
    expect(f.operating_temp_c).toBe('-20–55 °C');
    expect(f.max_slope_deg).toBe('45 °');
    expect(f.max_speed_ms).toBe('6 m/s');
    expect(f.ip_rating).toBe('IP67');
    expect(f.has_lidar).toBe(true);
  });

  it('reads the H1 page as two models', () => {
    const url = 'https://www.unitree.com/h1';
    const recs = unitree.parse(snap('unitree-h1.html', url), { slug: 'h1', url });
    expect(recs.map((r) => r.subject.model_raw)).toEqual(['Unitree H1', 'Unitree H1-2']);
    expect(byField(recs[0].fields).weight_kg).toBe('47 kg');
    expect(byField(recs[1].fields).weight_kg).toBe('70 kg');
  });
});

describe('other manufacturer pages', () => {
  it('Boston Dynamics Spot list items', () => {
    const url = 'https://bostondynamics.com/products/spot/';
    const [spot] = bostonDynamics.parse(snap('bd-spot.html', url), { slug: 'spot', url });
    const f = byField(spot.fields);
    expect(f.weight_kg).toBe('33.8 kg');
    expect(f['payload_kg:sustained']).toBe('14 kg');
    expect(f.max_speed_ms).toBe('1.6 m/s');
    expect(f.battery_wh).toBe('564 Wh');
    expect(f['runtime_h:unstated']).toBe('90 min');
    expect(f.charge_time_h).toBe('60 min');
    expect(f.operating_temp_c).toBe('-20–55 °C');
    expect(f.ip_rating).toBe('IP54');
    expect(f.max_slope_deg).toBe('30 °');
    expect(f.step_height_m).toBe('300 mm');
    expect(f.height_m).toBe('610 mm');
  });

  it('Deep Robotics X30 and X30 Pro blocks', () => {
    const url = 'https://www.deeprobotics.cn/en/index/product3.html';
    const recs = deepRobotics.parse(snap('deep-x30.html', url), { slug: 'x30', url });
    expect(recs.map((r) => r.subject.model_raw)).toEqual(['X30', 'X30 Pro']);
    const f = byField(recs[0].fields);
    expect(f.height_m).toBe('470 mm');
    expect(f.weight_kg).toBe('56 kg');
    expect(f.max_speed_ms).toBe('4 m/s');
    expect(f.max_slope_deg).toBe('45 °');
    expect(f.step_height_m).toBe('20 cm');
    expect(f.ip_rating).toBe('IP67');
    expect(f.operating_temp_c).toBe('-20–55 °C');
    expect(f['runtime_h:unstated']).toBe('2.5–4 h');
    expect(byField(recs[1].fields).weight_kg).toBe('59 kg');
  });

  it('1X NEO sections, imperial units and the body IP rating', () => {
    const url = 'https://www.1x.tech/neo';
    const [neo] = onex.parse(snap('1x-neo.html', url), { slug: 'neo', url });
    const f = byField(neo.fields);
    expect(f.height_m).toBe('1.676 m'); // 5’6” read as feet and inches
    expect(f.weight_kg).toBe('66 lb');
    expect(f['payload_kg:instant']).toBe('154 lb');
    expect(f['payload_kg:carry_walking']).toBe('55 lb');
    expect(f['payload_kg:rated']).toBe('18 lb');
    expect(f.dof_hands).toBe(44);
    expect(f.dof_arms).toBe(14);
    expect(f.dof_legs).toBe(12);
    expect(f.max_speed_ms).toBe('6.2 m/s');
    expect(f.walk_speed_ms).toBe('1.4 m/s');
    expect(f.battery_wh).toBe('842 Wh');
    expect(f['runtime_h:unstated']).toBe('4 h');
    expect(f.ip_rating).toBe('IP44');
    expect(f.noise_db).toBe('22 dB');
    expect(f.compute_tops).toBe('2070');
    expect(neo.availability[0].status).toBe('pre_order');
  });

  it('PAL TALOS table with walking and standby runtime', () => {
    const url = 'https://pal-robotics.com/robot/talos/';
    const [talos] = pal.parse(snap('pal-talos.html', url), { slug: 'talos', url });
    const f = byField(talos.fields);
    expect(f.height_m).toBe('175 cm');
    expect(f.weight_kg).toBe('95 kg');
    expect(f['payload_kg:rated']).toBe('6 kg');
    expect(f['runtime_h:walking']).toBe('1.5 h');
    expect(f['runtime_h:idle']).toBe('3 h');
  });
});

describe('distributors', () => {
  it('quadruped.de: net EUR price plus versions with surcharges, EDU as its own variant', () => {
    expect(euro('from 23.000,00 € excl. 19% VAT')).toBe(23000);
    const url = 'https://www.quadruped.de/Unitree-G1_1';
    const recs = quadrupedDe.parse(snap('quadruped-g1.html', url), { slug: 'Unitree-G1_1', url });
    const base = recs.find((r) => !r.subject.variant_raw)!;
    const edu = recs.find((r) => r.subject.variant_raw === 'EDU')!;
    expect(base.subject.model_raw).toBe('Unitree G1');
    expect(base.prices[0]).toMatchObject({ amount: 23000, currency: 'EUR', region: 'DE', tier: 2, includes_vat: false, config: 'g1-basic' });
    expect(edu.prices.some((p) => p.config === 'edu-u1' && p.amount === 31500)).toBe(true);
  });

  it('openelab: Shopify product JSON with the delivery time from the title', () => {
    expect(leadTime('Unitree G1 Humanoid Robot (Delivery time: two months)')).toEqual({ days: 60, text: 'Delivery time: two months' });
    const url = 'https://openelab.io/products/unitree-g1-humanoid-robot.json';
    const [rec] = openelab.parse(snap('openelab-g1.json', url), { slug: 'unitree-g1-humanoid-robot', url });
    expect(rec.subject).toMatchObject({ manufacturer_raw: 'Unitree', model_raw: 'Unitree G1 Humanoid Robot' });
    expect(rec.prices[0]).toMatchObject({ amount: 25500, currency: 'USD', tier: 2, region: 'GLOBAL' });
    expect(rec.availability[0]).toMatchObject({ lead_time_days_max: 60 });
  });

  it('generation robots: base net price and versions in the note', () => {
    const url = 'https://www.generationrobots.com/en/404241-g1-humanoid-robot-2105.html';
    const [rec] = generationRobots.parse(snap('genrob-g1.html', url), { slug: 'g1', url });
    expect(rec.subject).toMatchObject({ manufacturer_raw: 'Unitree', model_raw: 'Unitree G1' });
    expect(rec.prices[0]).toMatchObject({ amount: 22500, currency: 'EUR', region: 'EU', tier: 2, includes_vat: false });
    expect(rec.prices[0].note).toContain('EDU STANDARD');
  });
});
