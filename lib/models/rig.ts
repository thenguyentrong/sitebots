import { Box3, Group, Matrix4, Mesh, Object3D, Vector3 } from 'three';
import { jointTransform, rpyToQuaternion } from './kinematics';
import type { JointDef } from './schemas';

export { movableJoint, resolveJointValues } from './joint-values';
import { movableJoint, resolveJointValues, type JointValues } from './joint-values';

/** Mesh quantization may move a leaf node away from its URDF pivot. Keep its
 * decode transform below a separate joint frame, preserving the zero pose.
 * Clone the hierarchy so posing or remounting never changes useGLTF's cache. */
export function createRobotRig(source: Object3D, joints: JointDef[]) {
  const scene = source.clone(true);
  const pivots = new Map<string, Object3D>();
  const missing: string[] = [];
  for (const joint of joints) {
    const node = scene.getObjectByName(joint.childNode);
    if (!node?.parent) {
      if (movableJoint(joint)) missing.push(joint.name);
      continue;
    }
    const parent = node.parent;
    const pivot = new Group();
    pivot.name = `joint:${joint.name}`;
    pivot.position.fromArray(joint.origin.xyz);
    pivot.quaternion.fromArray(rpyToQuaternion(...joint.origin.rpy));
    pivot.updateMatrix();
    node.updateMatrix();
    const residual = new Matrix4().copy(pivot.matrix).invert().multiply(node.matrix);
    residual.decompose(node.position, node.quaternion, node.scale);
    parent.add(pivot);
    pivot.add(node);
    pivots.set(joint.name, pivot);
  }
  const apply = (requested: JointValues) => {
    const values = resolveJointValues(joints, requested);
    for (const joint of joints) {
      const pivot = pivots.get(joint.name);
      if (!pivot) continue;
      const { quat, pos } = jointTransform(joint.type, rpyToQuaternion(...joint.origin.rpy), joint.origin.xyz, joint.axis, values[joint.name]);
      pivot.quaternion.fromArray(quat);
      pivot.position.fromArray(pos);
    }
    scene.updateMatrixWorld(true);
    return values;
  };
  return { scene, pivots, missing, apply };
}

/** Bounds in the scene's frame exclude the external floor offset. */
export function modelBounds(scene: Object3D): Box3 {
  scene.updateWorldMatrix(true, true);
  const inverse = scene.matrixWorld.clone().invert();
  const box = new Box3();
  const matrix = new Matrix4();
  const vertex = new Vector3();
  scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const position = node.geometry.getAttribute('position');
    if (!position) return;
    matrix.multiplyMatrices(inverse, node.matrixWorld);
    // Exact vertices avoid loose rotated bounding boxes making feet float.
    for (let i = 0; i < position.count; i++) box.expandByPoint(vertex.fromBufferAttribute(position, i).applyMatrix4(matrix));
  });
  return box.isEmpty() ? box.set(new Vector3(), new Vector3()) : box;
}
