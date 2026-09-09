import { describe, expect, it } from 'vitest';
import { CuratedFile } from './schema';

const base = { manufacturer: 'boston-dynamics', model: 'spot' };

describe('curated schema: parts and equipment', () => {
  it('accepts a structured equipment list with evidence', () => {
    const res = CuratedFile.safeParse({
      ...base,
      entries: { equipment_options: { value: [{ type: 'arm', name: 'Spot Arm', maker: 'Boston Dynamics' }], confidence: 'confirmed', evidence_url: 'https://bostondynamics.com/products/spot/payloads/' } },
    });
    expect(res.success).toBe(true);
  });
  it('names the path of a bad item', () => {
    const res = CuratedFile.safeParse({ ...base, entries: { equipment_options: { value: [{ type: 'arms', name: 'x' }], confidence: 'likely' } } });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].path.join('.')).toBe('entries.equipment_options.value');
  });
  it('still insists on evidence for "confirmed"', () => {
    const res = CuratedFile.safeParse({ ...base, entries: { battery_pack: { value: { energy_wh: 564 }, confidence: 'confirmed' } } });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues.some((i) => i.path.join('.') === 'entries.battery_pack.evidence_url')).toBe(true);
  });
  it('rejects a hand type outside the vocabulary', () => {
    expect(CuratedFile.safeParse({ ...base, entries: { hand_type: { value: 'claws', confidence: 'likely' } } }).success).toBe(false);
    expect(CuratedFile.safeParse({ ...base, entries: { hand_type: { value: 'gripper', confidence: 'likely' } } }).success).toBe(true);
  });
});
