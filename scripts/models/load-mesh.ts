import './dom-polyfill';
import { readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { BufferGeometry, Color, Float32BufferAttribute, Matrix4, Mesh, Quaternion, Vector3, type Material, type MeshStandardMaterial } from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rpyToQuaternion, type Vec3 } from '@/lib/models/kinematics';
import type { Rgba, UrdfVisual } from './parse-urdf';

/**
 * One visual → primitives with positions, normals, indices and a colour,
 * already in the link frame (visual origin and scale baked in).
 *
 * STL and OBJ carry no up-axis. Collada does, and three's loader honours it by
 * rotating the scene — which RViz deliberately ignores, because a URDF author
 * placed the mesh assuming the file's raw axes. So the loader's rotation is
 * reset and only its unit scale kept: the "RViz rule".
 */
export type Primitive = {
  positions: Float32Array<ArrayBuffer>;
  normals: Float32Array<ArrayBuffer>;
  indices: Uint32Array<ArrayBuffer>;
  color: Rgba;
  name: string;
};

const DEFAULT_COLOR: Rgba = [0.62, 0.62, 0.64, 1];
const CREASE = Math.PI / 6;

/**
 * Weld by position only. STL is triangle soup and Collada from CAD is close
 * to it; a simplifier needs shared vertices to find edges to collapse, and
 * vertices split for normals count as seams it must not cross. So: weld on
 * position, decimate, and only then compute normals (see computeNormals).
 */
function finish(geo: BufferGeometry, color: Rgba, name: string): Primitive {
  const positionsOnly = new BufferGeometry();
  const src = geo.index ? geo.toNonIndexed() : geo;
  positionsOnly.setAttribute('position', src.getAttribute('position'));
  const g = mergeVertices(positionsOnly, 1e-5);
  const pos = g.getAttribute('position');
  const idx = g.index!;
  return {
    positions: new Float32Array(pos.array as ArrayLike<number>),
    normals: new Float32Array(0),
    indices: new Uint32Array(idx.array as ArrayLike<number>),
    color,
    name,
  };
}

/** Creased normals for a (decimated) position-welded primitive; re-splits vertices only at sharp edges. */
export function computeNormals(p: Primitive): Primitive {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p.positions, 3));
  g.setIndex(Array.from(p.indices));
  const creased = mergeVertices(toCreasedNormals(g.toNonIndexed(), CREASE));
  return {
    ...p,
    positions: new Float32Array(creased.getAttribute('position').array as ArrayLike<number>),
    normals: new Float32Array(creased.getAttribute('normal').array as ArrayLike<number>),
    indices: new Uint32Array(creased.index!.array as ArrayLike<number>),
  };
}

function bakeTransform(prim: Primitive, origin: { xyz: Vec3; rpy: Vec3 }, scale: Vec3): Primitive {
  const q = rpyToQuaternion(...origin.rpy);
  const m = new Matrix4().compose(new Vector3(...origin.xyz), new Quaternion(q[0], q[1], q[2], q[3]), new Vector3(...scale));
  const v = new Vector3();
  for (let i = 0; i < prim.positions.length; i += 3) {
    v.set(prim.positions[i], prim.positions[i + 1], prim.positions[i + 2]).applyMatrix4(m);
    prim.positions[i] = v.x;
    prim.positions[i + 1] = v.y;
    prim.positions[i + 2] = v.z;
  }
  // A negative scale flips winding.
  if (scale[0] * scale[1] * scale[2] < 0) {
    for (let i = 0; i < prim.indices.length; i += 3) [prim.indices[i + 1], prim.indices[i + 2]] = [prim.indices[i + 2], prim.indices[i + 1]];
  }
  return prim;
}

function materialColor(mat: Material | Material[] | undefined, fallback: Rgba): Rgba {
  const m = (Array.isArray(mat) ? mat[0] : mat) as MeshStandardMaterial | undefined;
  if (!m || !('color' in m) || !(m.color instanceof Color)) return fallback;
  const c = m.color;
  return [c.r, c.g, c.b, m.transparent ? m.opacity : 1];
}

