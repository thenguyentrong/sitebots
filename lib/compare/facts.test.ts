import { describe, expect, it } from 'vitest';
import { FACT_ROWS, KEY_FACT_KEYS, catalogueFacts, inUnit, marketFacts, mergeFacts, visibleRows, type Facts } from './facts';
import { buildIndex, searchIndex, type IndexRow } from './search';
import { loadMarket, type MarketRobot } from '@/lib/market/load';
import { pageIdentity } from '@/lib/market/tiles';
import { plainDashes } from '@/lib/spec/display';
import type { PriceCurrent, RobotCard, SpecValue } from '@/lib/spec/types';


const source = { id: 's1', url: 'https://www.maker.example/robot', title: 'Robot', publisher: 'Maker', kind: 'manufacturer' as const, checkedAt: '2026-10-01' };
const press = { id: 's2', url: 'https://www.press.example/robot', title: 'Report', publisher: 'Press', kind: 'press' as const, checkedAt: '2026-10-01' };
const capabilities = { legs: true, wheels: false, tracks: false, levelFloors: true, roughGround: null, stairs: null, outdoor: null, arms: 2, hands: 'gripper' as const, handsIncluded: true, armPayloadKg: null, carryPayloadKg: null, runtimeH: null, ipRating: null, sdk: null, sourceIds: ['s1'], notes: [] };
const robot = (over: Partial<MarketRobot> = {}, caps: Partial<typeof capabilities> | Record<string, unknown> = {}): MarketRobot => ({
  schemaVersion: 1, id: 'maker-robot', maker: 'Maker', makerCountry: 'DE', model: 'Robot', variant: null, name: 'Maker Robot', robotType: 'humanoid', specialisedFor: [], officialUrl: null,
  summary: 'A robot.', launched: null, lifecycle: 'shipping',
  germany: { status: 'quote', statusNote: 'Ask.', sourceIds: ['s1'], priceEur: null, priceOther: null, leadTime: null, sellers: [{ name: 'Seller', country: 'DE', role: 'reseller', productUrl: null, contactUrl: null, email: null, phone: null, priceEur: null, priceBasis: null, sourceId: 's1', note: null }], checkedAt: '2026-10-01' },
  specs: [], capabilities: { ...capabilities, ...caps } as MarketRobot['capabilities'], images: [], evidence: [], sources: [source, press], openQuestions: [], checkedAt: '2026-10-01', picture: null, gallery: [], ...over,
});
const spec = (key: string, value: string | number, unit: string | null, conditions: string | null = null, label = key, sourceId = 's1') => ({ key, label, value, unit, conditions, sourceId });

const specValue = (value: SpecValue['value'], over: Partial<SpecValue> = {}): SpecValue => ({ value, source_url: 'https://www.unitree.com/g1', source_tier: 1, observed_at: '2026-10-01', confidence: 0.8, trust: 'verified', ...over });
const card = (specs: RobotCard['specs'], over: Partial<RobotCard> = {}) => ({ id: 'row', name: 'Row', form_factor: 'humanoid', manufacturer_name: 'Maker', manufacturer_country: 'CN', specs, ...over }) as RobotCard;

