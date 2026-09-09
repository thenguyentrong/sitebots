import { Document, NodeIO, type Material, type Node as GltfNode } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { multiplyQuaternions, rotateVector, rpyToQuaternion, sanitizeNodeName, Z_UP_TO_Y_UP } from '@/lib/models/kinematics';
import type { JointDef, JointsFile, ModelSource } from '@/lib/models/schemas';
import { computeNormals, loadVisual, triangleCount, type Primitive } from './load-mesh';
import type { Rgba, UrdfModel } from './parse-urdf';

/**
 * URDF model + meshes → one GLB whose node tree is the link tree, plus the
 * joints sidecar the viewer needs to pose it. The joint origin becomes the
 * child node's TRS; the axis, type and limits go into the sidecar (and into
 * node extras, so the GLB is self-describing for anyone else).
 *
 * Decimation: a triangle budget for the whole robot, shared out per primitive
 * by size, with a floor so fingers and cables do not collapse. Then weld,
 * dedup, prune and meshopt compression.
 */

export type BuildResult = {
  glb: Uint8Array;
  joints: JointsFile;
  stats: { trianglesBefore: number; trianglesAfter: number; bytes: number; links: number; joints: number; modelHeightM: number; perLink: { link: string; before: number; after: number }[] };
};

const MIN_LINK_TRIS = 300;
const MAX_LINK_TRIS = 6000;
const MAX_BYTES = 6 * 1024 * 1024;

function hexToRgba(hex: string): Rgba {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}

function colorKey(c: Rgba): string {
  return c.map((v) => Math.round(v * 255)).join(',');
}

/**
 * Decimate one primitive to about `targetTris` with meshoptimizer directly.
 * CAD-derived robot meshes are hundreds of disconnected shells (screws,
 * cable ties, fillets); a topology-preserving simplifier cannot collapse
 * those, so the `Prune` flag — drop small disconnected components — is what
 * gets a 150k-triangle torso down to a few thousand. Unused vertices are
 * compacted afterwards so the buffers shrink too.
 */
function decimate(p: Primitive, targetTris: number, error: number): Primitive {
  const before = p.indices.length / 3;
  if (before <= targetTris) return p;
  const targetIndexCount = Math.max(3, Math.floor(targetTris)) * 3;
  const [idx] = MeshoptSimplifier.simplify(p.indices, p.positions, 3, targetIndexCount, error, ['Prune']);
  const remap = new Map<number, number>();
  const indices = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) {
    let n = remap.get(idx[i]);
    if (n === undefined) {
      n = remap.size;
      remap.set(idx[i], n);
    }
    indices[i] = n;
  }
  const positions = new Float32Array(remap.size * 3);
  for (const [oldI, newI] of remap) positions.set(p.positions.subarray(oldI * 3, oldI * 3 + 3), newI * 3);
  return { ...p, positions, normals: new Float32Array(0), indices };
}