function loadStl(absPath: string, color: Rgba, name: string): Primitive[] {
  const buf = readFileSync(absPath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const geo = new STLLoader().parse(ab);
  geo.deleteAttribute('color');
  geo.deleteAttribute('uv');
  return [finish(geo, color, name)];
}

function loadDae(absPath: string, fallback: Rgba, name: string): Primitive[] {
  const text = readFileSync(absPath, 'utf8');
  const result = new ColladaLoader().parse(text, dirname(absPath) + '/');
  if (!result?.scene) throw new Error(`Collada parse produced no scene: ${absPath}`);
  const scene = result.scene;
  // RViz rule: keep the unit scale, drop the up-axis rotation.
  scene.rotation.set(0, 0, 0);
  scene.updateMatrixWorld(true);
  const out: Primitive[] = [];
  scene.traverse((obj) => {
    if (!(obj as Mesh).isMesh) return;
    const mesh = obj as Mesh;
    const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    geo.deleteAttribute('uv');
    geo.deleteAttribute('uv1');
    geo.deleteAttribute('color');
    geo.deleteAttribute('skinIndex');
    geo.deleteAttribute('skinWeight');
    const groups = geo.groups.length ? geo.groups : [{ start: 0, count: geo.index ? geo.index.count : geo.getAttribute('position').count, materialIndex: 0 }];
    for (const g of groups) {
      // One primitive per material group: copy the group's vertices out explicitly.
      const src = geo.index ? Array.from(geo.index.array as ArrayLike<number>).slice(g.start, g.start + g.count) : null;
      const positions = geo.getAttribute('position');
      const pos = new Float32Array(g.count * 3);
      for (let i = 0; i < g.count; i++) {
        const vi = src ? src[i] : g.start + i;
        pos[i * 3] = positions.getX(vi);
        pos[i * 3 + 1] = positions.getY(vi);
        pos[i * 3 + 2] = positions.getZ(vi);
      }
      const color = materialColor(Array.isArray(mesh.material) ? mesh.material[g.materialIndex ?? 0] : mesh.material, fallback);
      out.push(finish(rebuild(pos), color, name));
    }
  });
  return out;
}

function rebuild(pos: Float32Array): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

function parseMtlKd(mtlPath: string): Record<string, Rgba> {
  const out: Record<string, Rgba> = {};
  let cur = '';
  try {
    for (const line of readFileSync(mtlPath, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (t.startsWith('newmtl ')) cur = t.slice(7).trim();
      else if (t.startsWith('Kd ') && cur) {
        const [r, g, b] = t.slice(3).trim().split(/\s+/).map(Number);
        out[cur] = [r, g, b, 1];
      }
    }
  } catch {
    // no mtl: default colour
  }
  return out;
}

function loadObj(absPath: string, fallback: Rgba, name: string): Primitive[] {
  const text = readFileSync(absPath, 'utf8');
  const mtlName = /^mtllib\s+(.+)$/m.exec(text)?.[1]?.trim();
  const kd = mtlName ? parseMtlKd(join(dirname(absPath), mtlName)) : {};
  const group = new OBJLoader().parse(text);
  const out: Primitive[] = [];
  group.traverse((obj) => {
    if (!(obj as Mesh).isMesh) return;
    const mesh = obj as Mesh;
    const geo = mesh.geometry.clone();
    geo.deleteAttribute('uv');
    geo.deleteAttribute('color');
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const groups = geo.groups.length ? geo.groups : [{ start: 0, count: geo.getAttribute('position').count, materialIndex: 0 }];
    for (const g of groups) {
      const positions = geo.getAttribute('position');
      const pos = new Float32Array(g.count * 3);
      for (let i = 0; i < g.count; i++) {
        const vi = g.start + i;
        pos[i * 3] = positions.getX(vi);
        pos[i * 3 + 1] = positions.getY(vi);
        pos[i * 3 + 2] = positions.getZ(vi);
      }
      const matName = (mats[g.materialIndex ?? 0] as Material | undefined)?.name ?? '';
      out.push(finish(rebuild(pos), kd[matName] ?? fallback, name));
    }
  });
  return out;
}

export function loadVisual(visual: UrdfVisual, linkName: string, colorOverride?: Rgba): Primitive[] {
  const color = colorOverride ?? visual.material?.rgba ?? DEFAULT_COLOR;
  let prims: Primitive[] = [];
  if (visual.mesh) {
    const ext = extname(visual.mesh.path).toLowerCase();
    if (ext === '.stl') prims = loadStl(visual.mesh.path, color, linkName);
    else if (ext === '.dae') prims = loadDae(visual.mesh.path, color, linkName);
    else if (ext === '.obj') prims = loadObj(visual.mesh.path, color, linkName);
    else throw new Error(`unsupported mesh format ${ext} (${visual.mesh.path})`);
    return prims.map((p) => bakeTransform(p, visual.origin, visual.mesh!.scale));
  }
  // Primitive shapes are rare in these repos; skip rather than approximate.
  return [];
}

export function triangleCount(prims: Primitive[]): number {
  return prims.reduce((n, p) => n + p.indices.length / 3, 0);
}
