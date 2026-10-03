import { describe, expect, it } from 'vitest';
import sample from '@/data/market/de/booster-k1-edu.json';
import { DossierSchema } from './schema';
import { applyCheckedResearchRow, type CheckedResearchRow } from './research-apply';

const row: CheckedResearchRow = { field: 'rough_ground', value: true, basis: 'Uneven-ground walking, exact configuration', quote: 'It can walk on uneven ground', url: 'https://maker.example/k1/manual', publisher: 'Maker', kind: 'manufacturer', checkedAt: '2026-10-03', title: 'K1 manual' };
const fresh = () => { const record = DossierSchema.parse(structuredClone(sample)); record.capabilities.roughGround = null; delete record.researchEvidence; return record; };

describe('checked research application', () => {
  it('keeps field-level evidence, conditions and source after an accepted boolean import', () => {
    const record = fresh();
    expect(applyCheckedResearchRow(record, row).status).toBe('applied');
    expect(record.capabilities.roughGround).toBe(true);
    expect(record.researchEvidence).toEqual([{ field: row.field, value: true, quote: row.quote, basis: row.basis, sourceId: record.sources.at(-1)!.id, checkedAt: row.checkedAt }]);
    expect(DossierSchema.safeParse(record).success).toBe(true);
  });
  it('reuses source and evidence on repeated import', () => {
    const record = fresh();
    applyCheckedResearchRow(record, row);
    const count = record.sources.length;
    applyCheckedResearchRow(record, { ...row, checkedAt: '2026-10-04' });
    expect(record.sources).toHaveLength(count);
    expect(record.researchEvidence).toHaveLength(1);
    expect(record.researchEvidence![0].checkedAt).toBe('2026-10-04');
  });
  it('does not partially fill a capability when the existing spec conflicts', () => {
    const record = fresh();
    record.capabilities.runtimeH = null;
    record.specs = record.specs.filter(s => s.key !== 'runtime_h');
    record.specs.push({key:'runtime_h',label:'Runtime',value:2,unit:'h',conditions:'walking',sourceId:record.sources[0].id});
    const before = structuredClone(record);
    const result = applyCheckedResearchRow(record, { ...row, field:'runtime_h',value:3,quote:'Runtime 3 h',basis:'walking' });
    expect(result.status).toBe('conflict');
    expect(record).toEqual(before);
  });
  it('never overwrites an existing contrary boolean', () => {
    const record = fresh(); record.capabilities.roughGround = false;
    const before = structuredClone(record);
    expect(applyCheckedResearchRow(record, row).status).toBe('conflict');
    expect(record).toEqual(before);
  });
  it.each([
    ['runtime_h', 'walking', 'idle'],
    ['runtime_h', 'walking', 'loaded'],
    ['arm_payload_kg', 'rated per arm', 'peak per arm'],
    ['both_arms_payload_kg', 'maximum combined load', 'rated combined load'],
  ] as const)('rejects equal-value %s claims with conflicting measurement modes', (field, previousBasis, incomingBasis) => {
    const record = fresh();
    record.capabilities.runtimeH = null;
    record.capabilities.armPayloadKg = null;
    record.specs = record.specs.filter(s => s.key !== field);
    record.specs.push({key:field,label:'Existing claim',value:2,unit:field === 'runtime_h' ? 'h' : 'kg',conditions:previousBasis,sourceId:record.sources[0].id});
    const before = structuredClone(record);
    expect(applyCheckedResearchRow(record, { ...row, field, value:2, quote:'Published value 2', basis:incomingBasis }).status).toBe('conflict');
    expect(record).toEqual(before);
  });
  it('allows richer compatible wording for an existing spec without overwriting its conditions', () => {
    const record = fresh();
    record.capabilities.runtimeH = null;
    record.specs = record.specs.filter(s => s.key !== 'runtime_h');
    record.specs.push({key:'runtime_h',label:'Runtime',value:2,unit:'h',conditions:'walking',sourceId:record.sources[0].id});
    expect(applyCheckedResearchRow(record, { ...row, field:'runtime_h',value:2,quote:'Walking runtime 2 h',basis:'walking on level ground with the supplied battery' }).status).toBe('applied');
    expect(record.specs.find(s => s.key === 'runtime_h')?.conditions).toBe('walking');
  });
  it.each(['Uneven-ground walking with a different configuration', '', 'unstated'])('preserves prior field evidence when a repeat changes or drops its basis: %s', (basis) => {
    const record = fresh();
    applyCheckedResearchRow(record, row);
    const before = structuredClone(record);
    expect(applyCheckedResearchRow(record, { ...row, basis, checkedAt:'2026-10-04' }).status).toBe('conflict');
    expect(record).toEqual(before);
  });
  it('rejects evidence pointing at a missing source', () => {
    const record = fresh();
    record.researchEvidence = [{field:'outdoor',value:true,sourceId:'s999',quote:'Outdoor use',basis:null,checkedAt:'2026-10-03'}];
    expect(DossierSchema.safeParse(record).success).toBe(false);
  });
});
