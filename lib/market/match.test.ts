import { describe, expect, it } from 'vitest';
import { fitRobot, optionsForJob, type JobContext } from './match';
import type { UseCaseNeeds } from './requirements';
import type { Dossier } from './schema';

const caps = (patch: Partial<Dossier['capabilities']>): Dossier['capabilities'] => ({
  legs: true, wheels: false, tracks: false, levelFloors: true, roughGround: null, stairs: null, outdoor: null,
  arms: 2, hands: 'dexterous', handsIncluded: true, armPayloadKg: 3, carryPayloadKg: null, runtimeH: 2, ipRating: null, sdk: null,
  sourceIds: ['s1'], notes: [], ...patch,
});
const robot = (id: string, patch: Partial<Dossier> = {}, capabilities: Partial<Dossier['capabilities']> = {}) => ({
  id, name: id, robotType: 'humanoid' as const, specialisedFor: [] as string[], capabilities: caps(capabilities), evidence: [] as Dossier['evidence'],
  sources: [{ id: 's1', url: 'https://example.com/' + id, title: 't', publisher: 'p', kind: 'manufacturer' as const, checkedAt: '2026-10-02' }],
  germany: { status: 'buy_now' as const, statusNote: 'n', sourceIds: ['s1'], priceEur: null, priceOther: null, leadTime: null, sellers: [], checkedAt: '2026-10-02' },
  specs: [] as Dossier['specs'], ...patch,
});
const needs = (patch: Partial<UseCaseNeeds>): UseCaseNeeds => ({ id: 'job', movement: 'level_floors', handWork: 'simple_grip', maxObjectKg: 2, tool: null, sensing: null, generalPurpose: 'plausible', specialisedJob: null, reason: 'test assumption', ...patch });
const job = (patch: Partial<UseCaseNeeds> = {}, outdoor: boolean | null = false): JobContext => ({ id: 'site/job', needs: needs(patch), outdoor });

describe('fitRobot', () => {
  it('fits a humanoid with hands to light picking on level floors', () => {
    expect(fitRobot(robot('h'), job())?.verdict).toBe('fits');
  });
  it('rejects a robot dog without an arm for hand work', () => {
    expect(fitRobot(robot('dog', { robotType: 'quadruped' }, { arms: 0, hands: 'none' }), job())).toBeNull();
  });
  it('keeps a robot whose hands are sold separately, as a stretch', () => {
    const fit = fitRobot(robot('opt', {}, { hands: 'optional', handsIncluded: false }), job());
    expect(fit?.verdict).toBe('stretch');
    expect(fit?.checks.hands).toBe('add');
  });
  it('rejects an arm that cannot hold the object', () => {
    expect(fitRobot(robot('weak', {}, { armPayloadKg: 1 }), job({ maxObjectKg: 5 }))).toBeNull();
  });
  it('needs a stated payload for heavy parts', () => {
    expect(fitRobot(robot('unknown', {}, { armPayloadKg: null }), job({ maxObjectKg: 12 }))).toBeNull();
  });
  it('keeps grippers away from power-tool work', () => {
    expect(fitRobot(robot('gripper', {}, { hands: 'gripper' }), job({ handWork: 'tool' }))).toBeNull();
    expect(fitRobot(robot('fingers'), job({ handWork: 'tool' }))?.checks.hands).toBe('add');
  });
  it('treats an unknown payload as open, never as a pass', () => {
    const fit = fitRobot(robot('unknown', {}, { armPayloadKg: null }), job());
    expect(fit?.checks.load).toBe('unknown');
    expect(fit?.verdict).toBe('stretch');
  });
  it('needs a stated stair capability for stair jobs', () => {
    expect(fitRobot(robot('flat', {}, { stairs: false }), job({ movement: 'stairs_ladders' }))).toBeNull();
    expect(fitRobot(robot('climber', {}, { stairs: true }), job({ movement: 'stairs_ladders' }))?.verdict).toBe('fits');
  });
  it('keeps a robot with evidence for the exact job even when the screen says no', () => {
    const proven = robot('proven', { evidence: [{ taskIds: ['site/job'], task: 'did it', stage: 'pilot', where: 'Plant', date: '2026-01', sourceId: 's1', note: null }] });
    const fit = fitRobot(proven, job({ generalPurpose: 'no' }));
    expect(fit?.verdict).toBe('done');
    expect(fit?.evidence?.stage).toBe('pilot');
  });
  it('drops general robots from jobs nobody should give them', () => {
    expect(fitRobot(robot('h'), job({ generalPurpose: 'no' }))).toBeNull();
  });
  it('lists a specialised robot only for its own job', () => {
    const printer = robot('printer', { robotType: 'specialised', specialisedFor: ['layout_marking'] }, { legs: false, wheels: true, arms: 0, hands: 'tool' });
    expect(fitRobot(printer, job({ specialisedJob: 'layout_marking', generalPurpose: 'no' }))?.kind).toBe('specialised');
    expect(fitRobot(printer, job({ specialisedJob: 'demolition' }))).toBeNull();
  });
  it('needs a stated outdoor capability for outdoor jobs', () => {
    expect(fitRobot(robot('indoor', {}, { outdoor: false }), job({}, true))).toBeNull();
    expect(fitRobot(robot('maybe', {}, { outdoor: null }), job({}, true))).toBeNull();
    expect(fitRobot(robot('outside', {}, { outdoor: true }), job({}, true))?.checks.outdoor).toBe('yes');
  });
  it('does not offer an unproven walker for rough ground', () => {
    expect(fitRobot(robot('walker', {}, { roughGround: null }), job({ movement: 'rough_ground' }))).toBeNull();
  });
});

