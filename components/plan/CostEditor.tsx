'use client';

import Link from 'next/link';
import { costResult, euro, type PlanOption, type Project } from '@/lib/plan/model';
import { ui } from '@/lib/ui';
import { Field, Notes } from './Fields';
import { PriceReference } from './PriceReference';
import { useAssessment } from './useAssessment';
import { jobById } from '@/lib/plan/jobs';
import { CashChart } from './PlanCharts';

export function CostEditor({ project, updateOption, select, next, back }: { project: Project; updateOption: (id: string, patch: Partial<PlanOption>) => void; select: (id: string) => void; next: () => void; back: () => void }) {
  const option = project.options.find((item) => item.id === project.selectedOptionId) ?? project.options[0];
  const assessment = useAssessment(project, option?.robotId ? [option.robotId] : [], Boolean(option?.robotId));
  const reference = assessment.data?.results.find((item) => item.id === option?.robotId);
  if (!option) return <section className="card p-6"><h2 className="text-xl font-semibold">Add a solution to estimate its costs</h2><p className="mt-3 text-sm text-muted">Choose a robot or add a custom setup in Solutions. Each setup keeps its own assumptions.</p><button className="plan-primary mt-5" onClick={back}>Choose a solution →</button></section>;
  const result = costResult(option.costs);
  const fields = [
    { key: 'initial' as const, label: 'Total initial spend (€)', hint: 'Robot, tools, integration, commissioning, site preparation and training.' },
    { key: 'hours' as const, label: 'Net hours released per year', hint: 'After supervision, interventions, replenishment and fallback work.' },
    { key: 'rate' as const, label: 'Loaded labor cost (€/hour)', hint: 'Use a comparable labor cost for this client.' },
    { key: 'cashShare' as const, label: 'Hours converted to cash savings (%)', hint: 'Freed time is capacity unless an actual cash expense is avoided.' },
    { key: 'annual' as const, label: 'Additional operating cost (€/year)', hint: 'Maintenance, licenses, energy and support. Avoid counting operator time twice.' },
  ];
  return <div className="space-y-6">
    <section className="card p-5 sm:p-6">
      <p className="eyebrow">Business case</p><h2 className="mt-2 text-xl font-semibold">What could the whole setup cost?</h2>
      <div className="mt-5 max-w-lg"><Field label="Solution being estimated"><select className={ui.select} value={option.id} onChange={(event) => select(event.target.value)}>{project.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div>
      <div className="finder-cost-reference">
        {reference ? <PriceReference result={reference} /> : <div><p className="plan-kicker">Starting budget</p><h3>{assessment.loading ? 'Checking price evidence…' : 'Get a quote for this setup'}</h3><p>{assessment.error || (option.kind === 'custom' ? 'Ask for the equipment and integration together.' : 'No usable price reference is available yet.')}</p>{assessment.error ? <button className="underline" onClick={assessment.retry}>Retry price check</button> : null}</div>}
        <div><p className="plan-kicker">Include in your project budget</p><ol><li>Robot or equipment in the right configuration</li><li>{jobById(project.jobId).setup[0]}</li><li>Software, integration and commissioning</li><li>Site preparation, training and contingency</li></ol><p>Ask the supplier to separate purchase or lease costs from recurring fees, and confirm supply and support in Germany.</p></div>
      </div>
      <h3 className="mt-6 font-semibold">Your budget and optional payback check</h3>
      <p className="mt-3 text-sm text-muted">Your assumptions for this setup, compared with the current process. Catalogue prices are not automatically treated as installed costs.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{fields.map((field) => <Field key={field.key} label={field.label} hint={field.hint}><input className={ui.input} type="number" min="0" max={field.key === 'cashShare' ? 100 : field.key === 'hours' ? 1000000 : 1000000000} step="any" value={option.costs[field.key]} placeholder="Not yet estimated" onChange={(event) => updateOption(option.id, { costs: { ...option.costs, [field.key]: event.target.value } })} /></Field>)}</div>
      <div className="mt-6"><Notes label="Basis for these estimates" value={option.evidence} onChange={(evidence) => updateOption(option.id, { evidence })} placeholder="Quote date and configuration, measured workload, assumptions and open questions." /></div>
    </section>
    {result.kind === 'ready' ? <section className="card p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-3" aria-live="polite">
        <div><p className="label">Net annual cash benefit</p><p className="num mt-2 text-2xl font-semibold" data-testid="plan-net">{euro(result.net)}</p></div>
        <div><p className="label">Simple payback</p><p className="num mt-2 text-2xl font-semibold" data-testid="plan-payback">{result.payback !== null ? result.payback.toFixed(1) + ' years' : 'No payback'}</p></div>
        <div><p className="label">Released capacity value</p><p className="num mt-2 text-2xl font-semibold">{euro(result.capacity)}<span className="text-sm font-normal"> / year</span></p></div>
      </div>
      <div className="mt-8"><CashChart costs={option.costs} /></div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm"><caption className="mb-3 text-left font-medium">If the released hours differ from your estimate</caption><thead className="text-xs text-muted"><tr><th className="py-2 pr-4">Hours achieved</th><th className="py-2 pr-4">Annual cash benefit</th><th className="py-2">Payback</th></tr></thead><tbody>{[0.8, 1, 1.2].map((factor) => {
          const scenario = costResult(option.costs, factor);
          return scenario.kind === 'ready' ? <tr key={factor} className="border-t border-edge"><td className="py-3 pr-4">{factor * 100}%{factor === 1 ? ' · your estimate' : ''}</td><td className="num py-3 pr-4">{euro(scenario.net)}</td><td className="num py-3">{scenario.payback !== null ? scenario.payback.toFixed(1) + ' years' : 'No payback'}</td></tr> : null;
        })}</tbody></table>
      </div>
      <p className="mt-4 text-xs text-muted">Sensitivity cases are arithmetic scenarios, not forecasts. Constant annual cash flow; no discounting, ramp-up, tax, financing or residual value. Quality and capacity benefits need separate evidence. <Link href="/methodology#planning" className="underline underline-offset-4">Calculation method</Link></p>
    </section> : <p role={result.kind === 'invalid' ? 'alert' : 'status'} className="rounded-xl border border-edge bg-subtle p-5 text-sm">{result.kind === 'missing' ? 'Complete all five cost inputs to calculate payback. You can continue with an open budget and use the brief to request a quote. Enter zero only when it is a known zero.' : 'Check the inputs: use nonnegative numbers and a cash conversion between 0 and 100%.'}</p>}
    <div className="flex justify-end"><button className={ui.btn} onClick={next}>Prepare pilot brief →</button></div>
  </div>;
}
