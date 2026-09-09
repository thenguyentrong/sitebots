import { describe, expect, it } from 'vitest';
import { axisAngleToQuaternion, jointTransform, multiplyQuaternions, rotateVector, rpyToQuaternion, sanitizeNodeName, Z_UP_TO_Y_UP } from './kinematics';

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe('kinematics', () => {
  it('yaw of 90° maps X onto Y', () => {
    close(rotateVector(rpyToQuaternion(0, 0, Math.PI / 2), [1, 0, 0]), [0, 1, 0]);
  });

  it('roll of 90° maps Y onto Z', () => {
    close(rotateVector(rpyToQuaternion(Math.PI / 2, 0, 0), [0, 1, 0]), [0, 0, 1]);
  });

  it('rpy composes as Rz · Ry · Rx', () => {
    const r = 0.3, p = -0.7, y = 1.1;
    const composed = multiplyQuaternions(multiplyQuaternions(axisAngleToQuaternion([0, 0, 1], y), axisAngleToQuaternion([0, 1, 0], p)), axisAngleToQuaternion([1, 0, 0], r));
    close(rpyToQuaternion(r, p, y), composed);
  });

  it('Z-up to Y-up sends +Z to +Y', () => {
    close(rotateVector(Z_UP_TO_Y_UP, [0, 0, 1]), [0, 1, 0]);
  });

  it('a revolute joint rotates about its axis after the origin rotation', () => {
    const origin = rpyToQuaternion(0, 0, Math.PI / 2); // joint frame yawed 90°
    const { quat } = jointTransform('revolute', origin, [0, 0, 0], [1, 0, 0], Math.PI / 2);
    // Rx(90°) in the joint frame sends +Z to −Y; the yawed frame then turns −Y into +X.
    close(rotateVector(quat, [0, 0, 1]), [1, 0, 0]);
  });

  it('a prismatic joint slides along its rotated axis', () => {
    const origin = rpyToQuaternion(0, 0, Math.PI / 2);
    const { pos } = jointTransform('prismatic', origin, [1, 0, 0], [1, 0, 0], 0.5);
    close(pos, [1, 0.5, 0]);
  });

  it('node names lose the characters three would strip', () => {
    expect(sanitizeNodeName('left hip.pitch:link/1')).toBe('left_hippitchlink1');
    expect(sanitizeNodeName('left_hip_pitch_link')).toBe('left_hip_pitch_link');
  });
});