describe('related work', () => {
  const familyOf = new Map([['site/job', 'inspection'], ['plant/rounds', 'inspection'], ['plant/lift', 'transport']]);
  const rounds = (patch: Partial<UseCaseNeeds> = {}): JobContext => ({ id: 'site/job', needs: needs({ handWork: 'none', maxObjectKg: 0, ...patch }), outdoor: false, isRelated: (taskId) => taskId !== 'site/job' && familyOf.get(taskId) === 'inspection' });
  it('ranks a robot proven on a similar job above one that only fits on paper', () => {
    const proven = robot('dog', { robotType: 'quadruped', evidence: [{ taskIds: ['plant/rounds'], task: 'Plant rounds', stage: 'deployment', where: 'Plant', date: null, sourceId: 's1', note: null }] }, { arms: 0, hands: 'none' });
    const fit = fitRobot(proven, rounds());
    expect(fit?.verdict).toBe('similar');
    expect(fit?.related?.task).toBe('Plant rounds');
  });
  it('leaves robots without shown work out of jobs without hand work', () => {
    expect(fitRobot(robot('walker'), rounds())).toBeNull();
  });
  it('ignores evidence from another kind of work', () => {
    const other = robot('mover', { evidence: [{ taskIds: ['plant/lift'], task: 'Lift boxes', stage: 'pilot', where: null, date: null, sourceId: 's1', note: null }] });
    expect(fitRobot(other, rounds())).toBeNull();
  });
});

describe('claims', () => {
  it('ranks a maker claim our checks contradict below a clean fit', () => {
    const claimed = robot('claimed', { evidence: [{ taskIds: ['site/job'], task: 'says it can', stage: 'claim', where: null, date: null, sourceId: 's1', note: null }] }, { armPayloadKg: 1 });
    const clean = robot('clean', {}, { armPayloadKg: 10 });
    const result = optionsForJob([claimed, clean], job({ maxObjectKg: 5 }));
    expect(result.options.map((fit) => fit.robotId)).toEqual(['clean', 'claimed']);
  });
});

describe('optionsForJob', () => {
  it('ranks evidence first and keeps robots that are not sold in Germany apart', () => {
    const proven = robot('b-proven', { evidence: [{ taskIds: ['site/job'], task: 'did it', stage: 'deployment', where: null, date: null, sourceId: 's1', note: null }] });
    const plain = robot('a-plain');
    const away = robot('c-away', { germany: { ...plain.germany, status: 'not_sold' } });
    const later = robot('d-later', { germany: { ...plain.germany, status: 'preorder' } });
    const result = optionsForJob([plain, proven, away, later], job());
    expect(result.options.map((fit) => fit.robotId)).toEqual(['b-proven', 'a-plain']);
    expect(result.notSold.map((fit) => fit.robotId)).toEqual(['c-away']);
    expect(result.preorder.map((fit) => fit.robotId)).toEqual(['d-later']);
  });
});
