'use client';

import { useEffect, useRef, useState } from 'react';
import { costResult, euro, type Costs, type Project } from '@/lib/plan/model';

function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
export function CashChart({ costs }: { costs: Costs }) {
  const { ref, width } = useChartWidth();
  const result = costResult(costs);
  if (result.kind !== 'ready') return null;
  const values = result.years.map((item) => item.cash).concat(0);
  const lo = Math.min(...values), hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.12, 100);
  const x = (year: number) => 64 + year / 5 * (width - 90);
  const y = (cash: number) => 190 - (cash - lo + pad) / (hi - lo + 2 * pad) * 170;
  const path = result.years.map((item, index) => (index ? 'L' : 'M') + x(item.year) + ',' + y(item.cash)).join(' ');
  const moneyTick = (value: number) => new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  return <div ref={ref} className="min-w-0">
    <p className="mb-3 text-sm font-medium">Cumulative cash flow (€)</p>
    <svg role="img" aria-label={'Five-year cumulative cash flow ends at ' + euro(result.years[5].cash)} viewBox={'0 0 ' + width + ' 234'} className="block w-full" style={{ height: 234 }}>
      <rect x="60" y="12" width={width - 78} height="178" fill="none" stroke="var(--edge)" />
      {[lo, (lo + hi) / 2, hi].filter((value, index, all) => all.indexOf(value) === index).map((value) => <g key={value}><text x="52" y={y(value) + 4} textAnchor="end" fill="var(--muted)" fontSize="12">{moneyTick(value)}</text></g>)}
      <line x1="60" x2={width - 18} y1={y(0)} y2={y(0)} stroke="var(--edge-strong)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      {result.years.map((item) => <circle key={item.year} cx={x(item.year)} cy={y(item.cash)} r="4" fill="var(--accent)"><title>{'Year ' + item.year + ': ' + euro(item.cash)}</title></circle>)}
      {[0, 1, 3, 5].map((year) => <text key={year} x={x(year)} y="210" textAnchor="middle" fontSize="12" fill="var(--muted)">{year}</text>)}
      <text x={(width + 60) / 2} y="231" textAnchor="middle" fontSize="12" fill="var(--foreground)">Years after installation</text>
    </svg>
  </div>;
}
export function TaskMap({ project }: { project: Project }) {
  const { ref, width } = useChartWidth();
  const kg = Number(project.needs.payload);
  const x = (value: number) => 64 + (Math.log10(value) + 1) / 5 * (width - 90);
  const levels = { low: 170, medium: 108, high: 46 };
  if (!(kg > 0) || !project.variability) return null;
  return <section className="card p-5 sm:p-6">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">Mass and task variability</h2><span className="text-xs text-muted">Your assessment · {kg} kg · {project.variability} variability</span></div>
    <div ref={ref} className="mt-4 min-w-0">
      <svg role="img" aria-label={project.title + ': ' + kg + ' kg and ' + project.variability + ' task variability'} viewBox={'0 0 ' + width + ' 240'} className="w-full" style={{ height: 240 }}>
        <rect x="60" y="20" width={width - 78} height="176" fill="none" stroke="var(--edge)" />
        {(['low', 'medium', 'high'] as const).map((level) => <g key={level}><text x="52" y={levels[level] + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{level}</text><line x1="60" x2={width - 18} y1={levels[level]} y2={levels[level]} stroke="var(--edge)" /></g>)}
        {[0.1, 10, 100, 10000].map((value) => <text key={value} x={x(value)} y="216" textAnchor={value === 10000 ? 'end' : 'middle'} fontSize="12" fill="var(--muted)">{value.toLocaleString('en-GB')}</text>)}
        <circle cx={x(kg)} cy={levels[project.variability]} r="8" fill="var(--accent)" />
        <text x={(width + 60) / 2} y="238" textAnchor="middle" fontSize="12" fill="var(--foreground)">Carried mass (kg, log scale)</text>
      </svg>
    </div>
    <p className="mt-3 text-xs text-muted">Variability is your judgement. Mass alone does not establish grip, reach, autonomy or a suitable robot type.</p>
  </section>;
}
export function PriorityMap({ projects, activeId, select, title = 'Where should the next investment go?' }: { projects: Project[]; activeId: string; select: (id: string) => void; title?: string }) {
  const levels = ['low', 'medium', 'high'] as const;
  const actions = [['Defer', 'Review', 'Maintain'], ['Research', 'Assess', 'Pilot'], ['Investigate', 'Develop', 'Pilot first']];
  return <section className="priority-map card p-5 sm:p-6" aria-label={title}>
    <p className="plan-kicker mb-2">Decision overview</p><h2 className="text-xl font-semibold">{title}</h2>
    <p className="mt-2 text-sm text-muted">Business value versus deployment readiness. Positions are your assessments; critical gaps still determine the next step.</p>
    <p className="mt-6 mb-3 text-xs font-medium">Business value ↑</p>
    <div className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] gap-1.5" role="group" aria-label="Business value by deployment readiness, 3 by 3">
      {[...levels].reverse().map((value) => <div className="contents" key={value}>
        <span className="self-center text-xs text-muted">{value}</span>
        {levels.map((ready) => <div key={ready} data-priority-cell={value + ":" + ready} className="min-h-28 min-w-0 rounded-lg border border-edge bg-subtle/50 p-2">
          <p className="mb-2 text-xs text-muted">{actions[levels.indexOf(value)][levels.indexOf(ready)]}</p>
          {projects.filter((project) => project.value === value && project.readiness === ready).map((project) => <button key={project.id} type="button" aria-pressed={project.id === activeId} aria-label={(project.title || 'Untitled opportunity') + (project.gate !== 'confirmed' ? project.gate === 'blocked' ? ' Blocker' : ' Evidence open' : '')} onClick={() => select(project.id)} className={'mb-1 block w-full break-words rounded-md px-2 py-2 text-left text-xs font-medium ' + (project.id === activeId ? 'bg-foreground text-background' : 'bg-card text-foreground')}>
            <span className="priority-project-index" aria-hidden="true">{String(projects.indexOf(project) + 1).padStart(2, '0')}</span><span className="priority-project-copy">{project.title || 'Untitled opportunity'}{project.options.length ? <span className="mt-1 block font-normal opacity-80">{project.options.map((option) => option.name).join(' · ')}</span> : null}{project.gate !== 'confirmed' ? <span className="mt-1 block font-normal">{project.gate === 'blocked' ? 'Blocker' : 'Evidence open'}</span> : null}</span>
          </button>)}
        </div>)}
      </div>)}
      <span />{levels.map((level) => <span key={level} className="text-center text-xs text-muted">{level}</span>)}
    </div>
    <p className="mt-3 text-right text-xs font-medium">Readiness to deploy →</p>
    <div className="priority-mobile-key">{projects.filter((project) => project.value && project.readiness).map((project) => <div key={project.id} className={project.id === activeId ? 'is-active' : ''}><span>{String(projects.indexOf(project) + 1).padStart(2, '0')}</span><div><strong>{project.title || 'Untitled opportunity'}</strong><p>{project.value} value · {project.readiness} readiness{project.gate !== 'confirmed' ? ' · ' + (project.gate === 'blocked' ? 'Blocker' : 'Evidence open') : ''}</p>{project.options.length ? <p>{project.options.map((option) => option.name).join(' · ')}</p> : null}</div></div>)}</div>
    {projects.some((project) => !project.value || !project.readiness) ? <div className="mt-5 border-t border-edge pt-4"><p className="mb-2 text-xs text-muted">Not yet assessed</p><div className="flex flex-wrap gap-2">{projects.filter((project) => !project.value || !project.readiness).map((project) => <button key={project.id} className="rounded-full border border-edge px-3 py-2 text-xs" onClick={() => select(project.id)}>{project.title || 'Untitled opportunity'}</button>)}</div></div> : null}
  </section>;
}
