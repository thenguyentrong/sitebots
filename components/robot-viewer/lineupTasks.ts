import type { Pose } from '@/lib/models/poses';

// The jobs the robots in the landing's lineup act out, each in its own place in the row: a short loop
// of joint poses, a few props and where the props are at every moment. Props stand beside a robot,
// along the row, so none hides a body from the camera; the robot turns its upper body to reach them.
// The tasks are illustrations of jobs on the map, not footage; the page says so.

export type Vec3 = [number, number, number];
/** A prop in the robot's slot: x along the row, y up, z towards the camera, metres from the robot's feet. */
export type PropSpec = { id: string; kind: 'box' | 'tote' | 'stand' | 'shelf' | 'beam'; size: Vec3; color: string; yaw: number; tilt?: number };
/** `held` blends a prop from its resting place `at` to the robot's hands (or a dog's back) and back;
 *  `yaw` turns it with the upper body that holds it. */
export type PropState = { id: string; at: Vec3; held?: number; offset?: Vec3; opacity?: number; spin?: number; yaw?: number };
export type TaskFrame = { pose: Pose; move: number; props: PropState[]; action: string };
export type Task = { label: string; loop: number; delay: number; hands: string[]; body?: string; props: PropSpec[]; frame: (t: number) => TaskFrame };
type Robot = { key: string; turn: number; joints: string[]; presets: Record<string, Pose> };

const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const smooth = (u: number) => { const c = clamp01(u); return c * c * (3 - 2 * c); };
const span = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

function mix(a: Pose, b: Pose, u: number): Pose {
  const out: Pose = { ...a };
  for (const [joint, value] of Object.entries(b)) out[joint] = (a[joint] ?? 0) + (value - (a[joint] ?? 0)) * u;
  return out;
}

/** A pose for every moment from keyframes: [second, pose], eased between neighbours. */
function track(t: number, keys: [number, Pose][]): Pose {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], span(t, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}

/** The same value on every joint whose name matches, on both sides. */
function set(pose: Pose, joints: string[], match: RegExp, value: number): Pose {
  const out: Pose = { ...pose };
  for (const joint of joints) if (match.test(joint)) out[joint] = value;
  return out;
}


/** How far the upper body turns, on top of the robot's own turn, to face a point dx along the row and
 * dz towards the camera. Bodies face +x at rest and turn about y, so facing (dx, dz) is atan2(-dz, dx). */
function toward(turn: number, dx: number, dz: number): number {
  const delta = Math.atan2(-dz, dx) - turn;
  return Math.atan2(Math.sin(delta), Math.cos(delta));
}

/** A point in front of a robot turned by `turn`: `forward` metres along its facing. */
const ahead = (turn: number, forward: number, up: number): Vec3 => [Math.cos(turn) * forward, up, -Math.sin(turn) * forward];

const CARDBOARD = '#a47a4f';
const PART = '#f97316';
const GREY = '#52525b';
const STEEL = '#71717a';
const SLATE = '#475569';

/** Where the H1-2 reaches with both hands in its reach pose, measured on the model: the crate waits there. */
const BENCH = { reach: 0.49, height: 0.94 };

/** H1-2: turns to a bench beside it, takes a crate between its palms, pulls it in and holds it with the
 *  knees bent under the load, then puts it back. Picking from the floor would take a deeper squat than its
 *  arms allow; real demonstrations lift from benches and shelves. Its elbow straightens as the angle
 *  grows (0 is a right angle), so it gets its own arm poses rather than the shared carry preset. */
