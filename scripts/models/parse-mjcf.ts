import './dom-polyfill';
import { dirname, join } from 'node:path';
import { posix } from 'node:path';
import { axisAngleToQuaternion, multiplyQuaternions, type Quat, type Vec3 } from '@/lib/models/kinematics';
import type { ResolveContext, Rgba, UrdfJoint, UrdfLink, UrdfModel, UrdfVisual } from './parse-urdf';

/**
 * MJCF (MuJoCo) → the same UrdfModel the URDF walk produces, so load-mesh and
 * build-glb need no second code path. Written for the MuJoCo Menagerie style:
 * <compiler meshdir>, nested <default class> blocks, <asset><mesh>, a
 * <worldbody> of nested <body> elements each carrying <joint> and <geom>.
 *
 * Two MJCF ideas have no URDF equivalent and are folded in here:
 *  - a joint may sit away from its body's origin (`pos`), so the URDF joint
 *    origin is moved there and the body's geometry shifted back;
 *  - a body may carry several joints (a 2-DOF wrist), which becomes a chain
 *    of one-joint links named body__1, body__2 …
 */

type El = Element;
type Attrs = Record<string, string>;

function kids(el: El, tag?: string): El[] {
  const out: El[] = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const n = el.childNodes[i];
    if (n.nodeType === 1 && (!tag || (n as El).tagName === tag)) out.push(n as El);
  }
  return out;
}

function attrs(el: El): Attrs {
  const out: Attrs = {};
  for (let i = 0; i < el.attributes.length; i++) out[el.attributes[i].name] = el.attributes[i].value;
  return out;
}

function nums(s: string | undefined, n: number, dflt: number[]): number[] {
  if (!s) return dflt;
  const p = s.trim().split(/\s+/).map(Number);
  return p.length >= n && p.slice(0, n).every(Number.isFinite) ? p.slice(0, n) : dflt;
}

/** ZYX (yaw-pitch-roll) Euler angles from a quaternion — what URDF's rpy means. */
function quatToRpy(q: Quat): Vec3 {
  const [x, y, z, w] = q;
  const sinr = 2 * (w * x + y * z);
  const cosr = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr, cosr);
  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * (Math.PI / 2) : Math.asin(sinp);
  const siny = 2 * (w * z + x * y);
  const cosy = 1 - 2 * (y * y + z * z);
  return [roll, pitch, Math.atan2(siny, cosy)];
}

const AXIS: Record<string, Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

/**
 * Orientation of an element from whichever MJCF attribute it uses:
 * quat (w x y z), euler (per compiler eulerseq; lowercase = intrinsic),
 * axisangle (x y z angle). Angles in degrees unless the compiler says radian.
 */
function orientation(a: Attrs, c: Compiler): Quat {
  const toRad = (v: number) => (c.angle === 'degree' ? (v * Math.PI) / 180 : v);
  if (a.quat) {
    const [w, x, y, z] = nums(a.quat, 4, [1, 0, 0, 0]);
    return [x, y, z, w];
  }
  if (a.axisangle) {
    const [x, y, z, ang] = nums(a.axisangle, 4, [0, 0, 1, 0]);
    const len = Math.hypot(x, y, z) || 1;
    return axisAngleToQuaternion([x / len, y / len, z / len], toRad(ang));
  }
  if (a.euler) {
    const e = nums(a.euler, 3, [0, 0, 0]).map(toRad);
    const seq = c.eulerseq;
    const intrinsic = seq === seq.toLowerCase();
    let q: Quat = [0, 0, 0, 1];
    const parts = seq.toLowerCase().split('').map((ax, i) => axisAngleToQuaternion(AXIS[ax] ?? AXIS.z, e[i]));
    // Intrinsic: rotate about the moving frame → compose in order. Extrinsic: fixed frame → reverse.
    for (const p of intrinsic ? parts : [...parts].reverse()) q = multiplyQuaternions(q, p);
    return q;
  }
  return [0, 0, 0, 1];
}

type Compiler = { meshdir: string; angle: 'radian' | 'degree'; eulerseq: string };

/** Class defaults: a stack of attribute maps, child classes overriding parents. */
class Defaults {
  private classes = new Map<string, Record<string, Attrs>>(); // class → element tag → attrs
  private parentOf = new Map<string, string | null>();

