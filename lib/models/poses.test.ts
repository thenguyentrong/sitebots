import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { IndexFile } from './schemas';
import { resolvePresets } from './poses';
const index = IndexFile.parse(JSON.parse(readFileSync('data/models/index.json', 'utf8')));
it('variant poses use their own settings', () => {
  const plus = index.robots['unitree/h2#plus'];
  const poses = resolvePresets('unitree/h2#plus', 'humanoid', plus.joints.joints);
  expect(poses.standing.left_pinky_CMC).toBeCloseTo(0.2618);
  const wheeled = index.robots['unitree/go2#w'];
  expect(resolvePresets('unitree/go2#w', 'quadruped', wheeled.joints.joints).standing.FL_calf_joint).toBe(-1.5);
});
it('does not advertise presets that have no matching joints', () => {
  const entry = index.robots['engineai/pm01'];
  expect(Object.keys(resolvePresets('engineai/pm01', 'humanoid', entry.joints.joints))).toEqual(['standing']);
});
