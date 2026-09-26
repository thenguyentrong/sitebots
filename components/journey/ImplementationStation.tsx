'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { CostEditor } from '@/components/plan/CostEditor';
import { PilotBrief } from '@/components/plan/PilotBrief';
import { ProjectSwitcher } from './ProjectSwitcher';
import { Saved, StationHead } from './StationHead';
import { useJourneyProject } from './useJourneyProject';

/** Station 5, first cut: the existing business case and pilot brief. Cost blocks, roadmap, RFI and calendar follow in M5. */
export function ImplementationStation() {
  const { plan, project, update, updateOption } = useJourneyProject();
  const router = useRouter();
  const briefRef = useRef<HTMLDivElement>(null);
  return <>
    <StationHead title="What will it take?" lede="Costs with their ranges, what the pilot must prove, and the brief to decide on." />
    <div className="jp-body">
      <ProjectSwitcher />
      {project ? <>
        <CostEditor project={project} updateOption={updateOption} select={(id) => update({ selectedOptionId: id })} next={() => briefRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} back={() => router.push('/plan/systems')} />
        <div ref={briefRef} id="brief" className="scroll-mt-8"><PilotBrief project={project} update={update} /></div>
      </> : null}
      {plan.ready ? <div className="jp-next plan-screen"><Saved /></div> : null}
    </div>
  </>;
}
