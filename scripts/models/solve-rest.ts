// solve-rest.ts — find the joint values that make a robot stand naturally.
//
//   node --import tsx scripts/models/solve-rest.ts            report
//   node --import tsx scripts/models/solve-rest.ts --write    update data/models/poses.json
//
// Most URDFs ship a zero pose with the arms straight out, because zero is where
// the CAD was exported, not where the robot stands. Rather than guess a sign
// convention per manufacturer, this runs forward kinematics on the joint tree
// and searches the shoulder and elbow values that put the hands lowest while
// keeping them beside the body. The result is written as the robot's `rest`
// pose, which every preset builds on.

import { readFileSync, writeFileSync } from 'node:fs';
import { IndexFile, type JointDef, type JointsFile } from '@/lib/models/schemas';
import { multiplyQuaternions, rotateVector, rpyToQuaternion, axisAngleToQuaternion, clamp, type Quat, type Vec3 } from '@/lib/models/kinematics';
import { args } from '../scrape/_lib/args';

type Pose = Record<string, number>;

/** World transform of every link, given joint values. URDF is Z-up, so z is height. */
function forwardKinematics(joints: JointsFile, pose: Pose): Map<string, { pos: Vec3; quat: Quat }> {
  const byParent = new Map<string, JointDef[]>();
  for (const j of joints.joints) {
    if (!byParent.has(j.parent)) byParent.set(j.parent, []);
    byParent.get(j.parent)!.push(j);
  }
  const out = new Map<string, { pos: Vec3; quat: Quat }>();
  const root = joints.joints.length ? joints.joints[0].parent : joints.rootNode;
  const seen = new Set<string>();
  const walk = (link: string, pos: Vec3, quat: Quat) => {
    if (seen.has(link)) return;
    seen.add(link);
    out.set(link, { pos, quat });
    for (const j of byParent.get(link) ?? []) {
      const originQ = rpyToQuaternion(j.origin.rpy[0], j.origin.rpy[1], j.origin.rpy[2]);
      const value = clamp(pose[j.name] ?? 0, j.lower, j.upper);
      let localQ = originQ;
      let localP: Vec3 = j.origin.xyz;
      if (j.type === 'revolute' || j.type === 'continuous') {
        localQ = multiplyQuaternions(originQ, axisAngleToQuaternion(j.axis, value));
      } else if (j.type === 'prismatic') {
        const d = rotateVector(originQ, j.axis);
        localP = [localP[0] + d[0] * value, localP[1] + d[1] * value, localP[2] + d[2] * value];
      }
      const worldP = rotateVector(quat, localP);
      walk(j.child, [pos[0] + worldP[0], pos[1] + worldP[1], pos[2] + worldP[2]], multiplyQuaternions(quat, localQ));
    }
  };
  walk(root, [0, 0, 0], [0, 0, 0, 1]);
  return out;
}

/** Which side a name belongs to, across the naming schemes seen so far (left_x, l_x, x_left_y, arm_l_3). */
export function sideOf(name: string): 'left' | 'right' | null {
  const n = name.toLowerCase();
  if (/(^|_)(left|l)(_|$)/.test(n) || /^left/.test(n)) return 'left';
  if (/(^|_)(right|r)(_|$)/.test(n) || /^right/.test(n)) return 'right';
  return null;
}

/** "left_shoulder_pitch_joint" → "left_shoulder_pitch". */
function semantic(name: string): string {
  return name
    .toLowerCase()
    .replace(/_?joint$/, '')
    .replace(/^(l|lf|fl)_/, 'left_')
    .replace(/^(r|rf|fr)_/, 'right_');
}

/** The last link down each arm — the hand, or the wrist when there is no hand. */
function armTips(joints: JointsFile): { left: string | null; right: string | null } {
  const childOf = new Map(joints.joints.map((j) => [j.child, j]));
  const tips: { left: string | null; right: string | null } = { left: null, right: null };
  for (const side of ['left', 'right'] as const) {
    let best: string | null = null;
    let bestDepth = -1;
    for (const l of joints.links) {
      const n = l.name.toLowerCase();
      if (sideOf(n) !== side) continue;
      if (!/hand|wrist|palm|elbow|forearm|gripper|finger|arm_\w*[5-7]|(^|_)(el|elb|wr|hnd)(_|$)/.test(n)) continue;
      // Depth from the root: the deeper link is further out along the arm.
      let depth = 0;
      let cur = l.name;
      while (childOf.has(cur) && depth < 40) {
        cur = childOf.get(cur)!.parent;
        depth++;
      }
      if (depth > bestDepth) {
        bestDepth = depth;
        best = l.name;
      }
    }
    tips[side] = best;
  }
  return tips;
}

