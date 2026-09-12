import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { Group, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import { createRobotRig, modelBounds, movableJoint, resolveJointValues } from './rig';
import { jointTransform, rpyToQuaternion } from './kinematics';
import { IndexFile, type JointDef } from './schemas';
import { resolvePresets } from './poses';

const index = IndexFile.parse(JSON.parse(readFileSync('data/models/index.json', 'utf8')));
const joint = (overrides: Partial<JointDef> = {}): JointDef => ({ name: 'knee', type: 'revolute', parent: 'body', child: 'leg', childNode: 'leg', axis: [0, 1, 0], lower: -2, upper: 2, origin: { xyz: [0, 0, -0.2], rpy: [0, 0, 0] }, mimic: null, ...overrides });

it('rotates a quantized leaf around its joint, not its mesh center', () => {
  const source = new Group();
  const leaf = new Group(); leaf.name = 'leg'; leaf.position.set(0, 0, -0.3); leaf.scale.setScalar(0.1); source.add(leaf);
  const rig = createRobotRig(source, [joint()]);
  rig.apply({ knee: Math.PI / 2 });
  const position = rig.scene.getObjectByName('leg')!.getWorldPosition(new Vector3());
  expect(position.x).toBeCloseTo(-0.1);
  expect(position.z).toBeCloseTo(-0.2);
  expect(leaf.position.z).toBe(-0.3);
  const fresh = createRobotRig(source, [joint()]);
  expect(fresh.scene.getObjectByName('leg')!.getWorldPosition(new Vector3()).z).toBeCloseTo(-0.3);
});

it('resolves mimic chains independent of ordering, from clamped leaders', () => {
  const joints = [joint({ name: 'tip', mimic: { joint: 'finger', multiplier: 0.5, offset: 0.1 } }), joint({ name: 'finger', mimic: { joint: 'leader', multiplier: -1, offset: 0 } }), joint({ name: 'leader', lower: 0, upper: 1 })];
  const requested = { leader: 200 };
  expect(resolveJointValues(joints, requested)).toEqual({ leader: 1, finger: -1, tip: -0.4 });
  expect(requested).toEqual({ leader: 200 });
});

it('moves prismatic joints along their rotated local axis', () => {
  const source = new Group(); const leaf = new Group(); leaf.name = 'leg'; source.add(leaf);
  const j = joint({ type: 'prismatic', axis: [1, 0, 0], origin: { xyz: [0, 0, 0], rpy: [0, 0, Math.PI / 2] } });
  const rig = createRobotRig(source, [j]); rig.apply({ knee: 0.2 });
  const p = rig.pivots.get('knee')!.position;
  expect(p.x).toBeCloseTo(0); expect(p.y).toBeCloseTo(0.2);
});

describe('every published model', () => {
  for (const [key, entry] of Object.entries(index.robots)) it(`${key}: loads, preserves geometry, and all poses follow the source joint chain`, async () => {
    const bytes = readFileSync(`public${entry.glbUrl}`);
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const source = gltf.scene;
    source.updateMatrixWorld(true);
    const original = new Map<string, Matrix4>();
    source.traverse((node) => { if (node instanceof Mesh) original.set(node.userData.auditId = node.uuid, node.matrixWorld.clone()); });
    const rig = createRobotRig(source, entry.joints.joints);
    expect(rig.missing).toEqual([]);
    rig.scene.updateMatrixWorld(true);
    rig.scene.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const before = original.get(node.userData.auditId)!;
      expect(Math.max(...node.matrixWorld.elements.map((n, i) => Math.abs(n - before.elements[i])))).toBeLessThan(1e-6);
    });
    const presets = resolvePresets(key, 'humanoid', entry.joints.joints);
    for (const [name, pose] of Object.entries(presets)) {
      const values = rig.apply(pose);
      const world = new Map<string, Matrix4>([[entry.joints.rootNode, source.getObjectByName(entry.joints.rootNode)!.matrixWorld.clone()]]);
      const remaining = [...entry.joints.joints];
      for (let pass = 0; remaining.length && pass < entry.joints.joints.length + 1; pass++) {
        for (let i = remaining.length - 1; i >= 0; i--) {
          const j = remaining[i]; const parent = world.get(j.parent); if (!parent) continue;
          const transform = jointTransform(j.type, rpyToQuaternion(...j.origin.rpy), j.origin.xyz, j.axis, values[j.name]);
          const expected = parent.clone().multiply(new Matrix4().compose(new Vector3(...transform.pos), new Quaternion(...transform.quat), new Vector3(1, 1, 1)));
          world.set(j.child, expected); remaining.splice(i, 1);
          const pivot = rig.pivots.get(j.name);
          if (pivot && movableJoint(j)) expect(Math.max(...pivot.matrixWorld.elements.map((n, k) => Math.abs(n - expected.elements[k]))), `${key} ${name} ${j.name}`).toBeLessThan(1e-5);
        }
      }
      expect(remaining).toEqual([]);
      const bounds = modelBounds(rig.scene);
      expect(bounds.max.y - bounds.min.y).toBeGreaterThan(0.05);
      expect(bounds.getSize(new Vector3()).length()).toBeLessThan(12);
    }
    source.traverse((node) => { if (node instanceof Mesh) expect(node.matrixWorld.elements).toEqual(original.get(node.userData.auditId)!.elements); });
  });
});
