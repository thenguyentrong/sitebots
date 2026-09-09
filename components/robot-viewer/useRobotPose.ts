'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Matrix4, Object3D, Vector3 } from 'three';
import { clamp, jointTransform, type Quat, type Vec3 } from '@/lib/models/kinematics';
import type { JointDef } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';

type Orig = { q: Quat; p: Vec3 };

/**
 * Drives joint values on the loaded scene. Each child-link node's original
 * TRS (the joint origin) is remembered once; a joint value composes the axis
 * rotation onto it. Values ease towards their targets over a few hundred
 * milliseconds, and the canvas is redrawn only while something moves.
 */
export function useRobotPose(root: Object3D | null, joints: JointDef[], initial: Pose = {}) {
  const invalidate = useThree((s) => s.invalidate);
  const nodes = useMemo(() => {
    const m = new Map<string, { node: Object3D; joint: JointDef; orig: Orig }>();
    if (!root) return m;
    for (const j of joints) {
      const node = root.getObjectByName(j.childNode);
      if (!node) continue;
      m.set(j.name, { node, joint: j, orig: { q: [node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w], p: [node.position.x, node.position.y, node.position.z] } });
    }
    return m;
  }, [root, joints]);

  const current = useRef<Record<string, number>>({});
  const target = useRef<Record<string, number>>({});
  const [pose, setPoseName] = useState('standing');
  const [animating, setAnimating] = useState(false);

  const apply = useCallback(
    (values: Record<string, number>) => {
      for (const [name, entry] of nodes) {
        const v = values[name] ?? 0;
        const { quat, pos } = jointTransform(entry.joint.type, entry.orig.q, entry.orig.p, entry.joint.axis, clamp(v, entry.joint.lower, entry.joint.upper));
        entry.node.quaternion.set(quat[0], quat[1], quat[2], quat[3]);
        entry.node.position.set(pos[0], pos[1], pos[2]);
      }
      // mimic joints follow their leader
      for (const [name, entry] of nodes) {
        if (!entry.joint.mimic) continue;
        const lead = values[entry.joint.mimic.joint] ?? 0;
        const v = lead * entry.joint.mimic.multiplier + entry.joint.mimic.offset;
        const { quat, pos } = jointTransform(entry.joint.type, entry.orig.q, entry.orig.p, entry.joint.axis, clamp(v, entry.joint.lower, entry.joint.upper));
        entry.node.quaternion.set(quat[0], quat[1], quat[2], quat[3]);
        entry.node.position.set(pos[0], pos[1], pos[2]);
        values[name] = v;
      }
    },
    [nodes],
  );

  const setPose = useCallback(
    (name: string, values: Pose) => {
      target.current = { ...values };
      for (const k of Object.keys(current.current)) if (!(k in target.current)) target.current[k] = 0;
      setPoseName(name);
      setAnimating(true);
      invalidate();
    },
    [invalidate],
  );

  useFrame((_, delta) => {
    if (!animating) return;
    const k = 1 - Math.exp(-delta * 8); // ~0.4 s to settle
    let maxDiff = 0;
    const next: Record<string, number> = { ...current.current };
    for (const [name, t] of Object.entries(target.current)) {
      const c = next[name] ?? 0;
      const v = c + (t - c) * k;
      next[name] = v;
      maxDiff = Math.max(maxDiff, Math.abs(t - v));
    }
    current.current = next;
    apply(next);
    if (maxDiff < 0.002) {
      current.current = { ...target.current };
      apply(current.current);
      setAnimating(false);
    } else {
      invalidate();
    }
  });

  // Fresh scene: jump straight to the standing preset (zero joints leave a
  // quadruped on straight legs), without animating.
  useEffect(() => {
    if (!nodes.size) return;
    current.current = { ...initial };
    target.current = { ...initial };
    apply({ ...initial });
    invalidate();
  }, [nodes, apply, initial, invalidate]);

  return { pose, animating, setPose, jointCount: nodes.size };
}

/** Lowest point of the object in its parent frame, so the feet can sit on y = 0. */
export function floorOffset(obj: Object3D): number {
  return worldBounds(obj).minY;
}

/**
 * Vertical extent of every mesh in the object, measured in the object's own
 * frame for the current pose. Not world space: the caller moves a parent group
 * by -minY to put the feet on the floor, and measuring through that group
 * would feed the previous offset back into the next one.
 */
export function worldBounds(obj: Object3D): { minY: number; maxY: number } {
  const v = new Vector3();
  const toLocal = new Matrix4();
  const m = new Matrix4();
  let minY = Infinity;
  let maxY = -Infinity;
  obj.updateWorldMatrix(true, true);
  toLocal.copy(obj.matrixWorld).invert();
  obj.traverse((o) => {
    const mesh = o as import('three').Mesh;
    if (!mesh.isMesh || !mesh.geometry.boundingBox) {
      if (mesh.isMesh) mesh.geometry.computeBoundingBox();
    }
    if (mesh.isMesh && mesh.geometry.boundingBox) {
      const bb = mesh.geometry.boundingBox;
      m.multiplyMatrices(toLocal, mesh.matrixWorld);
      for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
        v.set(x, y, z).applyMatrix4(m);
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      }
    }
  });
  return Number.isFinite(minY) ? { minY, maxY } : { minY: 0, maxY: 0 };
}
