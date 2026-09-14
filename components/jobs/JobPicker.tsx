'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { JOBS } from '@/lib/plan/jobs';
import type { Project } from '@/lib/plan/model';
import { PlanIcon } from '@/components/plan/PlanIcon';
import './JobPicker.css';

const settings = [{ id: '', label: 'Not sure yet' }, { id: 'site', label: 'Construction site' }, { id: 'factory', label: 'Factory' }, { id: 'yard', label: 'Warehouse & yard' }] as const;
export function JobPicker({ setting, setSetting, onChoose, hrefFor, disabled = false, id = 'job-library', note }: {
  setting: Project['setting']; setSetting: (value: Project['setting']) => void;
  onChoose?: (jobId: string) => void; hrefFor?: (jobId: string) => string;
  disabled?: boolean; id?: string; note?: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return <section id={id} className="job-picker" aria-labelledby={id + '-title'}>
    <div className="job-picker-heading"><div><p className="job-picker-kicker">Explore the possibilities</p><h2 id={id + '-title'}>What work would you like to improve?</h2></div><p>Choose a starting point.<br />You can refine the details later.</p></div>
    <fieldset className="job-picker-settings"><legend>Where will the work happen?</legend><div>{settings.map((item) => <button key={item.id} type="button" disabled={!ready} aria-pressed={setting === item.id} onClick={() => setSetting(item.id)}>{item.id ? <PlanIcon name={item.id} size={18} /> : null}{item.label}</button>)}</div></fieldset>
    <div className="job-picker-grid">{JOBS.map((job) => {
      const content = <><span className="job-picker-top"><PlanIcon name={job.id} size={27} /><span className="job-picker-arrow" aria-hidden="true">↗</span></span><span className="job-picker-family">{job.family}</span><span className="job-picker-title">{job.title}</span><span className="job-picker-description">{job.description}</span></>;
      return hrefFor ? <Link key={job.id} href={hrefFor(job.id)} prefetch={false} className="job-picker-card" aria-label={'Find robots for: ' + job.title}>{content}</Link> : <button key={job.id} type="button" className="job-picker-card" disabled={!ready || disabled} aria-label={'Explore job: ' + job.title} onClick={() => onChoose?.(job.id)}>{content}</button>;
    })}</div>
    {disabled ? <p role="status" className="mt-5 text-sm text-muted">This browser holds 12 opportunities. Continue one of your saved assessments.</p> : null}
    <p className="job-picker-note">{note ?? 'Start with what you know. Requirements and costs can stay open until you have the evidence.'}</p>
  </section>;
}