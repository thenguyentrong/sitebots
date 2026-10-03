import type { FormFactor } from '@/lib/spec/enums';

/** The landing's lineup after the 1.80 m site worker, left to right. All can be bought or ordered in
 * Germany. `turn` turns each body from facing +x towards the camera; the render route and the live
 * scene share it, so the still image and the 3D row match. */
export const LINEUP: readonly { key: string; name: string; href: string; form: FormFactor; turn: number }[] = [
  { key: 'unitree/h1-2', name: 'Unitree H1-2', href: '/robots/unitree/h1-2', form: 'humanoid', turn: -1.05 },
  { key: 'unitree/g1', name: 'Unitree G1', href: '/robots/unitree/g1', form: 'humanoid', turn: -1.1 },
  { key: 'unitree/g1-d', name: 'Unitree G1-D', href: '/robots/unitree/g1-d', form: 'mobile_manipulator', turn: -1.0 },
  { key: 'boston-dynamics/spot', name: 'Boston Dynamics Spot', href: '/robots/boston-dynamics/spot', form: 'quadruped', turn: -0.5 },
  { key: 'unitree/b2', name: 'Unitree B2', href: '/robots/unitree/b2', form: 'quadruped', turn: -0.5 },
];
