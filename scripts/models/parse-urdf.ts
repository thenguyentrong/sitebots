import './dom-polyfill';
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { posix } from 'node:path';
import type { Vec3 } from '@/lib/models/kinematics';

/**
 * A URDF walk on xmldom. urdf-loader's parser needs querySelector, which
 * xmldom does not have; this is the ~150 lines that do the same job with
 * childNodes and getAttribute, and resolve mesh paths the way ROS would
 * (package://pkg/…, file://, or relative to the URDF).
 */

export type Rgba = [number, number, number, number];

export type UrdfVisual = {
  mesh?: { path: string; scale: Vec3 };
  box?: Vec3;
  cylinder?: { radius: number; length: number };
  sphere?: { radius: number };
  origin: { xyz: Vec3; rpy: Vec3 };
  material?: { name?: string; rgba?: Rgba };
};

export type UrdfLink = { name: string; visuals: UrdfVisual[] };

export type UrdfJoint = {
  name: string;
  type: 'revolute' | 'continuous' | 'prismatic' | 'fixed' | 'floating' | 'planar';
  parent: string;
  child: string;
  origin: { xyz: Vec3; rpy: Vec3 };
  axis: Vec3;
  limit?: { lower: number; upper: number; effort?: number; velocity?: number };
  mimic?: { joint: string; multiplier: number; offset: number };
};

export type UrdfModel = {
  name: string;
  links: Map<string, UrdfLink>;
  joints: UrdfJoint[];
  materials: Map<string, Rgba>;
  rootLink: string;
};

export type ResolveContext = {
  /** Absolute directory of the URDF file. */
  urdfDir: string;
  /** Absolute root of the fetched source tree (repo root). */
  srcRoot: string;
  /** package name → repo-relative path. */
  packages: Record<string, string>;
};

type El = Element;

function children(el: El, tag: string): El[] {
  const out: El[] = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const n = el.childNodes[i];
    if (n.nodeType === 1 && (n as El).tagName === tag) out.push(n as El);
  }
  return out;
}

function child(el: El, tag: string): El | null {
  return children(el, tag)[0] ?? null;
}

function vec3(text: string | null | undefined, dflt: Vec3): Vec3 {
  if (!text) return dflt;
  const p = text.trim().split(/\s+/).map(Number);
  return p.length === 3 && p.every(Number.isFinite) ? (p as Vec3) : dflt;
}

function origin(el: El | null): { xyz: Vec3; rpy: Vec3 } {
  const o = el ? child(el, 'origin') : null;
  return { xyz: vec3(o?.getAttribute('xyz'), [0, 0, 0]), rpy: vec3(o?.getAttribute('rpy'), [0, 0, 0]) };
}

/** Case-exact existence: Windows would open "pelvis.stl" for "pelvis.STL" and the build would break on Linux. */
export function assertCaseExact(absPath: string): void {
  const dir = dirname(absPath);
  const name = basename(absPath);
  if (!existsSync(absPath)) throw new Error(`mesh not found: ${absPath}`);
  if (!readdirSync(dir).includes(name)) throw new Error(`mesh path differs in case from the file on disk: ${absPath}`);
}

/** package://pkg/a/b.stl → <srcRoot>/<packages[pkg]>/a/b.stl; relative → next to the URDF; file:// → stripped. */
export function resolveMeshPath(filename: string, ctx: ResolveContext): string {
  const f = filename.trim();
  const pkg = /^package:\/\/([^/]+)\/(.*)$/.exec(f);
  if (pkg) {
    const base = ctx.packages[pkg[1]];
    if (base === undefined) throw new Error(`package "${pkg[1]}" not in sources.json packages (${f})`);
    return join(ctx.srcRoot, ...posix.normalize(base).split('/'), ...pkg[2].split('/'));
  }
  if (f.startsWith('file://')) return f.slice('file://'.length);
  return join(ctx.urdfDir, ...posix.normalize(f).split('/'));
}

