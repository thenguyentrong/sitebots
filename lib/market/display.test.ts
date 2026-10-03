import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configurationSpecifications, marketSourceLabel, marketValue } from './display';
import { DossierSchema } from './schema';

const record = (id: string) => DossierSchema.parse(JSON.parse(readFileSync(join(process.cwd(), 'data/market/de', id + '.json'), 'utf8').replace(/^\uFEFF/, '')));

describe('configuration specification evidence', () => {
  it('keeps Edu and Pro payloads, conditions and seller provenance separate', () => {
    const edu = configurationSpecifications(record('booster-t2-edu'));
    const pro = configurationSpecifications(record('booster-t2-pro'));
    const eduPayload = edu.specs.find((row) => row.key === 'arm_payload_kg')!;
    const proPayload = pro.specs.find((row) => row.key === 'arm_payload_kg')!;
    expect(marketValue(eduPayload)).toBe('5 kg');
    expect(marketValue(proPayload)).toBe('3 kg');
    expect(eduPayload.conditions).toContain('horizontal');
    expect(proPayload.conditions).toContain('horizontal');
    expect(marketSourceLabel(eduPayload.source!)).toBe('Reported · seller');
    expect(marketSourceLabel(proPayload.source!)).toBe('Reported · seller');
    expect(eduPayload.source?.url).toContain('T2-Edu');
    expect(proPayload.source?.url).toContain('T2-Pro');
    expect(edu.capabilities.some((row) => row.key === 'armPayloadKg')).toBe(false);
  });

  it('never uses general capability sources as proof of a field', () => {
    const robot = record('agibot-a3-ultra');
    robot.researchEvidence = [];
    const outdoor = configurationSpecifications(robot).capabilities.find((row) => row.key === 'outdoor')!;
    expect(outdoor.value).toBe(true);
    expect(outdoor.source).toBeNull();
    expect(outdoor.quote).toBeNull();
    expect(robot.capabilities.sourceIds.length).toBeGreaterThan(0);
  });

  it('attaches a checked quote only to its exact field and current value', () => {
    const robot = record('agibot-a3-ultra');
    robot.researchEvidence = [{
      field: 'outdoor', value: true, sourceId: 's1', quote: 'Works outdoors with secondary development.',
      basis: 'Application development required; no weather rating.', checkedAt: '2026-10-03',
    }, {
      field: 'rough_ground', value: false, sourceId: 's1', quote: 'Indoor flat floors only.',
      basis: null, checkedAt: '2026-10-03',
    }];
    const rows = configurationSpecifications(robot).capabilities;
    const outdoor = rows.find((row) => row.key === 'outdoor')!;
    expect(outdoor.source?.kind).toBe('manufacturer');
    expect(outdoor.quote).toContain('secondary development');
    expect(outdoor.conditions).toContain('no weather rating');
    expect(outdoor.checkedAt).toBe('2026-10-03');
    expect(rows.find((row) => row.key === 'roughGround')?.source).toBeNull();
  });

  it('does not attach one source quote to a spec from another source', () => {
    const robot = record('booster-t2-edu');
    robot.researchEvidence = [{
      field: 'arm_payload_kg', value: 5, sourceId: 's1', quote: '5 kg per arm.',
      basis: null, checkedAt: '2026-10-03',
    }];
    const payload = configurationSpecifications(robot).specs.find((row) => row.key === 'arm_payload_kg')!;
    expect(payload.source?.kind).toBe('seller');
    expect(payload.quote).toBeNull();
  });

  it('keeps unknown separate from an explicit negative capability', () => {
    const robot = record('booster-t2-edu');
    const profile = configurationSpecifications(robot);
    const outdoor = profile.capabilities.find((row) => row.key === 'outdoor')!;
    const hands = profile.capabilities.find((row) => row.key === 'handsIncluded')!;
    expect(marketValue(outdoor)).toBe('Unknown');
    expect(marketValue(hands)).toBe('No');
    expect(profile.missing).toContain('Outdoor use');
    expect(profile.missing).not.toContain('Hands included');
  });

  it('preserves every specification, and never treats a combined payload as per arm', () => {
    const robot = record('booster-t2-edu');
    robot.specs = robot.specs.filter((spec) => spec.key !== 'arm_payload_kg');
    robot.capabilities.armPayloadKg = null;
    robot.researchEvidence = [];
    const profile = configurationSpecifications(robot);
    expect(profile.specs.map((row) => row.key)).toEqual(robot.specs.map((row) => row.key));
    expect(profile.specs.find((row) => row.key === 'both_arms_payload_kg')?.value).toBe(10);
    expect(profile.summary.some((row) => row.label === 'Per arm')).toBe(false);
    expect(profile.missing).toContain('Payload per arm');
  });
});

it('retains additional source claims separately from the original specification citation', () => {
  const robot = record('booster-t2-edu');
  robot.researchEvidence = [{ field: 'arm_payload_kg', value: 5, sourceId: 's1', quote: '5 kg maximum per arm.', basis: 'Maximum claim; posture unstated.', checkedAt: '2026-10-03' }];
  const row = configurationSpecifications(robot).specs.find(item => item.key === 'arm_payload_kg')!;
  expect(row.source?.kind).toBe('seller');
  expect(row.quote).toBeNull();
  expect(row.additionalClaims).toHaveLength(1);
  expect(row.additionalClaims[0]).toMatchObject({ source: { kind: 'manufacturer' }, quote: '5 kg maximum per arm.', basis: 'Maximum claim; posture unstated.' });
});
