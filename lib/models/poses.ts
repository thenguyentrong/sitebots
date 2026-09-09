import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { clamp } from './kinematics';
import { PosesFile, type JointDef } from './schemas';

/**
 * Pose presets. Generic presets are written against semantic joint names
 * (left_shoulder_pitch, left_knee…) and translated to each robot's real joint
 * names; per-robot entries override values where a vendor's sign convention
 * or joint layout differs. Values are clamped to the URDF limits.
 */
export type Pose = Record<string, number>;

let cache: PosesFile | null = null;

/** Cached in production; re-read per request in development so a tuned preset shows on reload. */
export function loadPoses(): PosesFile {
  if (cache && process.env.NODE_ENV === 'production') return cache;
  const p = join(process.cwd(), 'data', 'models', 'poses.json');
  cache = existsSync(p) ? PosesFile.parse(JSON.parse(readFileSync(p, 'utf8'))) : PosesFile.parse({});
  return cache;
}

/** "Left_Shoulder_Pitch", "left_shoulder_pitch_joint", "L_shoulder_pitch" → "left_shoulder_pitch". */
export function deriveSemantic(jointName: string): string {
  return jointName
    .toLowerCase()
    .replace(/_?joint$/, '')
    .replace(/^(l|lf|fl)_/, 'left_')
    .replace(/^(r|rf|fr)_/, 'right_')
    .replace(/^aa/, '');
}

export function resolvePresets(robotKey: string, formFactor: 'humanoid' | 'quadruped' | 'mobile_manipulator', joints: JointDef[]): Record<string, Pose> {
  const file = loadPoses();
  const robot = file.robots[robotKey];
  const family = robot?.family ?? (formFactor === 'quadruped' ? 'quadruped' : 'humanoid');
  const generic = family === 'quadruped' ? file._quadruped : file._humanoid;
  const byName = new Map(joints.map((j) => [j.name, j]));
  const semanticToJoint = new Map<string, JointDef>();
  for (const j of joints) {
    if (j.type !== 'revolute' && j.type !== 'continuous' && j.type !== 'prismatic') continue;
    const s = deriveSemantic(j.name);
    if (!semanticToJoint.has(s)) semanticToJoint.set(s, j);
  }
  for (const [s, real] of Object.entries(robot?.semantic ?? {})) {
    const j = byName.get(real);
    if (j) semanticToJoint.set(s, j);
  }

  const rest: Pose = {};
  for (const [name, v] of Object.entries(robot?.rest ?? {})) {
    const j = byName.get(name);
    if (j) rest[name] = clamp(v, j.lower, j.upper);
  }

  const out: Record<string, Pose> = {};
  for (const [preset, values] of Object.entries(generic)) {
    const pose: Pose = { ...rest };
    for (const [semantic, v] of Object.entries(values)) {
      const j = semanticToJoint.get(semantic) ?? [...semanticToJoint.entries()].find(([s]) => s.startsWith(semantic))?.[1];
      if (j) pose[j.name] = clamp(v, j.lower, j.upper);
    }
    out[preset] = pose;
  }
  for (const [preset, values] of Object.entries(robot?.presets ?? {})) {
    const pose: Pose = { ...rest, ...(out[preset] ?? {}) };
    for (const [name, v] of Object.entries(values)) {
      const j = byName.get(name);
      if (j) pose[name] = clamp(v, j.lower, j.upper);
    }
    out[preset] = pose;
  }
  if (!out.standing) out.standing = { ...rest };
  return out;
}
