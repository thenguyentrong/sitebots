import { describe, expect, it } from 'vitest';
import { groupByRobot, project, scenePicture, settingTiles, usePoints } from './use-case-views';
import { loadUseCases } from './use-cases';

describe('use-case pictures', () => {
  const all = loadUseCases();

  it('puts every placed use on the map, inside the world frame', () => {
    const { points, unplaced, countries } = usePoints(all);
    expect(points.length).toBeGreaterThan(20);
    expect(countries.find((c) => c.code === 'DE')?.count).toBeGreaterThan(10);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(900);
      expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(450);
    }
    expect(unplaced).toBe(all.filter((use) => !use.countries.length && !(use.where && use.place)).length);
    expect(project(13.41, 52.52)).toEqual({ x: (13.41 + 180) * 2.5, y: (90 - 52.52) * 2.5 });
  });

  it('shows each robot once per group, and sister models with the same projects on one card', () => {
    const groups = groupByRobot(all);
    const ids = groups.flatMap((g) => [g.robotId, ...g.variants.map((v) => v.href)]);
    expect(new Set(ids).size).toBe(ids.length);
    const counted = groups.reduce((n, g) => n + g.uses.length * (1 + g.variants.length), 0);
    expect(counted).toBe(all.length);
  });

  it('gives each setting tile a different photo', () => {
    const tiles = settingTiles(all);
    const srcs = tiles.flatMap((t) => t.picture ? [t.picture.src] : []);
    expect(new Set(srcs).size).toBe(srcs.length);
    expect(tiles.reduce((n, t) => n + t.count, 0)).toBe(all.length);
  });

  it('prefers a described photo of work over a plain product shot', () => {
    const shot = { src: '/a.webp', width: 900, height: 900, credit: 'x', pageUrl: '', alt: 'Robot, front view on a white background' };
    const work = { src: '/b.webp', width: 900, height: 600, credit: 'x', pageUrl: '', alt: 'Robot drilling the ceiling on a building site' };
    expect(scenePicture({ picture: shot, gallery: [work] })).toMatchObject({ src: '/b.webp', scene: true });
    expect(scenePicture({ picture: shot, gallery: [work] }, new Set(['/b.webp']))).toMatchObject({ src: '/a.webp', scene: false });
  });
});