export async function buildGlb(model: UrdfModel, src: ModelSource, log: (m: string) => void): Promise<BuildResult> {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;

  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene('robot');
  const root = doc.createNode('robot_root').setRotation(Z_UP_TO_Y_UP).setExtras({ urdf: { name: model.name, upAxis: 'Z' } });
  scene.addChild(root);

  const materials = new Map<string, Material>();
  const material = (c: Rgba): Material => {
    const key = colorKey(c);
    let m = materials.get(key);
    if (!m) {
      m = doc.createMaterial(`c${key}`).setBaseColorFactor([c[0], c[1], c[2], 1]).setRoughnessFactor(0.6).setMetallicFactor(0.15);
      m.setAlphaMode('OPAQUE');
      materials.set(key, m);
    }
    return m;
  };

  const excluded = new Set(src.excludeLinks);
  const hasChildren = new Set(model.joints.map((j) => j.parent));
  const perLink: { link: string; before: number; after: number }[] = [];
  let trianglesBefore = 0;

  // Load all primitives first so the budget can be shared out by size.
  const loaded = new Map<string, Primitive[]>();
  for (const link of model.links.values()) {
    if (excluded.has(link.name) && !hasChildren.has(link.name)) continue;
    if (excluded.has(link.name)) continue;
    const prims: Primitive[] = [];
    for (const v of link.visuals) {
      const override = src.colors[link.name] ? hexToRgba(src.colors[link.name]) : v.material?.name && src.materialColors[v.material.name] ? hexToRgba(src.materialColors[v.material.name]) : undefined;
      prims.push(...loadVisual(v, link.name, override));
    }
    if (prims.length) loaded.set(link.name, prims);
    trianglesBefore += triangleCount(prims);
  }
  const globalRatio = Math.min(1, src.targetTriangles / Math.max(1, trianglesBefore));

  // Nodes: DFS from the root link.
  const nodes = new Map<string, GltfNode>();
  const jointDefs: JointDef[] = [];
  const rootNode = doc.createNode(sanitizeNodeName(model.rootLink)).setExtras({ urdf: { link: model.rootLink } });
  root.addChild(rootNode);
  nodes.set(model.rootLink, rootNode);
  const byParent = new Map<string, typeof model.joints>();
  for (const j of model.joints) {
    const l = byParent.get(j.parent) ?? [];
    l.push(j);
    byParent.set(j.parent, l);
  }
  const stack = [model.rootLink];
  while (stack.length) {
    const parent = stack.pop()!;
    for (const j of byParent.get(parent) ?? []) {
      const q = rpyToQuaternion(...j.origin.rpy);
      const node = doc
        .createNode(sanitizeNodeName(j.child))
        .setTranslation(j.origin.xyz)
        .setRotation(q)
        .setExtras({ urdf: { link: j.child, joint: j.name, type: j.type, axis: j.axis, lower: j.limit?.lower ?? null, upper: j.limit?.upper ?? null, mimic: j.mimic ?? null } });
      nodes.get(parent)!.addChild(node);
      nodes.set(j.child, node);
      jointDefs.push({
        name: j.name,
        type: j.type,
        parent: j.parent,
        child: j.child,
        childNode: sanitizeNodeName(j.child),
        axis: j.axis,
        lower: j.limit?.lower ?? null,
        upper: j.limit?.upper ?? null,
        origin: j.origin,
        mimic: j.mimic ?? null,
      });
      stack.push(j.child);
    }
  }

  // Meshes with decimation.
  let trianglesAfter = 0;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [linkName, prims] of loaded) {
    const node = nodes.get(linkName);
    if (!node) continue; // unreachable link (not in the joint tree)
    const mesh = doc.createMesh(sanitizeNodeName(linkName) + '_mesh');
    const before = triangleCount(prims);
    let after = 0;
    const linkTarget = Math.min(MAX_LINK_TRIS, Math.max(MIN_LINK_TRIS, before * globalRatio));
    for (const raw of prims) {
      const tris = raw.indices.length / 3;
      const share = before ? tris / before : 1;
      const p = computeNormals(decimate(raw, Math.max(MIN_LINK_TRIS * share, linkTarget * share), 0.05));
      const buffer = doc.getRoot().listBuffers()[0];
      const position = doc.createAccessor().setType('VEC3').setArray(p.positions).setBuffer(buffer);
      const normal = doc.createAccessor().setType('VEC3').setArray(p.normals).setBuffer(buffer);
      const indices = doc.createAccessor().setType('SCALAR').setArray(p.indices).setBuffer(buffer);
      const prim = doc.createPrimitive().setAttribute('POSITION', position).setAttribute('NORMAL', normal).setIndices(indices).setMaterial(material(p.color));
      after += p.indices.length / 3;
      mesh.addPrimitive(prim);
      // bbox in the robot frame (Z-up) for the scale guard: walk node ancestry
      const world = worldOf(node);
      for (let i = 0; i < p.positions.length; i += 3) {
        const z = world.z(p.positions[i], p.positions[i + 1], p.positions[i + 2]);
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }
    node.setMesh(mesh);
    perLink.push({ link: linkName, before, after: Math.round(after) });
    trianglesAfter += after;
  }

  await doc.transform(dedup(), weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));

  const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const glb = await io.writeBinary(doc);

  const modelHeightM = Number.isFinite(maxZ - minZ) ? Math.round((maxZ - minZ) * 100) / 100 : 0;
  log(`triangles ${trianglesBefore} → ${Math.round(trianglesAfter)}, ${(glb.byteLength / 1024).toFixed(0)} KB, height ${modelHeightM} m (published ${src.heightM} m)`);
  if (glb.byteLength > MAX_BYTES) throw new Error(`GLB is ${(glb.byteLength / 1e6).toFixed(1)} MB, above the 6 MB limit — lower targetTriangles`);
  if (modelHeightM && Math.abs(modelHeightM - src.heightM) / src.heightM > src.heightTolerance) {
    throw new Error(`model height ${modelHeightM} m differs from published ${src.heightM} m by more than ${Math.round(src.heightTolerance * 100)} % — unit or pose problem`);
  }

  const joints: JointsFile = {
    robotKey: src.robotKey,
    upAxis: 'Z',
    rootNode: sanitizeNodeName(model.rootLink),
    heightM: src.heightM,
    modelHeightM,
    links: [...nodes.keys()].map((name) => ({ name, node: sanitizeNodeName(name) })),
    joints: jointDefs,
  };

  return { glb, joints, stats: { trianglesBefore, trianglesAfter: Math.round(trianglesAfter), bytes: glb.byteLength, links: nodes.size, joints: jointDefs.length, modelHeightM, perLink } };
}

/** Accumulated node transform (translation + rotation only, URDF has no scale) to measure height in the root frame. */
function worldOf(node: GltfNode): { z: (x: number, y: number, z: number) => number } {
  const chain: GltfNode[] = [];
  let n: GltfNode | null = node;
  while (n && n.getName() !== 'robot_root') {
    chain.unshift(n);
    n = n.getParentNode();
  }
  let q: [number, number, number, number] = [0, 0, 0, 1];
  let t: [number, number, number] = [0, 0, 0];
  for (const c of chain) {
    const r = c.getRotation() as [number, number, number, number];
    const tr = c.getTranslation() as [number, number, number];
    const moved = rotateVector(q, tr);
    t = [t[0] + moved[0], t[1] + moved[1], t[2] + moved[2]];
    q = multiplyQuaternions(q, r);
  }
  return {
    z: (x, y, z) => {
      const v = rotateVector(q, [x, y, z]);
      return v[2] + t[2];
    },
  };
}
