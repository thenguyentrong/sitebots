import Link from 'next/link';
import { INDUSTRIES } from '@/lib/content/industries';
import type { Workflow } from '@/lib/solutions/workflows';

export function WorkflowCards({ workflows }: { workflows: Workflow[] }) {
  return <div className="grid gap-4 sm:grid-cols-2">{workflows.map((workflow) => <article key={workflow.id} className="card p-5" data-workflow={workflow.id}>
    <p className="text-xs text-muted">{workflow.industries.map((id) => INDUSTRIES[id].en).join(' · ')}</p>
    <h3 className="mt-2 text-lg font-semibold"><Link href={'/workflows/' + workflow.id} className="hover:underline">{workflow.title}</Link></h3>
    <p className="mt-2 text-sm text-muted">{workflow.summary}</p>
    <Link href={'/workflows/' + workflow.id} className="mt-4 inline-block text-sm font-medium underline underline-offset-4">Explore workflow and evidence →</Link>
  </article>)}</div>;
}

