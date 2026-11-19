import { Badge } from '@/components/ui/badge';
import { recordLang, type Lang } from '@/lib/i18n/config';
import { MARKET_SPEC_TEXT, recordDay } from '@/lib/i18n/robot';
import { requestLang } from '@/lib/i18n/server';
import { configurationSpecifications, marketSourceLabel, marketValue, type MarketValueRow } from '@/lib/market/display';
import type { Dossier } from '@/lib/market/schema';
import { plainDashes } from '@/lib/spec/display';

// Our words follow the page's language. The record's own row names, conditions, quotes and notes are the
// sources' words and are marked lang="en" on German pages.

/** `recordLabels`: the row names are the source's own (specifications); capability names are ours. */
function ValueRows({ rows, lang, recordLabels = false }: { rows: MarketValueRow[]; lang: Lang; recordLabels?: boolean }) {
  const t = MARKET_SPEC_TEXT[lang];
  const rl = recordLang(lang);
  return <dl className="divide-y divide-edge/60">
    {rows.map((row) => <div key={row.key} data-spec-field={row.key} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4 sm:px-5">
      <dt className="text-muted" lang={recordLabels ? rl : undefined}>{row.label}</dt>
      <dd className="min-w-0 space-y-1.5">
        {/* Value, who states it, the page and the date on one line; conditions and the quote below. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="num break-words font-medium" lang={typeof row.value === 'string' && row.key !== 'hands' ? rl : undefined}>{plainDashes(marketValue(row, lang))}</span>
          {row.source ? <Badge variant={row.source.kind === 'manufacturer' ? 'info' : 'warn'}>{marketSourceLabel(row.source, lang)}</Badge> : null}
          {row.source ? <span className="text-xs text-muted">
            <a href={row.source.url} title={row.source.title} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{row.source.publisher} ↗</a>
            {row.checkedAt ? <> · {t.checked} <time dateTime={row.checkedAt}>{recordDay(row.checkedAt, lang)}</time></> : null}
          </span> : row.value !== null ? <span className="text-xs text-muted">{t.noFieldSource}</span> : null}
        </div>
        {row.conditions ? <p className="text-xs leading-relaxed text-muted" lang={rl}>{plainDashes(row.conditions)}</p> : null}
        {row.quote ? <details className="text-xs text-muted">
          <summary className="cursor-pointer underline underline-offset-2">{t.exact}</summary>
          {row.quoteBasis ? <p className="mt-2 leading-relaxed">{t.quoteContext}<span lang={rl}>{row.quoteBasis}</span></p> : null}
          <blockquote className="mt-2 border-l-2 border-edge pl-3 leading-relaxed">{row.quote}</blockquote>
        </details> : null}
        {row.additionalClaims.length ? <details className="text-xs text-muted" data-additional-claims>
          <summary className="cursor-pointer underline underline-offset-2">{t.further(row.additionalClaims.length)}</summary>
          <ul className="mt-3 space-y-3">{row.additionalClaims.map((claim, index) => <li key={claim.source.id + '-' + index} className="space-y-1.5 border-l-2 border-edge pl-3">
            <p><a href={claim.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{claim.source.publisher} ↗</a> · {marketSourceLabel(claim.source, lang)} · {t.checked} <time dateTime={claim.checkedAt}>{recordDay(claim.checkedAt, lang)}</time></p>
            {claim.basis ? <p className="leading-relaxed">{t.conditions}<span lang={rl}>{claim.basis}</span></p> : null}
            <blockquote className="leading-relaxed">{claim.quote}</blockquote>
          </li>)}</ul>
        </details> : null}
      </dd>
    </div>)}
  </dl>;
}

export function MarketSpecifications({ robots }: { robots: Dossier[] }) {
  if (!robots.length) return null;
  const lang = requestLang();
  const t = MARKET_SPEC_TEXT[lang];
  const rl = recordLang(lang);
  return <div id="configuration-specs" className="scroll-mt-6">
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
      <h3 className="text-sm font-medium">{t.title}</h3>
      <span className="num text-xs text-muted">{t.configurations(robots.length)}</span>
    </div>
    <p className="px-5 py-3 text-sm leading-relaxed text-muted">{t.intro}</p>
    <div className="divide-y divide-edge/70 border-t border-edge/70">
      {robots.map((robot) => {
        const { specs, capabilities, missing, summary } = configurationSpecifications(robot, lang);
        const contextSources = robot.sources.filter((source) => robot.capabilities.sourceIds.includes(source.id));
        // Closed by default, also for a single version: one robot can carry dozens of sourced values.
        return <details key={robot.id} id={'configuration-' + robot.id} data-configuration={robot.id} className="group">
          <summary className="cursor-pointer px-5 py-4 marker:text-muted">
            <span className="font-semibold">{robot.name}</span>
            {robot.variant ? <span className="ml-2 text-sm text-muted" lang={rl}>{robot.variant}</span> : null}
            <span className="mt-1 block text-xs text-muted">{t.line(specs.length, missing.length)}<time dateTime={robot.checkedAt}>{recordDay(robot.checkedAt, lang)}</time></span>
            {summary.length ? <span className="mt-2 flex flex-wrap gap-1.5">
              {summary.map((row) => <span key={row.key} className="rounded-full border border-edge bg-subtle px-2.5 py-1 text-xs" title={[row.source ? marketSourceLabel(row.source, lang) : t.fieldSourceMissing, row.conditions].filter(Boolean).join(' · ')}>
                <span className="text-muted">{row.label} </span><strong className="num">{plainDashes(marketValue(row, lang))}</strong>
              </span>)}
            </span> : null}
            <span className="mt-2 block text-xs font-medium underline underline-offset-2 group-open:hidden">{t.showAll(specs.length)}</span>
            <span className="mt-2 hidden text-xs font-medium underline underline-offset-2 group-open:block">{t.hide}</span>
          </summary>
          <div className="border-t border-edge/70">
            {specs.length ? <ValueRows rows={specs} lang={lang} recordLabels /> : <p className="px-5 py-3 text-sm text-muted">{t.noSpecs}</p>}
            <h3 className="border-y border-edge/70 bg-subtle px-5 py-3 text-sm font-medium">{t.capabilities}</h3>
            <ValueRows rows={capabilities} lang={lang} />
            {robot.capabilities.notes.length ? <div className="border-t border-edge/70 px-5 py-4">
              <h3 className="text-sm font-medium">{t.notes}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted" lang={rl}>{robot.capabilities.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
            </div> : null}
            {missing.length ? <div className="border-t border-edge/70 bg-subtle px-5 py-4">
              <h3 className="text-sm font-medium">{t.stillMissing(robot.name)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{missing.join(' · ')}</p>
            </div> : null}
            {contextSources.length ? <details className="border-t border-edge/70 px-5 py-4 text-xs text-muted">
              <summary className="cursor-pointer underline underline-offset-2">{t.background}</summary>
              <p className="mt-2 leading-relaxed">{t.backgroundNote}</p>
              <ul className="mt-2 space-y-2">{contextSources.map((source) => <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground" lang={rl}>{source.title} ↗</a>
                <span className="block">{marketSourceLabel(source, lang)} · {t.checked} <time dateTime={source.checkedAt}>{recordDay(source.checkedAt, lang)}</time></span>
              </li>)}</ul>
            </details> : null}
          </div>
        </details>;
      })}
    </div>
  </div>;
}