export function parseUrdf(xml: string, ctx: ResolveContext): UrdfModel {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const robot = doc.documentElement;
  if (!robot || robot.tagName !== 'robot') throw new Error('not a URDF: no <robot> root');

  const materials = new Map<string, Rgba>();
  for (const m of children(robot, 'material')) {
    const color = child(m, 'color');
    const rgba = color?.getAttribute('rgba');
    const name = m.getAttribute('name');
    if (name && rgba) {
      const p = rgba.trim().split(/\s+/).map(Number);
      if (p.length === 4) materials.set(name, p as Rgba);
    }
  }

  const links = new Map<string, UrdfLink>();
  for (const l of children(robot, 'link')) {
    const name = l.getAttribute('name') ?? '';
    const visuals: UrdfVisual[] = [];
    for (const v of children(l, 'visual')) {
      const geom = child(v, 'geometry');
      const vis: UrdfVisual = { origin: origin(v) };
      const mesh = geom ? child(geom, 'mesh') : null;
      if (mesh) {
        vis.mesh = { path: resolveMeshPath(mesh.getAttribute('filename') ?? '', ctx), scale: vec3(mesh.getAttribute('scale'), [1, 1, 1]) };
      }
      const box = geom ? child(geom, 'box') : null;
      if (box) vis.box = vec3(box.getAttribute('size'), [0.1, 0.1, 0.1]);
      const cyl = geom ? child(geom, 'cylinder') : null;
      if (cyl) vis.cylinder = { radius: Number(cyl.getAttribute('radius') ?? 0.05), length: Number(cyl.getAttribute('length') ?? 0.1) };
      const sph = geom ? child(geom, 'sphere') : null;
      if (sph) vis.sphere = { radius: Number(sph.getAttribute('radius') ?? 0.05) };
      const mat = child(v, 'material');
      if (mat) {
        const rgba = child(mat, 'color')?.getAttribute('rgba');
        const p = rgba ? rgba.trim().split(/\s+/).map(Number) : null;
        vis.material = { name: mat.getAttribute('name') ?? undefined, rgba: p && p.length === 4 ? (p as Rgba) : undefined };
        if (vis.material.name && !vis.material.rgba && materials.has(vis.material.name)) vis.material.rgba = materials.get(vis.material.name);
      }
      visuals.push(vis);
    }
    links.set(name, { name, visuals });
  }

  const joints: UrdfJoint[] = [];
  for (const j of children(robot, 'joint')) {
    const type = (j.getAttribute('type') ?? 'fixed') as UrdfJoint['type'];
    const limit = child(j, 'limit');
    const mimic = child(j, 'mimic');
    const axisRaw = vec3(child(j, 'axis')?.getAttribute('xyz'), [1, 0, 0]);
    const len = Math.hypot(...axisRaw) || 1;
    const joint: UrdfJoint = {
      name: j.getAttribute('name') ?? '',
      type,
      parent: child(j, 'parent')?.getAttribute('link') ?? '',
      child: child(j, 'child')?.getAttribute('link') ?? '',
      origin: origin(j),
      axis: [axisRaw[0] / len, axisRaw[1] / len, axisRaw[2] / len],
    };
    if (limit) {
      joint.limit = {
        lower: Number(limit.getAttribute('lower') ?? 0),
        upper: Number(limit.getAttribute('upper') ?? 0),
        effort: Number(limit.getAttribute('effort') ?? NaN) || undefined,
        velocity: Number(limit.getAttribute('velocity') ?? NaN) || undefined,
      };
    } else if (type === 'continuous') {
      joint.limit = { lower: -Math.PI, upper: Math.PI };
    }
    if (mimic) {
      joint.mimic = { joint: mimic.getAttribute('joint') ?? '', multiplier: Number(mimic.getAttribute('multiplier') ?? 1), offset: Number(mimic.getAttribute('offset') ?? 0) };
    }
    joints.push(joint);
  }

  // Root: the link that is nobody's child. A visual-less "world" hanging a
  // floating base off it is dropped so the pelvis becomes the root.
  const childLinks = new Set(joints.map((j) => j.child));
  let roots = [...links.keys()].filter((n) => !childLinks.has(n));
  for (const r of [...roots]) {
    const link = links.get(r)!;
    const outgoing = joints.filter((j) => j.parent === r);
    if (link.visuals.length === 0 && outgoing.length === 1 && (outgoing[0].type === 'floating' || outgoing[0].type === 'fixed')) {
      links.delete(r);
      joints.splice(joints.indexOf(outgoing[0]), 1);
      roots = [outgoing[0].child];
    }
  }
  if (roots.length !== 1) throw new Error(`URDF has ${roots.length} root links: ${roots.join(', ')}`);

  return { name: robot.getAttribute('name') ?? 'robot', links, joints, materials, rootLink: roots[0] };
}

/** Every mesh the visuals reference, absolute, deduplicated. */
export function visualMeshPaths(model: UrdfModel): string[] {
  const out = new Set<string>();
  for (const l of model.links.values()) for (const v of l.visuals) if (v.mesh) out.add(v.mesh.path);
  return [...out];
}
