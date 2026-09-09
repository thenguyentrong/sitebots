/**
 * The little maths the converter and the viewer must agree on. No three.js
 * import here so the converter can use it without a renderer and the viewer
 * without a Node polyfill; quaternions are plain [x, y, z, w] tuples.
 */
export type Quat = [number, number, number, number];
export type Vec3 = [number, number, number];

/** URDF rpy is fixed-axis roll, pitch, yaw: R = Rz(yaw) · Ry(pitch) · Rx(roll). */
export function rpyToQuaternion(roll: number, pitch: number, yaw: number): Quat {
  const cr = Math.cos(roll / 2);
  const sr = Math.sin(roll / 2);
  const cp = Math.cos(pitch / 2);
  const sp = Math.sin(pitch / 2);
  const cy = Math.cos(yaw / 2);
  const sy = Math.sin(yaw / 2);
  return [
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy,
    cr * cp * cy + sr * sp * sy,
  ];
}

export function axisAngleToQuaternion(axis: Vec3, angle: number): Quat {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const s = Math.sin(angle / 2) / len;
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}

/** Hamilton product a · b (apply b first, then a, when rotating column vectors). */
export function multiplyQuaternions(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function rotateVector(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  // v' = v + 2w(q × v) + 2(q × (q × v))
  const cx = y * v[2] - z * v[1];
  const cy = z * v[0] - x * v[2];
  const cz = x * v[1] - y * v[0];
  const ccx = y * cz - z * cy;
  const ccy = z * cx - x * cz;
  const ccz = x * cy - y * cx;
  return [v[0] + 2 * (w * cx + ccx), v[1] + 2 * (w * cy + ccy), v[2] + 2 * (w * cz + ccz)];
}

/** URDF is Z-up, glTF is Y-up: rotate the root −90° about X. */
export const Z_UP_TO_Y_UP: Quat = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2];

/**
 * Local transform of a child link for a joint value. The joint rotation is
 * about the axis in the joint's own frame, i.e. after the origin rotation, so
 * it multiplies on the right of the origin quaternion.
 */
export function jointTransform(
  type: string,
  originQuat: Quat,
  originPos: Vec3,
  axis: Vec3,
  value: number,
): { quat: Quat; pos: Vec3 } {
  if (type === 'revolute' || type === 'continuous') {
    return { quat: multiplyQuaternions(originQuat, axisAngleToQuaternion(axis, value)), pos: originPos };
  }
  if (type === 'prismatic') {
    const d = rotateVector(originQuat, axis);
    const len = Math.hypot(d[0], d[1], d[2]) || 1;
    return { quat: originQuat, pos: [originPos[0] + (d[0] / len) * value, originPos[1] + (d[1] / len) * value, originPos[2] + (d[2] / len) * value] };
  }
  return { quat: originQuat, pos: originPos };
}

/** three.js strips characters that break property paths when it names nodes. Match it. */
export function sanitizeNodeName(name: string): string {
  return name.replace(/\s/g, '_').replace(/[^\w-]/g, '');
}

export function clamp(v: number, lo: number | null, hi: number | null): number {
  if (lo !== null && v < lo) return lo;
  if (hi !== null && v > hi) return hi;
  return v;
}
