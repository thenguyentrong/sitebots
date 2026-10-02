import { MarketExplorer } from '@/components/market/MarketExplorer';
import { explorerData } from '@/lib/market/landing';
import { publicMetadata } from '@/lib/seo';
import '../plan/plan.css';
import '../plan/journey.css';

export const dynamic = 'force-dynamic';
export const metadata = publicMetadata({ title: 'Use cases for robots', description: 'Every job on the map with the humanoids, robot dogs, mobile manipulators and job-specific robots you can buy in Germany for it.', path: '/use-cases' });
type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

export default async function UseCasesPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const { jobs, initialDetail } = explorerData(one(sp.usecase));
  return <main className="jp-page plan-page visual-home">
    <MarketExplorer jobs={jobs} initialDetail={initialDetail} initial={{
      layout: one(sp.layout), x: one(sp.x), y: one(sp.y), robot: one(sp.robot) as never, where: one(sp.where), condition: one(sp.conditions), cluster: one(sp.work), query: one(sp.search),
      withRobots: one(sp.robots) === '1', selected: one(sp.usecase), view: one(sp.view) === 'map' ? 'map' : 'list',
    }} />
  </main>;
}
