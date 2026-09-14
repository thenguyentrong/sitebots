import { describe, expect, it } from 'vitest';
import { smallHumanoid } from '@/lib/match/fixtures';
import type { RobotCard, SpecValue } from '@/lib/spec/types';
import { toClusterRobot } from './cluster-robot';
import { clusterMembers } from './landscape';

const taskSpec = (tasks: string[], trust: SpecValue['trust'] = 'verified'): SpecValue => ({ value: tasks, trust, source_url: 'https://maker.example/tasks', source_tier: 1, observed_at: '2026-09-14', confidence: 1 });
function card(patch: Partial<RobotCard> = {}): RobotCard {
  return { ...smallHumanoid.card, id: 'example', manufacturer_slug: 'example', model_slug: 'robot', status: 'shipping', specs: { task_capabilities: taskSpec(['carry_payload', 'site_inspection']) }, ...patch };
}
describe('catalogue landscape', () => {
  it('the type view places every active record once, including unknown availability', () => {
    const robots = ['humanoid', 'quadruped', 'mobile_manipulator'].flatMap((form, f) => ['shipping', 'pre_order', 'prototype', 'unknown'].map((status, s) => toClusterRobot(card({ id: f + '-' + s, form_factor: form as RobotCard['form_factor'], status: status as RobotCard['status'], specs: {} }))));
    const cells = ['humanoid', 'quadruped', 'mobile_manipulator'].flatMap((form) => ['commercial', 'upcoming', 'unconfirmed'].flatMap((stage) => clusterMembers(robots, form + ':' + stage)));
    expect(cells).toHaveLength(robots.length);
    expect(new Set(cells.map((robot) => robot.id)).size).toBe(robots.length);
  });
  it('preserves curated claims without presenting them as primary evidence', () => {
    const robot = toClusterRobot(card({ specs: { task_capabilities: { ...taskSpec(['site_inspection'], 'assessed'), source_url: 'curated://example/robot' } } }));
    expect(robot.groups).toEqual(['inspection']);
    expect(robot.trust).toBe('assessed');
    expect(robot.taskSource).toBeNull();
  });
  it('links the official evidence page when provenance is a curated record', () => {
    const robot = toClusterRobot(card({ specs: { task_capabilities: { ...taskSpec(['site_inspection']), source_url: 'curated://example/robot', evidence_url: 'https://maker.example/inspection' } } }));
    expect(robot.taskSource).toBe('https://maker.example/inspection');
    expect(robot.trust).toBe('verified');
  });
  it('groups recorded tasks independently and counts each configuration once per cell', () => {
    const robot = toClusterRobot(card({ specs: { task_capabilities: taskSpec(['carry_payload', 'carry_payload', 'site_inspection']) } }));
    expect(robot.groups).toEqual(['logistics', 'inspection']);
    expect(clusterMembers([robot], 'logistics:commercial')).toHaveLength(1);
    expect(clusterMembers([robot], 'inspection:commercial')).toHaveLength(1);
    expect(clusterMembers([robot], 'production:commercial')).toHaveLength(0);
    expect(robot.unmappedReason).toBeNull();
  });
  it('a price or robot shape never establishes task or market availability', () => {
    const robot = toClusterRobot(card({ status: 'unknown', price_amount: 20000, form_factor: 'humanoid', specs: {}, task_capabilities: [] }));
    expect(robot.stage).toBe('unconfirmed');
    expect(robot.groups).toEqual([]);
    expect(clusterMembers([robot], 'unmapped')).toHaveLength(1);
  });
  it('keeps third-party task claims reported and unknown-confidence claims unclassified', () => {
    expect(toClusterRobot(card({ specs: { task_capabilities: taskSpec(['carry_payload'], 'reported') } })).trust).toBe('reported');
    const unknown = toClusterRobot(card({ specs: { task_capabilities: taskSpec(['carry_payload'], 'unknown') } }));
    expect(unknown.groups).toEqual([]);
    expect(unknown.unmappedReason).toContain('Use case');
  });
  it('does not invent jobs from navigation or an unsourced capability list', () => {
    expect(toClusterRobot(card({ specs: { task_capabilities: taskSpec(['stair_climbing', 'autonomous_nav_indoor']) } })).groups).toEqual([]);
    expect(toClusterRobot(card({ specs: {}, task_capabilities: ['carry_payload'] })).groups).toEqual([]);
  });
  it('separates pre-order, development and discontinued models', () => {
    expect(toClusterRobot(card({ status: 'pre_order' })).stage).toBe('upcoming');
    expect(toClusterRobot(card({ status: 'prototype' })).stage).toBe('upcoming');
    const retired = toClusterRobot(card({ status: 'discontinued' }));
    expect(retired.stage).toBeNull();
    expect(retired.unmappedReason).toBe('Discontinued');
  });
  it('keeps every configuration reachable through a cell or the reference group', () => {
    const robots = ['shipping', 'prototype', 'pre_order', 'unknown', 'discontinued'].map((status, index) => toClusterRobot(card({ id: String(index), status: status as RobotCard['status'] })));
    expect(robots.every((robot) => (robot.groups.length > 0 && robot.stage !== null) || clusterMembers(robots, 'unmapped').some((item) => item.id === robot.id))).toBe(true);
    const variant = toClusterRobot(card({ variant: 'education pro' }));
    expect(variant.href).toContain('?variant=education%20pro');
  });
});