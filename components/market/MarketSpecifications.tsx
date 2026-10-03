import { Badge } from '@/components/ui/badge';
import { configurationSpecifications, marketSourceLabel, marketValue, type MarketValueRow } from '@/lib/market/display';
import type { Dossier } from '@/lib/market/schema';

function ValueRows({ rows }: { rows: MarketValueRow[] }) {
  return <dl className="divide-y divide-edge/60">
    {rows.map((row) => <div key={row.key} data-spec-field={row.key} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4 sm:px-5">
      <dt className="text-muted">{row.label}</dt>
      <dd className="min-w-0 space-y-1.5">
        {/* Value, who states it, the page and the date on one line; conditions and the quote below. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="num break-words font-medium">{marketValue(row)}</span>
          {row.source ? <Badge variant={row.source.kind === 'manufacturer' ? 'info' : 'warn'}>{marketSourceLabel(row.source)}</Badge> : null}
          {row.source ? <span className="text-xs text-muted">
            <a href={row.source.url} title={row.source.title} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{row.source.publisher} ↗</a>
            {row.checkedAt ? <> · checked <time dateTime={row.checkedAt}>{row.checkedAt}</time></> : null}
          </span> : row.value !== null ? <span className="text-xs text-muted">Field-level source not recorded</span> : null}
        </div>
        {row.conditions ? <p className="text-xs leading-relaxed text-muted">{row.conditions}</p> : null}
        {row.quote ? <details className="text-xs text-muted">
          <summary className="cursor-pointer underline underline-offset-2">Exact source text</summary>
          {row.quoteBasis ? <p className="mt-2 leading-relaxed">Quote context: {row.quoteBasis}</p> : null}
          <blockquote className="mt-2 border-l-2 border-edge pl-3 leading-relaxed">{row.quote}</blockquote>
        </details> : null}
        {row.additionalClaims.length ? <details className="text-xs text-muted" data-additional-claims>
          <summary className="cursor-pointer underline underline-offset-2">Further source evidence for this value ({row.additionalClaims.length})</summary>
          <ul className="mt-3 space-y-3">{row.additionalClaims.map((claim, index) => <li key={claim.source.id + '-' + index} className="space-y-1.5 border-l-2 border-edge pl-3">
            <p><a href={claim.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{claim.source.publisher} ↗</a> · {marketSourceLabel(claim.source)} · checked <time dateTime={claim.checkedAt}>{claim.checkedAt}</time></p>
            {claim.basis ? <p className="leading-relaxed">This source's conditions: {claim.basis}</p> : null}
            <blockquote className="leading-relaxed">{claim.quote}</blockquote>
          </li>)}</ul>
        </details> : null}
      </dd>
    </div>)}
  </dl>;
}

export function MarketSpecifications({ robots }: { robots: Dossier[] }) {
  if (!robots.length) return null;
  return <section id="configuration-specs" className="card mt-6 scroll-mt-6 overflow-hidden" aria-labelledby="configuration-specs-title">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
      <h2 id="configuration-specs-title" className="text-sm font-semibold">Specifications by configuration</h2>
      <span className="num text-xs text-muted">{robots.length} configuration{robots.length === 1 ? '' : 's'}</span>
    </header>
    <p className="px-5 py-3 text-sm leading-relaxed text-muted">What each version&apos;s maker or seller states, with the exact source text. A source label says who makes the claim, not that it is proven; unknown means not published.</p>
    <div className="divide-y divide-edge/70 border-t border-edge/70">
      {robots.map((robot) => {
        const { specs, capabilities, missing, summary } = configurationSpecifications(robot);
        const contextSources = robot.sources.filter((source) => robot.capabilities.sourceIds.includes(source.id));
        // Closed by default, also for a single version: one robot can carry dozens of sourced values.
        return <details key={robot.id} id={'configuration-' + robot.id} data-configuration={robot.id} className="group">
          <summary className="cursor-pointer px-5 py-4 marker:text-muted">
            <span className="font-semibold">{robot.name}</span>
            {robot.variant ? <span className="ml-2 text-sm text-muted">{robot.variant}</span> : null}
            <span className="mt-1 block text-xs text-muted">{specs.length} specifications · {missing.length} research gap{missing.length === 1 ? '' : 's'} · reviewed <time dateTime={robot.checkedAt}>{robot.checkedAt}</time></span>
            {summary.length ? <span className="mt-2 flex flex-wrap gap-1.5">
              {summary.map((row) => <span key={row.key} className="rounded-full border border-edge bg-subtle px-2.5 py-1 text-xs" title={[row.source ? marketSourceLabel(row.source) : 'Field source not recorded', row.conditions].filter(Boolean).join(' · ')}>
                <span className="text-muted">{row.label} </span><strong className="num">{marketValue(row)}</strong>
              </span>)}
            </span> : null}
            <span className="mt-2 block text-xs font-medium underline underline-offset-2 group-open:hidden">Show all {specs.length} specifications and capabilities</span>
            <span className="mt-2 hidden text-xs font-medium underline underline-offset-2 group-open:block">Hide</span>
          </summary>
          <div className="border-t border-edge/70">
            {specs.length ? <ValueRows rows={specs} /> : <p className="px-5 py-3 text-sm text-muted">No sourced specifications recorded.</p>}
            <h3 className="border-y border-edge/70 bg-subtle px-5 py-3 text-sm font-medium">Capabilities and equipment</h3>
            <ValueRows rows={capabilities} />
            {robot.capabilities.notes.length ? <div className="border-t border-edge/70 px-5 py-4">
              <h3 className="text-sm font-medium">Operating conditions and configuration notes</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted">{robot.capabilities.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
            </div> : null}
            {missing.length ? <div className="border-t border-edge/70 bg-subtle px-5 py-4">
              <h3 className="text-sm font-medium">Still missing for {robot.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{missing.join(' · ')}</p>
            </div> : null}
            {contextSources.length ? <details className="border-t border-edge/70 px-5 py-4 text-xs text-muted">
              <summary className="cursor-pointer underline underline-offset-2">Background sources for the capability record</summary>
              <p className="mt-2 leading-relaxed">These sources are attached to the record as a whole. Only a source displayed beside a value is linked to that field.</p>
              <ul className="mt-2 space-y-2">{contextSources.map((source) => <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{source.title} ↗</a>
                <span className="block">{marketSourceLabel(source)} · checked <time dateTime={source.checkedAt}>{source.checkedAt}</time></span>
              </li>)}</ul>
            </details> : null}
          </div>
        </details>;
      })}
    </div>
  </section>;
}
