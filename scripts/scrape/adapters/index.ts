import { westwood } from './mfr/westwood';
import { limx } from './mfr/limx';
import type { SourceAdapter } from '../_lib/types';
import { generationRobots } from './dist/generation-robots';
import { openelab } from './dist/openelab';
import { quadrupedDe } from './dist/quadruped-de';
import { humanoidGuide } from './humanoid-guide';
import { humanoidHub } from './humanoidhub';
import { bostonDynamics } from './mfr/boston-dynamics';
import { deepRobotics } from './mfr/deep-robotics';
import { makerPages } from './mfr/maker-pages';
import { onex } from './mfr/onex';
import { pal } from './mfr/pal';
import { unitree } from './mfr/unitree';
import { robotPriceIndex } from './robotpriceindex';
import { robothub } from './robothub';
import { unitreeShop } from './unitree-shop';

/** Registry, in the order they are worth running: makers, stores, distributors, then aggregators. */
export const ADAPTERS: readonly SourceAdapter[] = [
  limx,
  westwood,
  unitree,
  unitreeShop,
  bostonDynamics,
  deepRobotics,
  onex,
  pal,
  makerPages,
  quadrupedDe,
  openelab,
  generationRobots,
  humanoidGuide,
  robothub,
  robotPriceIndex,
  humanoidHub,
];

export const MANUFACTURER_ADAPTERS = ['limx', 'westwood', 'unitree', 'boston-dynamics', 'deep-robotics', 'onex', 'pal', 'maker-pages'];
export const DISTRIBUTOR_ADAPTERS = ['quadruped-de', 'openelab', 'generation-robots'];

export function adapterById(id: string): SourceAdapter {
  const a = ADAPTERS.find((x) => x.id === id);
  if (!a) throw new Error(`unknown adapter "${id}" — known: ${ADAPTERS.map((x) => x.id).join(', ')}`);
  return a;
}

export function selectAdapters(arg: string | undefined): SourceAdapter[] {
  if (!arg || arg === 'all') return [...ADAPTERS];
  if (arg === 'manufacturers') return MANUFACTURER_ADAPTERS.map(adapterById);
  if (arg === 'distributors') return DISTRIBUTOR_ADAPTERS.map(adapterById);
  return arg.split(',').map((id) => adapterById(id.trim()));
}
