import { PlanWorkspace } from '@/components/plan/PlanWorkspace';
import { publicMetadata } from '@/lib/seo';
import './plan.css';

export const metadata = publicMetadata({ title: 'Plan automation', description: 'Explore jobs, compare complete solutions, assess costs and prepare a pilot for construction and factory automation.', path: '/plan' });
export const dynamic = 'force-dynamic';

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <main className="plan-page">
    <noscript><p>This assessment needs JavaScript to save your draft in this browser.</p></noscript>
    <PlanWorkspace mode={mode} />
  </main>;
}