import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { listRobotCards } from './robots';

let database: PGlite;
vi.mock('@/lib/db', () => ({ getSql: async () => ({ query: async (sql: string, params: unknown[]) => (await database.query(sql, params)).rows }) }));

beforeAll(async () => {
  database = new PGlite();
  await database.exec(`create table robot_cards (
    id text, name text, model_slug text, manufacturer_slug text, manufacturer_name text,
    form_factor text, image_url text, verified_fields text[], completeness numeric, variant text
  );
  insert into robot_cards values
    ('h1','Humanoid one','h-one','unitree','Unitree','humanoid','/h1.png',array['payload','height'],90,'base'),
    ('h2','Humanoid two','h-two','unitree','Unitree','humanoid','/h2.png',array['height'],70,'base'),
    ('h3','Humanoid without image','h-three','unitree','Unitree','humanoid',null,array['height'],70,'base'),
    ('q1','Robot dog','dog-one','unitree','Unitree','quadruped','/q1.png',array['height'],60,'base'),
    ('a1','Mobile platform','mobile-platform','unitree','Unitree','amr_agv','/a1.png',array['a','b','c'],95,'base'),
    ('m1','Mobile arm','mobile-arm','unitree','Unitree','mobile_manipulator',null,array['a','b','c'],95,'base'),
    ('i1','Offscope industrial arm','offscope-arm','unitree','Unitree','industrial_arm','/i1.png',array['a','b','c','d'],99,'base'),
    ('d1','Offscope dedicated robot','offscope-dedicated','unitree','Unitree','dedicated_robot',null,array['a','b','c','d'],99,'base');`);
});
afterAll(async () => database.close());
const formFactors = ['humanoid', 'quadruped', 'mobile_manipulator'] as const;

describe('catalogue form-factor scope', () => {
  it('includes mobile manipulators in pagination totals and missing-picture counts before limiting', async () => {
    const result = await listRobotCards({ formFactors, limit: 1 });
    expect(result.robots.map(robot => robot.id)).toEqual(['h1']);
    expect(result.total).toBe(3);
    expect(result.hidden).toBe(2);
  });
  it('keeps mobile manipulators available and excludes mobile transport and factory classes', async () => {
    expect(await listRobotCards({ formFactor: 'amr_agv', pictures: 'all' })).toMatchObject({ robots: [], total: 0, hidden: 0 });
    expect(await listRobotCards({ formFactor: 'mobile_manipulator' })).toMatchObject({ robots: [], total: 0, hidden: 1 });
    expect((await listRobotCards({ formFactor: 'mobile_manipulator', pictures: 'all' })).robots.map(robot => robot.id)).toEqual(['m1']);
    expect(await listRobotCards({ formFactors, formFactor: 'industrial_arm' })).toMatchObject({ robots: [], total: 0, hidden: 0 });
    expect(await listRobotCards({ formFactors, q: 'Offscope' })).toMatchObject({ robots: [], total: 0, hidden: 0 });
    const humanoids = await listRobotCards({ formFactors, formFactor: 'humanoid' });
    expect(humanoids.total).toBe(2);
    expect(humanoids.hidden).toBe(1);
  });
  it('includes all three classes when showing all image statuses', async () => {
    const result = await listRobotCards({ formFactors, pictures: 'all' });
    expect(result.total).toBe(5);
    expect(result.hidden).toBe(0);
    expect(result.robots.map(robot => robot.id).sort()).toEqual(['h1', 'h2', 'h3', 'm1', 'q1']);
  });
  it('keeps narrower selections useful and leaves excluded archival rows intact', async () => {
    expect((await listRobotCards({ pictures: 'all' })).total).toBe(5);
    expect((await listRobotCards({ formFactors: ['humanoid', 'amr_agv', 'industrial_arm'], pictures: 'all' })).total).toBe(3);
    expect((await listRobotCards({ formFactors: ['humanoid', 'quadruped'], pictures: 'all' })).total).toBe(4);
    expect((await database.query<{ total: number }>('select count(*)::int as total from robot_cards')).rows[0].total).toBe(8);
    expect(await listRobotCards({ formFactors: [], pictures: 'all' })).toMatchObject({ robots: [], total: 0, hidden: 0 });
  });
});
