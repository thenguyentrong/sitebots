import type { Metadata } from 'next';
import { Shortlist } from '@/components/journey/Shortlist';
import { loadContent } from '@/lib/content/load';
import { PRIVATE_METADATA } from '@/lib/seo';
import { journeyContent } from '@/lib/tasks/cards';

export const metadata: Metadata = { ...PRIVATE_METADATA, title: 'Your shortlist' };
export const dynamic = 'force-dynamic';

export default function PlanPage() {
  return <>
    <noscript><p>The shortlist needs JavaScript to keep your work in this browser.</p></noscript>
    <Shortlist content={journeyContent(loadContent())} />
  </>;
}