/** Candidate values per semantic arm joint, coarse then refined around the winner. */
const SWEEP: Record<string, number[]> = {
  shoulder_pitch: [-2.4, -1.8, -1.4, -1.0, -0.7, -0.4, -0.2, 0, 0.2, 0.4, 0.7, 1.0, 1.4, 1.8, 2.4],
  shoulder_roll: [-2.4, -1.8, -1.4, -1.0, -0.7, -0.4, -0.2, 0, 0.2, 0.4, 0.7, 1.0, 1.4, 1.8, 2.4],
  shoulder_yaw: [-1.0, -0.7, -0.4, -0.2, 0, 0.2, 0.4, 0.7, 1.0],
  elbow: [-2.4, -1.8, -1.4, -1.0, -0.7, -0.4, -0.2, 0, 0.2, 0.4, 0.7, 1.0, 1.4, 1.8, 2.4],
  elbow_pitch: [-2.4, -1.8, -1.4, -1.0, -0.7, -0.4, -0.2, 0, 0.2, 0.4, 0.7, 1.0, 1.4, 1.8, 2.4],
  elbow_yaw: [-1.0, -0.5, 0, 0.5, 1.0],
  // Joints whose names say nothing (arm_left_3_joint): the wide sweep, both signs.
  generic: [-2.4, -1.8, -1.4, -1.0, -0.7, -0.4, -0.2, 0, 0.2, 0.4, 0.7, 1.0, 1.4, 1.8, 2.4],
};

/** Makers name the same axis differently: DR02 says hip_y where Unitree says hip_pitch. */
const ROLE_ALIAS: Record<string, string> = {
  shoulder_y: 'shoulder_pitch',
  shoulder_x: 'shoulder_roll',
  shoulder_z: 'shoulder_yaw',
  elbow_y: 'elbow',
  elbow_x: 'elbow',
  elbow_z: 'elbow_yaw',
};

type ArmJoint = { def: JointDef; role: string; side: 'left' | 'right' };

function armJoints(joints: JointsFile, tips: { left: string | null; right: string | null }): ArmJoint[] {
  const out: ArmJoint[] = [];
  const childOf = new Map(joints.joints.map((j) => [j.child, j]));
  for (const side of ['left', 'right'] as const) {
    const tip = tips[side];
    if (!tip) continue;
    // Walk up from the tip; stop at the torso (a link that is not on this side).
    const chain: JointDef[] = [];
    let cur = tip;
    for (let i = 0; i < 40 && childOf.has(cur); i++) {
      const j = childOf.get(cur)!;
      if (sideOf(j.child) !== side && sideOf(j.name) !== side) break;
      chain.unshift(j);
      cur = j.parent;
    }
    for (const j of chain) {
      if (j.type !== 'revolute' && j.type !== 'continuous') continue;
      const s = semantic(j.name);
      const aliased = Object.keys(ROLE_ALIAS).find((r) => s.endsWith(r));
      const named = aliased ? ROLE_ALIAS[aliased] : Object.keys(SWEEP).find((r) => s.endsWith(r));
      out.push({ def: j, role: named && SWEEP[named] ? named : 'generic', side });
    }
  }
  return out;
}

/**
 * How wrong a pose looks. Arms hanging beside the body means the hand is low,
 * close to the body's centre line front-to-back, and not jammed into the torso.
 */