describe('market facts', () => {
  it('fills the fixed rows and never guesses a missing value', () => {
    const facts = marketFacts(robot());
    expect(Object.keys(facts).sort()).toEqual(FACT_ROWS.map((row) => row.key).sort());
    expect(facts.weight).toEqual([]);
    expect(facts.stairs).toEqual([]);
    expect(facts.payloadArm).toEqual([]);
  });

  it('keeps conditions with the value and says who states it', () => {
    const facts = marketFacts(robot({ specs: [spec('arm_payload_kg', 3, 'kg', 'rated; 5 kg peak', 'Arm payload', 's2')] }));
    expect(facts.payloadArm).toEqual([{ text: '3 kg', note: 'rated; 5 kg peak', source: { url: press.url, label: 'Reported · press.example' } }]);
  });

  it('puts every speed in one unit and names what the source stated', () => {
    const [speed] = marketFacts(robot({ specs: [spec('transport_speed_kmh', 2.5, 'km/h', 'max.', 'Transport speed')] })).speed;
    expect(speed.text).toBe('0.69 m/s');
    expect(speed.note).toBe('Transport speed; max.; stated as 2.5 km/h');
  });

  it('does not read a print head speed as a travel speed', () => {
    expect(marketFacts(robot({ specs: [spec('max_speed_mms', 500, 'mm/s')] })).speed).toEqual([]);
  });

  it('keeps a payload with no stated basis in the arm row, with the doubt spelled out', () => {
    expect(marketFacts(robot({ specs: [spec('payload_kg', 20, 'kg')] })).payloadArm[0]).toMatchObject({ text: '20 kg', note: 'Arm or total not stated' });
  });

  it('moves a loose payload to the body when the robot has no arm, and arm rows do not apply', () => {
    const facts = marketFacts(robot({ robotType: 'quadruped', specs: [spec('payload_kg', 12, 'kg')] }, { arms: 0, hands: 'none', handsIncluded: null }));
    expect(facts.carry[0].text).toBe('12 kg');
    expect(facts.payloadArm).toEqual([expect.objectContaining({ text: 'Not applicable', muted: true })]);
  });

  it('names the job of a job-specific machine and no job for a general robot', () => {
    const machine = marketFacts(robot({ robotType: 'specialised', specialisedFor: ['rebar_tying'] }, { legs: false, tracks: true, arms: 0, hands: 'tool' }));
    expect(machine.job[0].text).toBe('Rebar tying');
    expect(machine.moves[0].text).toBe('Tracks');
    expect(marketFacts(robot()).job[0].muted).toBe(true);
  });

  it('adds what the stair text says to the yes', () => {
    const facts = marketFacts(robot({ specs: [spec('stairs', 'climbs stairs up to 45°', null)] }, { stairs: true }));
    expect(facts.stairs[0]).toMatchObject({ text: 'Yes', note: 'climbs stairs up to 45°' });
  });

  it('shows no dashes from the data', () => {
    expect(marketFacts(robot({ specs: [spec('charging_time_h', '5–6', 'h')] })).charging[0].text).toBe('5 to 6 h');
    expect(plainDashes('20–80 ton excavators — on tracks')).toBe('20 to 80 ton excavators, on tracks');
  });
});

describe('units', () => {
  it('reads ranges and leaves words alone', () => {
    const celsius = { unit: '°C', decimals: 0, from: {} };
    expect(inUnit('0-45', '°C', celsius).text).toBe('0 to 45 °C');
    expect(inUnit('-20 to 55', 'C', celsius).text).toBe('-20 to 55 °C');
    expect(inUnit('a full shift per battery', null, { unit: 'h', decimals: 1, from: {} }).text).toBe('a full shift per battery');
  });
});

describe('catalogue facts', () => {
  it('keeps rated and peak apart and both arms in their own row', () => {
    const facts = catalogueFacts(card({ 'payload_kg:rated': specValue(3, { unit: 'kg' }), 'payload_kg:peak': specValue(5, { unit: 'kg' }), 'payload_kg:rated_dual': specValue(6, { unit: 'kg' }) }), [], []);
    expect(facts.payloadArm.map((value) => [value.text, value.note])).toEqual([['3 kg', 'rated, one arm'], ['5 kg', 'peak, one arm']]);
    expect(facts.payloadBoth[0].note).toBe('rated, both arms');
  });

  it('does not claim a basis the source did not give', () => {
    expect(catalogueFacts(card({ payload_kg: specValue(20, { unit: 'kg' }) }), [], []).payloadArm[0].note).toBe('Arm or total not stated');
  });

  it('labels a third-party value as reported', () => {
    expect(catalogueFacts(card({ weight_kg: specValue(40, { unit: 'kg', trust: 'reported', source_url: 'https://db.example/x' }) }), [], []).weight[0].source?.label).toBe('Reported · db.example');
  });

  it('writes ranges in words and step in the row unit', () => {
    const facts = catalogueFacts(card({ operating_temp_c: specValue(17.5, { min: -20, max: 55, unit: '°C' }), step_height_m: specValue(0.3, { unit: 'm' }) }), [], []);
    expect(facts.temperature[0].text).toBe('-20 to 55°C');
    expect(facts.step[0].text).toBe('30 cm');
  });

  it('prefers a German seller price over a global estimate', () => {
    const price = (over: Partial<PriceCurrent>) => ({ robot_id: 'row', region: 'GLOBAL', config: 'x', amount: 1000, currency: 'EUR', tier: 3, direct: false, includes_vat: null, source_id: null, source_url: 'https://db.example/x', observed_at: '2026-10-01', stale: false, ...over }) as PriceCurrent;
    const facts = catalogueFacts(card({}), [price({}), price({ region: 'DE', tier: 2, amount: 46000, includes_vat: false, source_url: 'https://shop.example/g1' })], []);
    expect(facts.price[0].text).toContain('46,000 net');
    expect(facts.price[0].note).toContain('DE');
  });
});