function liftCrate(robot: Robot): Task {
  const { joints, presets, turn } = robot;
  const S = presets.standing ?? {};
  const waist = (pose: Pose, yaw: number) => set(pose, joints, /^torso_joint$/, yaw);
  // Hips, knees and ankles bend together, so the torso stays upright and the feet flat.
  const bend = (pose: Pose, angle: number) => set(set(set(pose, joints, /hip_pitch/, -angle), joints, /knee/, 2 * angle), joints, /ankle_pitch/, -angle);
  const arms = (pitch: number, elbow: number) => set(set(set(set(S, joints, /shoulder_pitch/, pitch), joints, /elbow/, elbow), joints, /shoulder_roll/, 0), joints, /wrist_roll/, 0);
  const reach = bend(arms(-0.5, 0.8), 0.1);
  const hold = bend(arms(-0.3, 0.3), 0.2);
  const side = 0.5;
  const bench: Vec3 = [...ahead(turn + side, BENCH.reach, 0)].map((value, i) => (i === 1 ? BENCH.height : value)) as Vec3;
  const keys: [number, Pose, number][] = [
    [0, S, 0], [1.2, reach, side], [1.6, reach, side], [2.8, hold, 0], [5.2, hold, 0],
    [6.3, reach, side], [6.7, reach, side], [7.7, S, 0], [9, S, 0],
  ];
  return {
    label: 'Lifts a crate', loop: 9, delay: 0, hands: ['L_hand_base_link', 'R_hand_base_link'],
    props: [
      { id: 'bench', kind: 'stand', size: [0.32, BENCH.height, 0.28], color: STEEL, yaw: turn + side },
      { id: 'crate', kind: 'box', size: [0.28, 0.24, 0.32], color: CARDBOARD, yaw: turn + side },
    ],
    frame: (t) => {
      const yaw = track(t, keys.map(([second, , value]) => [second, { yaw: value }] as [number, Pose])).yaw;
      const pose = waist(track(t, keys.map(([second, value]) => [second, value] as [number, Pose])), yaw);
      const held = t < 6.3 ? span(t, 1.3, 1.6) : 1 - span(t, 6.4, 6.7);
      return {
        pose, move: 0,
        props: [
          { id: 'bench', at: [bench[0], BENCH.height / 2, bench[2]] },
          // Between the palms, a hand's length past the wrists.
          { id: 'crate', at: [bench[0], BENCH.height + 0.12, bench[2]], held, offset: ahead(turn + yaw, 0.07, 0), yaw: turn + yaw },
        ],
        action: t < 1.6 ? 'Turns to the crate' : t < 2.8 ? 'Lifts the crate' : t < 6.3 ? 'Holds the crate' : t < 7.7 ? 'Puts the crate back' : 'Waits',
      };
    },
  };
}

/** G1: turns to a bin beside it, picks a fitting, turns to a tote on its other side and drops it in. */
function pickFittings(robot: Robot): Task {
  const { joints, presets, turn } = robot;
  const S = presets.standing ?? {};
  const reach = set(set(S, joints, /shoulder_pitch/, -0.8), joints, /elbow/, 0.55);
  const lift = presets.carry ?? S;
  const waist = (pose: Pose, yaw: number) => set(pose, joints, /waist_yaw/, yaw);
  const bin: Vec3 = [-0.38, 0.62, 0.1], tote: Vec3 = [0.38, 0.6, 0.1];
  const toBin = toward(turn, bin[0], bin[2]), toTote = toward(turn, tote[0], tote[2]);
  return {
    label: 'Picks fittings into a tote', loop: 7, delay: 1.1, hands: ['left_wrist_roll_rubber_hand', 'right_wrist_roll_rubber_hand'],
    props: [
      { id: 'bin-stand', kind: 'stand', size: [0.22, 0.55, 0.22], color: STEEL, yaw: 0 },
      { id: 'tote-stand', kind: 'stand', size: [0.22, 0.53, 0.22], color: STEEL, yaw: 0 },
      { id: 'bin', kind: 'tote', size: [0.24, 0.1, 0.2], color: GREY, yaw: 0 },
      { id: 'tote', kind: 'tote', size: [0.26, 0.12, 0.22], color: SLATE, yaw: 0 },
      { id: 'part', kind: 'box', size: [0.06, 0.06, 0.06], color: PART, yaw: 0 },
    ],
    frame: (t) => {
      const pose = track(t, [[0, waist(S, 0)], [0.9, waist(reach, toBin)], [1.3, waist(reach, toBin)], [2.1, waist(lift, toBin * 0.5)], [3.0, waist(lift, toTote)], [3.6, waist(reach, toTote)], [3.9, waist(reach, toTote)], [4.8, waist(S, 0)], [7, waist(S, 0)]]);
      const held = t < 3.7 ? span(t, 0.95, 1.3) : 1 - span(t, 3.7, 3.85);
      // Before the pick the fitting waits in the bin; after the drop it lies in the tote until the loop restarts.
      const rest: Vec3 = t < 2 ? [bin[0], bin[1] + 0.07, bin[2]] : [tote[0], tote[1] + 0.07, tote[2]];
      return {
        pose, move: 0, action: t < 1.3 ? 'Picks a fitting' : t < 3.9 ? 'Carries it to the tote' : 'Turns back to the bin',
        props: [
          { id: 'bin-stand', at: [bin[0], 0.275, bin[2]] }, { id: 'tote-stand', at: [tote[0], 0.265, tote[2]] },
          { id: 'bin', at: [bin[0], 0.6, bin[2]] }, { id: 'tote', at: [tote[0], 0.59, tote[2]] },
          { id: 'part', at: rest, held, offset: [0, -0.04, 0] },
        ],
      };
    },
  };
}

