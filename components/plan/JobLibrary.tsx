'use client';

import Link from 'next/link';
import { JobPicker } from '@/components/jobs/JobPicker';
import type { Project } from '@/lib/plan/model';


export function JobLibrary({ setting, setSetting, start, full, resume, surface = 'planner', ready = true }: {
  surface?: 'planner' | 'finder'; ready?: boolean;
  setting: Project['setting']; setSetting: (value: Project['setting']) => void;
  start: (jobId?: string) => void; full: boolean; resume?: { title: string; action: () => void };
}) {
  const finder = surface === 'finder';
  return <div className="plan-discover">
    <header className="plan-hero">
      <div className="plan-hero-copy">
        <p className="plan-kicker"><span /> {finder ? 'Find a robot' : 'Automation planner'}</p>
        <h1>Better work.<br /><span>Start with one job.</span></h1>
        <p>Explore where robots could help your team. Turn an everyday task into a shortlist, a business case, and a plan to try it.</p>
        <div className="plan-hero-actions"><button className="plan-primary" disabled={full || !ready} onClick={() => start()}>{finder ? 'Start with my job' : 'Assess my job'} <span aria-hidden="true">↗</span></button><a className="plan-text-link" href={finder ? '#matcher' : '#job-library'}>Explore possible jobs <span aria-hidden="true">↓</span></a></div>
      </div>
      <div className="plan-journey" aria-label="Your assessment, in four steps">
        <p className="plan-kicker">Your path to a decision</p>
        {[['01', 'Choose the work', 'A task worth improving'], ['02', 'Compare the options', 'Robots and other approaches'], ['03', 'Check the numbers', 'Costs, savings and payback'], ['04', 'Plan a pilot', 'What a trial needs to prove']].map(([number, title, hint], index) => <div className="plan-journey-row" key={number}><span className={'plan-journey-number' + (index === 0 ? ' is-first' : '')}>{number}</span><div><strong>{title}</strong><p>{hint}</p></div>{index === 0 ? <span className="plan-here">Start here</span> : null}</div>)}
      </div>
    </header>
    {resume ? <div className="plan-resume"><div><span className="plan-kicker">Your saved assessment</span><p>{resume.title || 'Untitled opportunity'}</p></div><button className="plan-secondary" onClick={resume.action}>Continue assessment <span aria-hidden="true">→</span></button></div> : null}
    <JobPicker id={finder ? 'matcher' : 'job-library'} setting={setting} setSetting={setSetting} onChoose={start} disabled={full} />
    {finder ? <p className="finder-browse-link">Just exploring the market? <Link href="/robots">Browse all robots <span aria-hidden="true">↗</span></Link></p> : null}
  </div>;
}