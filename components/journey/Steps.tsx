'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { STATIONS, stationForPath, type StationId } from '@/lib/journey/stations';
import { usePlan } from '@/lib/plan/store';

/** What the visitor has done at each step, as a short sentence; empty until the plan is loaded. */
export function useStepStatus(): Partial<Record<StationId, string>> {
  const plan = usePlan();
  if (!plan.ready) return {};
  const n = plan.workspace?.projects.length ?? 0;
  return { decide: n ? `${n} in your shortlist` : '' };
}

/** The three steps as one static row under the header. Links, so it works before hydration. */
export function Steps() {
  const pathname = usePathname() ?? '/plan';
  const active = stationForPath(pathname);
  const status = useStepStatus();
  return <nav className="jp-steps plan-screen" aria-label="Journey stations">
    <ol>
      {STATIONS.map((station) => <li key={station.id}>
        <Link href={station.href} aria-current={active === station.id ? 'step' : undefined} data-done={status[station.id] ? '' : undefined}>
          <span className="jp-step-no">{station.number}</span>
          <span className="min-w-0"><strong>{station.label}</strong><small>{status[station.id] || station.hint}</small></span>
        </Link>
      </li>)}
    </ol>
  </nav>;
}
