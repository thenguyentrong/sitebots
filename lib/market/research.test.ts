import { describe, expect, it } from 'vitest';
import { missingFields, normalizeText, pageHasQuote, parseCsv, parseValue, quoteHasValue, quoteOnPage } from './research';

describe('missing spec research', () => {
  it('reads quoted CSV cells with commas, doubled quotes and line breaks', () => {
    const rows = parseCsv('id,field,value,quote\r\nunitree-h1-2,arm_payload_kg,7,"Arm payload: 7 kg, rated ""per arm"""\nx,ip_rating,IP54,"line one\nline two"\n');
    expect(rows).toHaveLength(2);
    expect(rows[0].quote).toBe('Arm payload: 7 kg, rated "per arm"');
    expect(rows[1].quote).toBe('line one\nline two');
  });

  it('accepts only values that fit the field', () => {
    expect(parseValue('arm_payload_kg', '7,5')).toBe(7.5);
    expect(parseValue('arm_payload_kg', 'about 7')).toBeNull();
    expect(parseValue('ip_rating', 'ip54')).toBe('IP54');
    expect(parseValue('ip_rating', 'IP 54')).toBeNull();
    expect(parseValue('stairs', 'yes')).toBe(true);
    expect(parseValue('stairs', 'maybe')).toBeNull();
  });

  it('finds the value in the quote in any notation, and never a longer number', () => {
    expect(quoteHasValue('arm_payload_kg', 7.5, 'Nutzlast pro Arm: 7,5 kg')).toBe(true);
    expect(quoteHasValue('arm_payload_kg', 7, 'Arm payload 7.0 kg')).toBe(true);
    expect(quoteHasValue('arm_payload_kg', 7, 'Arm payload 17 kg')).toBe(false);
    expect(quoteHasValue('arm_payload_kg', 7, 'Arm payload 7.5 kg')).toBe(false);
    expect(quoteHasValue('ip_rating', 'IP54', 'Protection class ip54')).toBe(true);
  });

  it('compares page text and quotes without typography mattering', () => {
    expect(normalizeText('Payload\u00a0\u2013 \u201c7 kg\u201d')).toBe(normalizeText('payload - "7 kg"'));
    expect(quoteOnPage('负载 7 kg [Payload 7 kg]')).toBe('负载 7 kg');
    expect(pageHasQuote('Arm normal load /peak: about 21kg; rated: about 7kg', 'Arm normal load / peak: about 21 kg; Rated: about 7 kg')).toBe(true);
    expect(pageHasQuote('Arm normal load /peak: about 21kg', 'Arm load: about 7 kg')).toBe(false);
  });

  it('asks only for fields that fit the body', () => {
    const dog = { robotType: 'quadruped' as const, specs: [], capabilities: { legs: true, wheels: false, tracks: false, levelFloors: true, roughGround: null, stairs: null, outdoor: true, arms: 0, hands: 'none' as const, handsIncluded: null, armPayloadKg: null, carryPayloadKg: 10, runtimeH: null, ipRating: 'IP67', sdk: null, sourceIds: ['s1'], notes: [] } };
    expect(missingFields(dog)).toEqual(['runtime_h', 'stairs', 'rough_ground']);
  });
});