function cost(joints: JointsFile, pose: Pose, tips: { left: string | null; right: string | null }, hipZ: number): number {
  const fk = forwardKinematics(joints, pose);
  let c = 0;
  for (const side of ['left', 'right'] as const) {
    const tip = tips[side];
    if (!tip) continue;
    const t = fk.get(tip);
    if (!t) continue;
    const lead = joints.joints.find((j) => j.child === tip);
    const ext = lead ? rotateVector(t.quat, lead.origin.xyz) : ([0, 0, 0] as Vec3);
    const p: Vec3 = [t.pos[0] + ext[0], t.pos[1] + ext[1], t.pos[2] + ext[2]];
    // Height above the hip: lower is better, but not below the knee.
    c += Math.max(0, p[2] - hipZ) * 3;
    // Reaching forward or back looks like a gesture, not a stance.
    c += Math.abs(p[0]) * 2;
    // Sideways: a little clearance from the body, not a T-pose.
    c += Math.max(0, Math.abs(p[1]) - 0.26) * 2;
    c += Math.max(0, 0.12 - Math.abs(p[1])) * 4;
    const sameSide = side === 'left' ? p[1] > 0 : p[1] < 0;
    if (!sameSide) c += 0.5;
  }
  return c;
}

function solve(joints: JointsFile): Pose {
  const tips = armTips(joints);
  if (!tips.left && !tips.right) return {};
  const arms = armJoints(joints, tips);
  if (!arms.length) return {};
  const fk0 = forwardKinematics(joints, {});
  // Hips give the height the hands should hang towards.
  // Order matters: a link called base_link sits on the floor, and using it as
  // the target would ask the hands to reach the ground.
  const hipNames = [/pelvis/i, /waist/i, /hip/i, /torso/i, /body/i, /base/i];
  let hipZ = 0;
  for (const re of hipNames) {
    const l = joints.links.find((x) => re.test(x.name));
    const z = l && fk0.get(l.name)?.pos[2];
    if (z && z > 0.05) {
      hipZ = z;
      break;
    }
  }

  const pose: Pose = {};
  // Coordinate descent: one joint at a time, twice over, which is enough
  // because the arm joints barely interact once the elbow is set.
  for (let pass = 0; pass < 2; pass++) {
    for (const a of arms) {
      let best = pose[a.def.name] ?? 0;
      let bestCost = cost(joints, { ...pose, [a.def.name]: best }, tips, hipZ);
      for (const raw of SWEEP[a.role]) {
        // Roll mirrors between sides; try both signs and let the cost decide.
        for (const v of a.role === 'shoulder_roll' || a.role === 'shoulder_yaw' || a.role === 'generic' ? [raw, -raw] : [raw]) {
          const clamped = clamp(v, a.def.lower, a.def.upper);
          const c = cost(joints, { ...pose, [a.def.name]: clamped }, tips, hipZ);
          if (c < bestCost - 1e-6) {
            bestCost = c;
            best = clamped;
          }
        }
      }
      pose[a.def.name] = best;
    }
  }
  // Drop joints the search left at zero; they only add noise to the file.
  for (const k of Object.keys(pose)) if (Math.abs(pose[k]) < 1e-3) delete pose[k];
  return pose;
}

async function main() {
  const a = args();
  const idx = IndexFile.parse(JSON.parse(readFileSync('data/models/index.local.json', 'utf8')));
  const posesFile = 'data/models/poses.json';
  const poses = JSON.parse(readFileSync(posesFile, 'utf8')) as {
    robots: Record<string, { family?: string; semantic?: Record<string, string>; rest?: Pose; restLocked?: boolean; presets?: Record<string, Pose> }>;
  };

  for (const [key, entry] of Object.entries(idx.robots)) {
    const tips = armTips(entry.joints);
    if (!tips.left && !tips.right) {
      console.log(`${key.padEnd(24)} no arms, skipped`);
      continue;
    }
    const before = cost(entry.joints, {}, tips, 0);
    const rest = solve(entry.joints);
    const after = cost(entry.joints, rest, tips, 0);
    const shown = Object.entries(rest).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ');
    console.log(`${key.padEnd(24)} cost ${before.toFixed(2)} → ${after.toFixed(2)}  ${shown || '(zero pose already natural)'}`);
    if (poses.robots[key]?.restLocked) {
      console.log(`${key.padEnd(24)} rest set by hand (restLocked) — not touched`);
      continue;
    }
    if (a.write === true && Object.keys(rest).length) {
      poses.robots[key] ??= {};
      poses.robots[key].rest = rest;
      poses.robots[key].family ??= 'humanoid';
    }
  }

  if (a.write === true) {
    writeFileSync(posesFile, JSON.stringify(poses, null, 2) + '\n');
    console.log(`\nwritten to ${posesFile}`);
  } else {
    console.log('\n(report only — re-run with --write to update poses.json)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
