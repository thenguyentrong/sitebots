import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LineupLive, type LiveItem } from '@/components/robot-viewer/LineupLive';
import { getRobotModel } from '@/lib/models/index';
import { resolvePresets } from '@/lib/models/poses';
import { LINEUP } from '@/lib/models/lineup';
import { PRIVATE_METADATA } from '@/lib/seo';
import '../../plan/journey.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { ...PRIVATE_METADATA, title: 'Lineup render' };

/** Development only: the job site as the strip phones scroll sideways (scripts/assets/render-lineup.mjs makes the stills). */
export default function LineupPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  const items: LiveItem[] = LINEUP.flatMap((row) => {
    const entry = getRobotModel(row.key);
    return entry ? [{ key: row.key, name: row.name, href: row.href, turn: row.turn, entry, presets: resolvePresets(row.key, row.form, entry.joints.joints), heightM: entry.joints.modelHeightM || entry.heightM }] : [];
  });
  return <main data-lineup-strip style={{ width: 1200, height: 320 }}><LineupLive items={items} mode="strip" /></main>;
}