/** G1-D: raises its lift, turns to the shelf beside it, takes a box from the top shelf, turns to a tote and puts it in. */
function shelfPick(robot: Robot): Task {
  const { joints, presets, turn } = robot;
  const S = presets.standing ?? {};
  const raise = (pose: Pose, height: number) => set(pose, joints, /^LZ_/, height);
  const torso = (pose: Pose, yaw: number) => set(pose, joints, /^torso_Joint$/, yaw);
  // Forward and up to the top board, not straight up: the shelf is beside the robot, not above it.
  const up = set(set(S, joints, /shoulder_pitch/, -1.2), joints, /elbow/, 0.25);
  const carry = presets.carry ?? S;
  const down = set(set(S, joints, /shoulder_pitch/, -0.75), joints, /elbow/, 0.5);
  const shelf: Vec3 = [0.46, 0, 0.12], tote: Vec3 = [-0.42, 0.5, 0.12];
  const toShelf = toward(turn, shelf[0], shelf[2]), toTote = toward(turn, tote[0], tote[2]);
  return {
    label: 'Picks parts from a shelf', loop: 8, delay: 2.3, hands: ['left_hand_palm_link', 'right_hand_palm_link'],
    props: [
      { id: 'shelf', kind: 'shelf', size: [0.32, 1.18, 0.3], color: STEEL, yaw: 0 },
      { id: 'tote-stand', kind: 'stand', size: [0.24, 0.43, 0.24], color: STEEL, yaw: 0 },
      { id: 'tote', kind: 'tote', size: [0.28, 0.12, 0.24], color: SLATE, yaw: 0 },
      { id: 'box', kind: 'box', size: [0.14, 0.1, 0.12], color: CARDBOARD, yaw: 0 },
    ],
    frame: (t) => {
      const pose = track(t, [[0, raise(torso(S, 0), 0)], [1.1, raise(torso(up, toShelf), 0.21)], [1.5, raise(torso(up, toShelf), 0.21)], [2.5, raise(torso(carry, toShelf * 0.5), 0.05)], [3.4, raise(torso(carry, toTote), 0.02)], [4.0, raise(torso(down, toTote), 0)], [4.3, raise(torso(down, toTote), 0)], [5.2, raise(torso(S, 0), 0)], [8, raise(torso(S, 0), 0)]]);
      const held = t < 4.1 ? span(t, 1.15, 1.5) : 1 - span(t, 4.1, 4.25);
      const rest: Vec3 = t < 2.5 ? [shelf[0], 1.24, shelf[2]] : [tote[0], 0.55, tote[2]];
      return {
        pose, move: 0, action: t < 1.5 ? 'Reaches the top shelf' : t < 4.3 ? 'Brings the box to the tote' : 'Goes back to the shelf',
        props: [
          { id: 'shelf', at: [shelf[0], 0.59, shelf[2]] }, { id: 'tote-stand', at: [tote[0], 0.215, tote[2]] },
          { id: 'tote', at: [tote[0], 0.49, tote[2]] }, { id: 'box', at: rest, held, offset: [0, -0.03, 0] },
        ],
      };
    },
  };
}