describe('merging and rows', () => {
  it('prefers the market record and fills only what it leaves open', () => {
    const merged = mergeFacts(marketFacts(robot({ specs: [spec('weight_kg', 35, 'kg')] })), catalogueFacts(card({ weight_kg: specValue(40, { unit: 'kg' }), height_m: specValue(1.3, { unit: 'm' }) }), [], []));
    expect(merged.weight[0].text).toBe('35 kg');
    expect(merged.height[0].text).toBe('1.3 m');
  });

  it('hides an empty optional row, keeps empty core rows, and does not count "Not applicable" as a value', () => {
    const rows = visibleRows([{ facts: marketFacts(robot()) }]).map((row) => row.key);
    expect(rows).toContain('weight');
    expect(rows).not.toContain('reach');
    expect(rows).not.toContain('job');
    const withMachine = visibleRows([{ facts: marketFacts(robot()) }, { facts: marketFacts(robot({ robotType: 'specialised', specialisedFor: ['welding'] })) }]).map((row) => row.key);
    expect(withMachine).toContain('job');
    expect(withMachine.indexOf('job')).toBeLessThan(withMachine.indexOf('moves'));
  });

  it('holds no score, winner or verdict', () => {
    const facts: Facts = marketFacts(robot());
    expect(JSON.stringify(facts)).not.toMatch(/best|score|winner/i);
    expect(FACT_ROWS.map((row) => row.label).join(' ')).not.toMatch(/best|score|verdict/i);
  });
});

describe('real market records', () => {
  const market = loadMarket();

  it('builds facts for every record without inventing a dash', () => {
    for (const record of market) expect(JSON.stringify(marketFacts(record))).not.toMatch(/[–—]/);
  });

  it('keeps the key fact rows even for the two-column grid and worth showing on real data', () => {
    expect(KEY_FACT_KEYS.length % 2).toBe(0);
    const covered = (key: (typeof KEY_FACT_KEYS)[number]) => market.filter((record) => marketFacts(record)[key].some((value) => !value.muted)).length / market.length;
    // The floor is low on purpose: IP rating is published for about one robot in six, and on a
    // construction site that gap is itself what a buyer needs to see.
    for (const key of KEY_FACT_KEYS) expect(covered(key), key).toBeGreaterThan(0.15);
  });
});

describe('one robot, one compare id', () => {
  const row = { id: 'uuid-g1', name: 'Unitree G1' };
  const edu = { id: 'uuid-edu', name: 'Unitree G1 EDU' };
  const record = (id: string, name: string) => robot({ id, name, maker: 'Unitree Robotics' });

  it('gives the catalogue id to the record that is that configuration, and keeps other builds apart', () => {
    const plain = record('unitree-g1', 'Unitree G1');
    const standard = record('unitree-g1-edu', 'Unitree G1 EDU');
    const dex = record('unitree-g1-edu-dex3', 'Unitree G1 EDU with Dex3-1 hands');
    const identity = pageIdentity([row, edu], [plain, standard, dex]);
    expect(identity.compareId(plain)).toBe('uuid-g1');
    expect(identity.compareId(standard)).toBe('uuid-edu');
    expect(identity.compareId(dex)).toBe('unitree-g1-edu-dex3');
    expect(identity.recordFor.get('uuid-edu')?.id).toBe('unitree-g1-edu');
  });

  it('lists each robot once in the search, under its compare id', () => {
    const plain = record('unitree-g1', 'Unitree G1');
    const rows: IndexRow[] = [
      { id: 'uuid-g1', manufacturer_slug: 'unitree', manufacturer_name: 'Unitree', model_slug: 'g1', variant: 'base', name: 'Unitree G1', form_factor: 'humanoid', image_url: null },
      { id: 'uuid-h1', manufacturer_slug: 'unitree', manufacturer_name: 'Unitree', model_slug: 'h1', variant: 'base', name: 'Unitree H1', form_factor: 'humanoid', image_url: null },
    ];
    const index = buildIndex([plain, record('acr-ironbot', 'ACR Ironbot')], rows, new Map([['unitree/g1', [plain]]]));
    expect(index.filter((entry) => entry.name === 'Unitree G1').map((entry) => entry.id)).toEqual(['uuid-g1']);
    expect(searchIndex(index, 'ironbot').map((hit) => hit.id)).toEqual(['acr-ironbot']);
    expect(searchIndex(index, 'h1').map((hit) => hit.name)).toEqual(['Unitree H1']);
    expect(searchIndex(index, '  ')).toEqual([]);
    expect(Object.keys(searchIndex(index, 'g1')[0]).sort()).toEqual(['id', 'maker', 'name', 'picture', 'type']);
  });
});
