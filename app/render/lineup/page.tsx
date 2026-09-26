import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LineupRender, type LineupItem } from '@/components/robot-viewer/LineupScene';
import { getRobotModel } from '@/lib/models/index';
import { resolvePresets } from '@/lib/models/poses';
import { PRIVATE_METADATA } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { ...PRIVATE_METADATA, title: 'Lineup render' };

/** Humanoid, wheeled mobile manipulator, quadrupeds: the three body types the catalogue covers. */
const LINEUP = [
  { key: 'unitree/h2', form: 'humanoid', turn: -1.05 },
  { key: 'unitree/g1', form: 'humanoid', turn: -1.1 },
  { key: 'rainbow/rb-y1', form: 'mobile_manipulator', turn: -1.0 },
  { key: 'boston-dynamics/spot', form: 'quadruped', turn: -0.5 },
  { key: 'unitree/b2', form: 'quadruped', turn: -0.5 },
] as const;

/** Development only: the scene the landing's lineup image is rendered from (scripts/assets/render-lineup.mjs). */
export default async function LineupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const tall = (await searchParams).tall;
  if (process.env.NODE_ENV === 'production') notFound();
  const items: LineupItem[] = LINEUP.map((row, i) => (i === 0 && tall ? { ...row, key: tall } : row)).flatMap(({ key, form, turn }) => {
    const entry = getRobotModel(key);
    return entry ? [{ key, entry, pose: resolvePresets(key, form, entry.joints.joints).standing ?? {}, turn }] : [];
  });
  // Transparent page, so the screenshot keeps only the robots and their shadows.
  return <main className="mx-auto w-full max-w-[1600px] p-6"><style>{'html, body { background: transparent !important; }'}</style><LineupRender items={items} /></main>;
}
