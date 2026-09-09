import { describe, expect, it } from 'vitest';
import { FIXTURES, siteQuadruped, smallHumanoid, unknownHumanoid, wheeledEu } from './fixtures';
import { hasAnyRequirement, RequirementSchema, requirementsFromParams } from './requirements';
import { rankRobots } from './score';

const today = new Date('2026-09-08T00:00:00Z');
const req = (over: Record<string, unknown>) => RequirementSchema.parse(over);

describe('rankRobots', () => {
  it('excludes on a hard fail with the payload sentence and ranks the quadruped', () => {
    const out = rankRobots(FIXTURES, req({ payload_kg: 12, stairs: 'required', environment: 'outdoor' }), { today });
    const small = out.excluded.find((e) => e.robot.id === 'small')!;
    expect(small.reasons).toContain('Payload: fails: 2 kg rated < 12 kg needed');
    expect(small.reasons.some((r) => r.startsWith('Outdoor use: indoor only'))).toBe(true);
    expect(out.ranked[0].robot.id).toBe('quad');
    expect(out.ranked[0].results.find((r) => r.id === 'stairs')?.text).toContain('climbs stairs');
  });

  it('treats unknown as unverified, not as a fail', () => {
    const out = rankRobots(FIXTURES, req({ payload_kg: 12, stairs: 'required' }), { today });
    const mystery = out.ranked.find((r) => r.robot.id === 'unknown');
    expect(mystery).toBeDefined();
    expect(mystery!.results.find((r) => r.id === 'stairs')?.status).toBe('unknown');
    expect(mystery!.coverage).toBeLessThan(1);
  });

  it('strict mode excludes unknowns', () => {
    const out = rankRobots(FIXTURES, req({ payload_kg: 12, stairs: 'required', strict_unknowns: true }), { today });
    expect(out.ranked.map((r) => r.robot.id)).toEqual(['quad']);
    expect(out.excluded.find((e) => e.robot.id === 'unknown')!.reasons[0]).toContain('not published');
  });

  it('scores the shift runtime with swap and basis in the sentence', () => {
    const out = rankRobots([smallHumanoid, siteQuadruped, wheeledEu], req({ runtime_h_per_shift: 8 }), { today });
    const w = out.ranked.find((r) => r.robot.id === 'wheeled')!;
    expect(w.results.find((r) => r.id === 'runtime')).toMatchObject({ status: 'pass', text: '8 h (loaded) covers an 8 h shift' });
    const q = out.ranked.find((r) => r.robot.id === 'quad')!;
    expect(q.results.find((r) => r.id === 'runtime')?.text).toContain('swappable');
    const s = out.ranked.find((r) => r.robot.id === 'small')!;
    expect(s.results.find((r) => r.id === 'runtime')).toMatchObject({ status: 'partial' });
    expect(s.results.find((r) => r.id === 'runtime')?.text).toContain('2 h (basis unstated) < 8 h shift');
  });

  it('runtime becomes a hard fail when swapping is not acceptable', () => {
    const out = rankRobots([smallHumanoid], req({ runtime_h_per_shift: 8, hot_swap_acceptable: false }), { today });
    expect(out.ranked).toHaveLength(0);
    expect(out.excluded[0].reasons[0]).toContain('Runtime per shift');
  });

  it('budget prefers a listed EU price, converts a US list price, labels estimates', () => {
    const out = rankRobots(FIXTURES, req({ budget_eur: 30000, region: 'DE' }), { today, usdToEur: 0.9 });
    const byId = Object.fromEntries(out.ranked.map((r) => [r.robot.id, r]));
    expect(byId.wheeled.price).toMatchObject({ amount_eur: 42000, basis: 'listed' });
    expect(byId.wheeled.results.find((r) => r.id === 'budget')?.text).toContain('40% over budget');
    expect(byId.small.price).toMatchObject({ amount_eur: 12150, basis: 'converted' });
    expect(byId.small.results.find((r) => r.id === 'budget')?.text).toContain('before duties and VAT');
    expect(byId.unknown.price?.basis).toBe('estimate');
    expect(byId.quad.results.find((r) => r.id === 'budget')).toMatchObject({ status: 'unknown', text: 'no published price; quote only' });
  });

  it('lead time reads distributor days, then status', () => {
    const out = rankRobots(FIXTURES, req({ needed_by: '2026-11-01' }), { today });
    const byId = Object.fromEntries(out.ranked.map((r) => [r.robot.id, r]));
    expect(byId.wheeled.results.find((r) => r.id === 'lead_time')).toMatchObject({ status: 'pass' });
    expect(byId.wheeled.results.find((r) => r.id === 'lead_time')?.text).toContain('7–14 days');
    expect(byId.quad.results.find((r) => r.id === 'lead_time')).toMatchObject({ status: 'partial' });
    expect(byId.unknown.results.find((r) => r.id === 'lead_time')).toMatchObject({ status: 'unknown' });
  });

  it('rubble excludes bipeds, gravel only scores them down', () => {
    const rubble = rankRobots(FIXTURES, req({ terrain: 'rubble' }), { today });
    expect(rubble.ranked.map((r) => r.robot.id)).toEqual(['quad']);
    const gravel = rankRobots(FIXTURES, req({ terrain: 'gravel' }), { today });
    expect(gravel.ranked.length).toBe(4);
    expect(gravel.ranked[0].robot.id).toBe('quad');
  });

  it('autonomy and certifications gate, but an unassessed robot stays listed as unknown', () => {
    const out = rankRobots(FIXTURES, req({ autonomy: 'autonomous', certifications_required: ['CE'] }), { today });
    expect(out.ranked.map((r) => r.robot.id)).toEqual(['wheeled', 'unknown']);
    expect(out.excluded.find((e) => e.robot.id === 'quad')!.reasons).toContain('Autonomy: autonomous with supervision; autonomous operation required');
    expect(out.excluded.find((e) => e.robot.id === 'small')!.reasons[0]).toContain('teleoperated');
    const strict = rankRobots(FIXTURES, req({ autonomy: 'autonomous', certifications_required: ['CE'], strict_unknowns: true }), { today });
    expect(strict.ranked.map((r) => r.robot.id)).toEqual([]);
  });

  it('with no requirements, evidence orders the list', () => {
    const out = rankRobots(FIXTURES, req({}), { today });
    expect(out.ranked[0].robot.id).toBe('quad');
    expect(out.ranked[out.ranked.length - 1].robot.id).toBe('unknown');
  });

  it('reach is estimated from height and says so', () => {
    const out = rankRobots([unknownHumanoid, smallHumanoid], req({ reach_height_m: 1.8 }), { today });
    expect(out.ranked[0].results.find((r) => r.id === 'reach')?.text).toContain('estimated from 1.75 m height');
    expect(out.excluded[0].reasons[0]).toContain('~1.52 m estimated from 1.32 m height < 1.8 m needed');
  });
});

describe('requirementsFromParams', () => {
  it('reads a query string with repeated keys and defaults', () => {
    const { req, issues, asked } = requirementsFromParams({ payload_kg: '12', tasks: ['carry_payload', 'site_inspection'], stairs: 'required', hot_swap_acceptable: 'on' });
    expect(issues).toEqual([]);
    expect(asked).toBe(true);
    expect(req).toMatchObject({ payload_kg: 12, tasks: ['carry_payload', 'site_inspection'], stairs: 'required', region: 'DE', hot_swap_acceptable: true });
  });

  it('drops a bad field and keeps the rest', () => {
    const { req, issues } = requirementsFromParams({ payload_kg: '-3', environment: 'outdoor' });
    expect(issues[0]).toMatch(/^payload_kg/);
    expect(req.payload_kg).toBeUndefined();
    expect(req.environment).toBe('outdoor');
  });

  it('knows when nothing was asked', () => {
    expect(hasAnyRequirement(requirementsFromParams({}).req)).toBe(false);
    expect(hasAnyRequirement(requirementsFromParams({ stairs: 'required' }).req)).toBe(true);
  });
});
