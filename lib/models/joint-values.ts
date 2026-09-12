import { clamp } from './kinematics';
import type { JointDef } from './schemas';

export type JointValues = Record<string, number>;
export function movableJoint(joint: JointDef): boolean {
  return ['revolute', 'continuous', 'prismatic'].includes(joint.type);
}

export function resolveJointValues(joints: JointDef[], requested: JointValues): JointValues {
  const byName = new Map(joints.map((joint) => [joint.name, joint]));
  const values: JointValues = {};
  const visiting = new Set<string>();
  const resolve = (name: string): number => {
    if (name in values) return values[name];
    const joint = byName.get(name);
    if (!joint || visiting.has(name)) return 0;
    visiting.add(name);
    const raw = joint.mimic
      ? resolve(joint.mimic.joint) * joint.mimic.multiplier + joint.mimic.offset
      : requested[name] ?? 0;
    const value = clamp(Number.isFinite(raw) ? raw : 0, joint.lower, joint.upper);
    visiting.delete(name);
    values[name] = value;
    return value;
  };
  for (const joint of joints) resolve(joint.name);
  return values;
}
