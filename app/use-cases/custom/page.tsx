import type { Metadata } from 'next';
import Link from 'next/link';
import { CustomCheck } from '@/components/journey/CustomCheck';
import { StationHead } from '@/components/journey/StationHead';
import { Steps } from '@/components/journey/Steps';
import { loadContent } from '@/lib/content/load';
import { PRIVATE_METADATA } from '@/lib/seo';
import { journeyContent } from '@/lib/tasks/cards';
import '../../plan/plan.css';
import '../../plan/journey.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { ...PRIVATE_METADATA, title: 'Check a task of your own' };
type Search = Promise<Record<string, string | string[] | undefined>>;

/** Step 2 for work the library does not hold: the same tests on the visitor's own answers. */
export default async function CustomTaskPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const project = Array.isArray(sp.project) ? sp.project[0] : sp.project;
  return <main className="jp-page plan-page">
    <Steps />
    <StationHead title="Check a task of your own" lede={<>For work the library does not hold yet. The same tests run on your answers; <Link className="jp-link text-foreground" href="/use-cases/criteria">how they work</Link>.</>} />
    <div className="jp-body"><CustomCheck content={journeyContent(loadContent())} projectId={project ?? ''} /></div>
  </main>;
}
