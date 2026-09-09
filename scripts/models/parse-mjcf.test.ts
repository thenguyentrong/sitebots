import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { parseMjcf } from './parse-mjcf';

// A trimmed Menagerie-style model: compiler meshdir, nested default classes,
// mesh assets, a body tree with one hinge, a body with two joints, a fixed
// body, and a collision geom that must be dropped.
const XML = `<mujoco model="mini">
  <compiler angle="radian" meshdir="assets"/>
  <default>
    <geom contype="0" group="1"/>
    <joint limited="true"/>
    <default class="visual"><geom type="mesh" group="2"/>
      <default class="dark"><geom rgba="0.1 0.1 0.1 1"/></default>
    </default>
    <default class="collision"><geom group="3"/></default>
  </default>
  <asset>
    <mesh file="torso.stl"/>
    <mesh name="arm" file="sub/arm.STL" scale="0.001 0.001 0.001"/>
  </asset>
  <worldbody>
    <body name="torso" pos="0 0 1" childclass="visual">
      <freejoint/>
      <geom mesh="torso" class="dark"/>
      <geom mesh="torso" class="collision"/>
      <body name="upper_arm" pos="0.1 0.2 0.3">
        <joint name="shoulder" axis="0 1 0" range="-1.5 1.5" actuatorfrcrange="-40 40"/>
        <geom mesh="arm"/>
        <body name="wrist" pos="0 0 -0.3">
          <joint name="wrist_a" axis="1 0 0" range="-1 1"/>
          <joint name="wrist_b" axis="0 0 1" range="-2 2"/>
          <geom mesh="arm"/>
        </body>
      </body>
      <body name="plate" pos="0 0 0.5"><geom mesh="torso"/></body>
    </body>
  </worldbody>
</mujoco>`;

const ctx = { urdfDir: '/repo/model', srcRoot: '/repo', packages: {} };

describe('parseMjcf', () => {
  const m = parseMjcf(XML, ctx);

  it('roots at the free body and turns nested bodies into links', () => {
    expect(m.rootLink).toBe('torso');
    expect([...m.links.keys()].sort()).toEqual(['plate', 'torso', 'upper_arm', 'wrist', 'wrist__1'].sort());
  });

  it('resolves meshes through meshdir and keeps the asset scale', () => {
    const torso = m.links.get('torso')!;
    expect(torso.visuals).toHaveLength(1); // the collision geom (group 3) is gone
    expect(torso.visuals[0].mesh!.path).toBe(join('/repo/model', 'assets', 'torso.stl'));
    expect(torso.visuals[0].material?.rgba).toEqual([0.1, 0.1, 0.1, 1]); // from the dark class
    expect(m.links.get('upper_arm')!.visuals[0].mesh!.scale).toEqual([0.001, 0.001, 0.001]);
  });

  it('carries joint origin, axis, range and peak torque', () => {
    const j = m.joints.find((x) => x.name === 'shoulder')!;
    expect(j.parent).toBe('torso');
    expect(j.child).toBe('upper_arm');
    expect(j.origin.xyz).toEqual([0.1, 0.2, 0.3]);
    expect(j.axis).toEqual([0, 1, 0]);
    expect(j.limit).toMatchObject({ lower: -1.5, upper: 1.5, effort: 40 });
  });

  it('splits a two-joint body into a chain and fixes a joint-less body', () => {
    const a = m.joints.find((x) => x.name === 'wrist_a')!;
    const b = m.joints.find((x) => x.name === 'wrist_b')!;
    expect(a.child).toBe('wrist__1');
    expect(b.parent).toBe('wrist__1');
    expect(b.child).toBe('wrist');
    expect(m.links.get('wrist__1')!.visuals).toHaveLength(0);
    expect(m.joints.find((x) => x.child === 'plate')!.type).toBe('fixed');
  });

  it('converts degrees when the compiler says so', () => {
    const deg = parseMjcf(XML.replace('angle="radian"', 'angle="degree"').replace('range="-1.5 1.5"', 'range="-90 90"'), ctx);
    const j = deg.joints.find((x) => x.name === 'shoulder')!;
    expect(j.limit!.lower).toBeCloseTo(-Math.PI / 2, 6);
  });
});
