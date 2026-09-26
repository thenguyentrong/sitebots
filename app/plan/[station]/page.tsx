import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ImplementationStation } from '@/components/journey/ImplementationStation';
import { PrioritiesStation } from '@/components/journey/PrioritiesStation';
import { SystemsStation } from '@/components/journey/SystemsStation';
import { loadContent } from '@/lib/content/load';
import { isPlanStation } from '@/lib/journey/stations';
import { PRIVATE_METADATA } from '@/lib/seo';
import { journeyContent } from '@/lib/tasks/cards';

export const dynamic = 'force-dynamic';
type Params = Promise<{ station: string }>;

const TITLES: Record<string, string> = { priorities: 'Which task first', systems: 'Solutions', implementation: 'Cost and pilot' };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { station } = await params;
  return { ...PRIVATE_METADATA, title: TITLES[station] ? `${TITLES[station]} · Decide` : 'Decide' };
}

/** The Decide pages. The old first steps redirect: the library is where you start, the shortlist replaces the screening page. */
export default async function StationPage({ params }: { params: Params }) {
  const { station } = await params;
  if (!isPlanStation(station)) notFound();
  if (station === 'context') redirect('/use-cases');
  if (station === 'screen') redirect('/plan');
  const content = journeyContent(loadContent());
  switch (station) {
    case 'priorities':
      return <PrioritiesStation content={content} />;
    case 'systems':
      return <SystemsStation content={content} />;
    case 'implementation':
      return <ImplementationStation />;
  }
}
