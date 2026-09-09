import { describe, expect, it } from 'vitest';
import { extractQuantity, normalizeBool, normalizeIp, normalizeQuantity, parseQuantity } from './units';

describe('extractQuantity', () => {
  it('pulls the number out of a remark', () => {
    expect(extractQuantity('≈ 60kg Total weight (battery included)', 'kg')).toMatchObject({ value: 60, unit: 'kg' });
    expect(extractQuantity('56kg (battery included)', 'kg')).toMatchObject({ value: 56 });
  });

  it('treats a range from zero as a maximum', () => {
    expect(extractQuantity('0 ~ 2.5m/s')).toMatchObject({ value: 2.5, unit: 'm/s' });
    expect(extractQuantity('0 ~ 3.7m/s (MAX ~ 5m/s)', 'm/s')).toMatchObject({ value: 3.7 });
  });

  it('reads comparison prefixes and curly feet marks', () => {
    expect(extractQuantity('≥ 120kg')).toMatchObject({ value: 120, unit: 'kg' });
    expect(extractQuantity('> 45°')).toMatchObject({ value: 45, unit: '°' });
    expect(parseQuantity('5’6”')?.value).toBeCloseTo(1.676, 2);
  });

  it('skips a dimensionless number when a unit family is expected', () => {
    expect(extractQuantity('about 3 to 4 units of 12 kg', 'kg')).toMatchObject({ value: 12 });
  });
});

describe('parseQuantity', () => {
  it('reads a plain value with unit', () => {
    expect(parseQuantity('35 kg')).toMatchObject({ value: 35, unit: 'kg' });
    expect(parseQuantity('3.3m/s')).toMatchObject({ value: 3.3, unit: 'm/s' });
  });

  it('reads ranges with every separator we have met', () => {
    expect(parseQuantity('1270–1320 mm')).toMatchObject({ min: 1270, max: 1320, unit: 'mm' });
    expect(parseQuantity('1.27-1.32 m')).toMatchObject({ min: 1.27, max: 1.32, unit: 'm' });
    expect(parseQuantity('-20 to 55 °C')).toMatchObject({ min: -20, max: 55, unit: '°C' });
    expect(parseQuantity('−20…55 ℃')).toMatchObject({ min: -20, max: 55, unit: '°C' });
    expect(parseQuantity('2.5 ~ 4 h')).toMatchObject({ min: 2.5, max: 4, unit: 'h' });
  });

  it('drops thousands separators and keeps decimal commas', () => {
    expect(parseQuantity('1,320 mm')).toMatchObject({ value: 1320 });
    expect(parseQuantity('1,5 m')).toMatchObject({ value: 1.5 });
  });

  it('reads feet and inches', () => {
    const q = parseQuantity('5\'6"');
    expect(q?.unit).toBe('m');
    expect(q?.value).toBeCloseTo(1.676, 2);
    expect(parseQuantity('6 ft')?.value).toBeCloseTo(1.829, 2);
  });

  it('tolerates hedges', () => {
    expect(parseQuantity('about 2 h')).toMatchObject({ value: 2, unit: 'h' });
    expect(parseQuantity('up to 15kg')).toMatchObject({ value: 15, unit: 'kg' });
    expect(parseQuantity('~3–5 km/h')).toMatchObject({ min: 3, max: 5, unit: 'km/h' });
    expect(parseQuantity('~3.5 – 4 h')).toMatchObject({ min: 3.5, max: 4, unit: 'h' });
  });

  it('reads open-ended counts and per-limb figures', () => {
    expect(parseQuantity('40+')).toMatchObject({ min: 40 });
    expect(parseQuantity('8 per arm')).toMatchObject({ value: 8 });
    expect(parseQuantity('~6–7 per hand')).toMatchObject({ min: 6, max: 7 });
  });

  it('collapses a doubled unit', () => {
    expect(parseQuantity('~300 kg kg')).toMatchObject({ value: 300, unit: 'kg' });
    expect(parseQuantity('160 to 175 cm cm')).toMatchObject({ min: 160, max: 175, unit: 'cm' });
  });

  it('returns null for prose', () => {
    expect(parseQuantity('depends on configuration')).toBeNull();
  });
});

describe('normalizeQuantity', () => {
  it('converts into the field canonical unit', () => {
    expect(normalizeQuantity('weight_kg', '66 lbs')?.value).toBeCloseTo(29.94, 1);
    expect(normalizeQuantity('height_m', '1270–1320 mm')).toMatchObject({ min: 1.27, max: 1.32, unit: 'm' });
    expect(normalizeQuantity('max_speed_ms', '7.2 km/h')?.value).toBeCloseTo(2, 3);
    expect(normalizeQuantity('max_speed_ms', '4 mph')?.value).toBeCloseTo(1.788, 2);
    expect(normalizeQuantity('runtime_h', '90 min')?.value).toBeCloseTo(1.5, 3);
    expect(normalizeQuantity('operating_temp_c', '-4 to 113 °F')).toMatchObject({ min: -20, max: 45 });
    expect(normalizeQuantity('battery_wh', '0.972 kWh')?.value).toBe(972);
  });

  it('refuses a unit from the wrong family instead of guessing', () => {
    expect(normalizeQuantity('weight_kg', '1.8 m')).toBeNull();
  });

  it('accepts a bare number for a field with a fixed unit', () => {
    expect(normalizeQuantity('dof_total', '23')).toMatchObject({ value: 23 });
    expect(normalizeQuantity('compute_tops', '2070')).toMatchObject({ value: 2070 });
  });
});

describe('normalizeIp / normalizeBool', () => {
  it('normalises IP codes', () => {
    expect(normalizeIp('ip 54')).toBe('IP54');
    expect(normalizeIp('IP6X')).toBe('IP6X');
    expect(normalizeIp('none')).toBeNull();
  });

  it('reads yes/no words', () => {
    expect(normalizeBool('Yes')).toBe(true);
    expect(normalizeBool('—')).toBe(false);
    expect(normalizeBool('maybe')).toBeNull();
  });
});
