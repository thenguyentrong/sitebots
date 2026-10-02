import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { getCompareRows } from './compare';
import { getManufacturer, listManufacturers } from './manufacturers';
import { getRobotDetail, listRobotPaths } from './robots';

let database: PGlite;
vi.mock('@/lib/db', () => ({ getSql: async () => {
  const query = async (text: string, values: unknown[] = []) => (await database.query(text, values)).rows;
  const tagged = (parts: TemplateStringsArray, ...values: unknown[]) => query(parts.reduce((text, part, index) => text + (index ? `$${index}` : '') + part, ''), values);
  return Object.assign(tagged, { query });
} }));

const humanoid = '00000000-0000-0000-0000-000000000001';
const dog = '00000000-0000-0000-0000-000000000002';
const mobileArm = '00000000-0000-0000-0000-000000000003';
const mobilePlatform = '00000000-0000-0000-0000-000000000004';
const excluded = '00000000-0000-0000-0000-000000000005';

beforeAll(async () => {
  database = new PGlite();
  await database.exec(`
    create table manufacturers (id integer primary key, slug text, name text, country text, website_url text, description text);
    insert into manufacturers values (1,'unitree','Unitree Robotics','CN',null,null);
    create table robots (id uuid primary key, manufacturer_id integer, model_slug text, form_factor text, updated_at timestamptz, variant text default 'base');
    insert into robots (id,manufacturer_id,model_slug,form_factor,updated_at) values
      ('${humanoid}',1,'h1','humanoid','2026-10-01'),
      ('${dog}',1,'go2','quadruped','2026-10-01'),
      ('${mobileArm}',1,'mobile-arm','mobile_manipulator','2026-10-01'),
      ('${mobilePlatform}',1,'mobile-platform','amr_agv','2026-10-01'),
      ('${excluded}',1,'archived-industrial-arm','industrial_arm','2026-10-01');
    create table robot_current (robot_id uuid, verified_fields text[], built_at timestamptz, conflicts jsonb default '[]');
    insert into robot_current (robot_id,verified_fields,built_at) values
      ('${humanoid}',array['height'],'2026-10-01'),
      ('${dog}',array['height'],'2026-10-01'),
      ('${mobileArm}',array['payload'],'2026-10-01'),
      ('${mobilePlatform}',array['payload'],'2026-10-01'),
      ('${excluded}',array['a','b','c'],'2026-10-01');
    create table robot_cards (id uuid, name text, manufacturer_slug text, model_slug text, form_factor text, variant text);
    insert into robot_cards values
      ('${humanoid}','H1','unitree','h1','humanoid','base'),
      ('${dog}','Go2','unitree','go2','quadruped','base'),
      ('${mobileArm}','Mobile arm fixture','unitree','mobile-arm','mobile_manipulator','base'),
      ('${mobilePlatform}','Mobile platform fixture','unitree','mobile-platform','amr_agv','base'),
      ('${excluded}','Archived industrial arm fixture','unitree','archived-industrial-arm','industrial_arm','base');
    create table price_current (robot_id uuid, tier integer, region text, config text);
    create table availability_current (robot_id uuid, region text);
    create table robot_sources (robot_id uuid, source_id text, source_url text, observed_at timestamptz, facts jsonb);
    create table sources (id text, name text, kind text, tier integer, attribution_text text);
    create table robot_assets (robot_id uuid, url text, alt text, licence text, attribution text, source_url text, width integer, height integer, kind text, is_primary boolean, sort integer);
  `);
});
afterAll(async () => database.close());

describe('public catalogue surfaces preserve mobile robots in the focused scope', () => {
  it('serves mobile manipulator profiles and excludes mobile transport and unrelated archived classes', async () => {
    expect((await getRobotDetail('unitree', 'mobile-arm'))?.robot.id).toBe(mobileArm);
    expect(await getRobotDetail('unitree', 'mobile-platform')).toBeNull();
    expect(await getRobotDetail('unitree', 'archived-industrial-arm')).toBeNull();
  });
  it('compares mobile manipulators while dropping AMR and other excluded IDs', async () => {
    const result = await getCompareRows([excluded, mobilePlatform, mobileArm, dog]);
    expect(result.map(row => row.card.id)).toEqual([mobileArm, dog]);
    expect((await getCompareRows([humanoid, dog])).map(row => row.card.id)).toEqual([humanoid, dog]);
  });
  it('includes mobile manipulator paths and excludes AMR and factory classes in the sitemap', async () => {
    expect((await listRobotPaths()).map(row => row.slug)).toEqual(['go2', 'h1', 'mobile-arm']);
  });
  it('counts and returns all three classes on manufacturer pages without deleting archive rows', async () => {
    const manufacturers = await listManufacturers();
    expect(manufacturers).toHaveLength(1);
    expect(manufacturers[0]).toMatchObject({ robots: 3, models: 3, humanoids: 1, quadrupeds: 1, verified_values: 3 });
    const manufacturer = await getManufacturer('unitree');
    expect(manufacturer?.robots.map(robot => robot.id).sort()).toEqual([humanoid, dog, mobileArm]);
    expect((await database.query<{ count: number }>('select count(*)::int as count from robots')).rows[0].count).toBe(5);
  });
});