  constructor(root: El) {
    for (const d of kids(root, 'default')) this.read(d, null);
  }
  private read(d: El, parent: string | null) {
    const name = d.getAttribute('class') ?? 'main';
    this.parentOf.set(name, parent);
    const table: Record<string, Attrs> = {};
    for (const k of kids(d)) {
      if (k.tagName === 'default') continue;
      table[k.tagName] = attrs(k);
    }
    this.classes.set(name, table);
    for (const k of kids(d, 'default')) this.read(k, name);
  }
  /** Resolved attributes for an element: main → … → its class, then its own. */
  resolve(el: El, tag: string, fallbackClass: string | null): Attrs {
    const own = attrs(el);
    const chain: string[] = [];
    let cls: string | null = own.class ?? fallbackClass ?? 'main';
    while (cls) {
      chain.unshift(cls);
      cls = this.parentOf.get(cls) ?? null;
    }
    if (!chain.includes('main')) chain.unshift('main');
    const out: Attrs = {};
    for (const c of chain) Object.assign(out, this.classes.get(c)?.[tag] ?? {});
    return Object.assign(out, own);
  }
}

export function parseMjcf(xml: string, ctx: ResolveContext): UrdfModel {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;
  if (!root || root.tagName !== 'mujoco') throw new Error('not an MJCF file: no <mujoco> root');
  const comp = kids(root, 'compiler')[0];
  const c: Compiler = {
    meshdir: comp?.getAttribute('meshdir') ?? comp?.getAttribute('assetdir') ?? '',
    angle: (comp?.getAttribute('angle') as Compiler['angle']) ?? 'degree',
    eulerseq: comp?.getAttribute('eulerseq') ?? 'xyz',
  };
  const defaults = new Defaults(root);
  const toRad = (v: number) => (c.angle === 'degree' ? (v * Math.PI) / 180 : v);

  // Assets: mesh name → file (+ scale), material name → rgba.
  const meshes = new Map<string, { path: string; scale: Vec3 }>();
  const materials = new Map<string, Rgba>();
  for (const asset of kids(root, 'asset')) {
    for (const m of kids(asset, 'mesh')) {
      const a = defaults.resolve(m, 'mesh', null);
      if (!a.file) continue;
      const name = a.name ?? posix.basename(a.file).replace(/\.[^.]+$/, '');
      meshes.set(name, { path: join(ctx.urdfDir, ...posix.normalize(posix.join(c.meshdir, a.file)).split('/')), scale: nums(a.scale, 3, [1, 1, 1]) as Vec3 });
    }
    for (const m of kids(asset, 'material')) {
      const a = attrs(m);
      if (a.name && a.rgba) materials.set(a.name, nums(a.rgba, 4, [0.7, 0.7, 0.7, 1]) as Rgba);
    }
  }

  const links = new Map<string, UrdfLink>();
  const joints: UrdfJoint[] = [];
  let rootLink = '';

  const visualsOf = (body: El, cls: string | null, shift: Vec3): UrdfVisual[] => {
    const out: UrdfVisual[] = [];
    for (const g of kids(body, 'geom')) {
      const a = defaults.resolve(g, 'geom', cls);
      const type = a.type ?? (a.mesh ? 'mesh' : 'sphere');
      if (type !== 'mesh' || !a.mesh) continue;
      if (a.group === '3') continue; // Menagerie's collision group
      const mesh = meshes.get(a.mesh);
      if (!mesh) throw new Error(`geom references unknown mesh "${a.mesh}"`);
      const rgba = a.rgba ? (nums(a.rgba, 4, [0.7, 0.7, 0.7, 1]) as Rgba) : a.material ? materials.get(a.material) : undefined;
      if (rgba && rgba[3] === 0) continue;
      const pos = nums(a.pos, 3, [0, 0, 0]);
      out.push({
        mesh: { path: mesh.path, scale: mesh.scale },
        origin: { xyz: [pos[0] - shift[0], pos[1] - shift[1], pos[2] - shift[2]], rpy: quatToRpy(orientation(a, c)) },
        material: rgba ? { name: a.material, rgba } : a.material ? { name: a.material } : undefined,
      });
    }
    return out;
  };

  const walk = (body: El, parent: string | null, parentClass: string | null) => {
    const ba = attrs(body);
    const name = ba.name ?? `body_${links.size}`;
    const cls = ba.childclass ?? parentClass;
    const bodyPos = nums(ba.pos, 3, [0, 0, 0]) as Vec3;
    const bodyQuat = orientation(ba, c);
    const jointEls = kids(body, 'joint');
    const free = kids(body, 'freejoint').length > 0 || jointEls.some((j) => (j.getAttribute('type') ?? '') === 'free');
    const movable = jointEls.filter((j) => (defaults.resolve(j, 'joint', cls).type ?? 'hinge') !== 'free');

    if (!parent || free) {
      // Root body: its own frame is the model frame.
      links.set(name, { name, visuals: visualsOf(body, cls, [0, 0, 0]) });
      if (!rootLink) rootLink = name;
      else joints.push({ name: `${name}_fixed`, type: 'fixed', parent: rootLink, child: name, origin: { xyz: bodyPos, rpy: quatToRpy(bodyQuat) }, axis: [1, 0, 0] });
      for (const child of kids(body, 'body')) walk(child, name, cls);
      return;
    }

    // A joint anchored away from the body origin: put the URDF joint there and
    // pull the geometry back by the same offset so nothing moves at zero pose.
    const firstJoint = movable[0] ? defaults.resolve(movable[0], 'joint', cls) : null;
    const anchor = nums(firstJoint?.pos, 3, [0, 0, 0]) as Vec3;
    const originXyz: Vec3 = [bodyPos[0], bodyPos[1], bodyPos[2]];
    if (anchor.some((v) => v !== 0)) {
      const r = rotate(bodyQuat, anchor);
      originXyz[0] += r[0];
      originXyz[1] += r[1];
      originXyz[2] += r[2];
    }
    const rpy = quatToRpy(bodyQuat);

    if (!movable.length) {
      links.set(name, { name, visuals: visualsOf(body, cls, [0, 0, 0]) });
      joints.push({ name: `${name}_fixed`, type: 'fixed', parent, child: name, origin: { xyz: bodyPos, rpy }, axis: [1, 0, 0] });
    } else {
      let prev = parent;
      movable.forEach((jEl, i) => {
        const a = defaults.resolve(jEl, 'joint', cls);
        const last = i === movable.length - 1;
        const linkName = last ? name : `${name}__${i + 1}`;
        const base: UrdfJoint['type'] = a.type === 'slide' ? 'prismatic' : a.type === 'ball' ? 'floating' : 'revolute';
        const ax = nums(a.axis, 3, [0, 0, 1]);
        const len = Math.hypot(ax[0], ax[1], ax[2]) || 1;
        const range = a.range ? nums(a.range, 2, [0, 0]) : null;
        const limited = a.limited === 'true' || (a.limited !== 'false' && !!range && (range[0] !== 0 || range[1] !== 0));
        const frc = a.actuatorfrcrange ? nums(a.actuatorfrcrange, 2, [0, 0]) : null;
        const joint: UrdfJoint = {
          name: a.name ?? `${name}_joint${i + 1}`,
          type: base === 'revolute' && !limited ? 'continuous' : base,
          parent: prev,
          child: linkName,
          origin: i === 0 ? { xyz: originXyz, rpy } : { xyz: [0, 0, 0], rpy: [0, 0, 0] },
          axis: [ax[0] / len, ax[1] / len, ax[2] / len],
        };
        if (range && limited) joint.limit = { lower: base === 'prismatic' ? range[0] : toRad(range[0]), upper: base === 'prismatic' ? range[1] : toRad(range[1]) };
        else if (joint.type === 'continuous') joint.limit = { lower: -Math.PI, upper: Math.PI };
        if (frc && joint.limit) joint.limit.effort = Math.max(Math.abs(frc[0]), Math.abs(frc[1])) || undefined;
        joints.push(joint);
        links.set(linkName, { name: linkName, visuals: last ? visualsOf(body, cls, anchor) : [] });
        prev = linkName;
      });
    }
    for (const child of kids(body, 'body')) walk(child, name, cls);
  };

  const world = kids(root, 'worldbody')[0];
  if (!world) throw new Error('MJCF has no <worldbody>');
  const top = kids(world, 'body');
  if (!top.length) throw new Error('MJCF worldbody has no <body>');
  for (const b of top) walk(b, null, null);
  if (!rootLink) throw new Error('MJCF: no root body');
  return { name: root.getAttribute('model') ?? 'robot', links, joints, materials, rootLink };
}

function rotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}