/** Trot in place: diagonal legs together, the swinging leg folds so its foot clears the ground. The
 * dogs keep their place in the row, so they never walk into a neighbour. */
function trot(pose: Pose, legs: { hip: string; knee: string; phase: number }[], stand: { hip: number; knee: number }, t: number, walking: number, lift: { hip: number; knee: number }): Pose {
  const out: Pose = { ...pose };
  const cycle = t * Math.PI * 2 * 2.1;
  for (const leg of legs) {
    const swing = Math.max(0, Math.sin(cycle + leg.phase)) * walking;
    out[leg.hip] = stand.hip + lift.hip * swing;
    out[leg.knee] = stand.knee + lift.knee * swing;
  }
  return out;
}

/** Two working spells a loop: 0-2 s and 4-6 s; the eased weight starts and stops the gait. */
const spell = (t: number) => (t < 2 ? span(t, 0, 0.25) * (1 - span(t, 1.75, 2)) : t >= 4 && t < 6 ? span(t, 4, 4.25) * (1 - span(t, 5.75, 6)) : 0);

/** Spot: trots its round on the spot, then stops and sweeps the ground in front of it with its sensor. */
function patrolScan(robot: Robot): Task {
  const S = robot.presets.standing ?? {};
  const legs = [{ hip: 'fl_hy', knee: 'fl_kn', phase: 0 }, { hip: 'hr_hy', knee: 'hr_kn', phase: 0 }, { hip: 'fr_hy', knee: 'fr_kn', phase: Math.PI }, { hip: 'hl_hy', knee: 'hl_kn', phase: Math.PI }];
  // The scan looks towards the camera (facing +z), not along the row at the next robot.
  const front = -Math.PI / 2 - robot.turn;
  return {
    label: 'Patrols and scans the site', loop: 8, delay: 0.6, hands: [], body: 'body',
    props: [{ id: 'beam', kind: 'beam', size: [0.46, 0.46, 0.8], color: '#fb923c', yaw: 0, tilt: -0.62 }],
    frame: (t) => {
      const walking = spell(t);
      const pose = trot(S, legs, { hip: 0.75, knee: -1.45 }, t, walking, { hip: 0.3, knee: -0.55 });
      return { pose, move: 0, action: walking > 0.5 ? 'Walks its round' : 'Scans the ground', props: [{ id: 'beam', at: [0, 0, 0], opacity: 0.14 * (1 - walking), spin: front + Math.sin(t * 1.7) * 0.4 }] };
    },
  };
}

/** B2: trots with a load on its back, half a loop behind the Spot, and waits to be unloaded in between. */
function carryLoad(robot: Robot): Task {
  const S = robot.presets.standing ?? {};
  const legs = [{ hip: 'FL_thigh_joint', knee: 'FL_calf_joint', phase: 0 }, { hip: 'RR_thigh_joint', knee: 'RR_calf_joint', phase: 0 }, { hip: 'FR_thigh_joint', knee: 'FR_calf_joint', phase: Math.PI }, { hip: 'RL_thigh_joint', knee: 'RL_calf_joint', phase: Math.PI }];
  return {
    label: 'Carries material', loop: 8, delay: 4.6, hands: [], body: 'base_link',
    props: [{ id: 'load', kind: 'box', size: [0.46, 0.2, 0.3], color: CARDBOARD, yaw: robot.turn }],
    frame: (t) => {
      const walking = spell(t);
      const pose = trot(S, legs, { hip: 1.05, knee: -1.95 }, t, walking, { hip: 0.28, knee: -0.5 });
      return { pose, move: 0, action: walking > 0.5 ? 'Carries the load' : 'Waits to be unloaded', props: [{ id: 'load', at: [0, 0, 0], held: 1, offset: [0, 0.2, 0] }] };
    },
  };
}

const TASKS: Record<string, (robot: Robot) => Task> = {
  'unitree/h1-2': liftCrate,
  'unitree/g1': pickFittings,
  'unitree/g1-d': shelfPick,
  'boston-dynamics/spot': patrolScan,
  'unitree/b2': carryLoad,
};

export const taskFor = (robot: Robot): Task | null => TASKS[robot.key]?.(robot) ?? null;
