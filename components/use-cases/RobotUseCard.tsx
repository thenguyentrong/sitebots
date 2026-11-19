import Link from 'next/link';
import { GermanFlag } from '@/components/market/Flag';
import type { RobotUses } from '@/lib/market/use-case-views';
import { STAGE_LABEL } from '@/lib/market/use-cases';
import { CountryFlag, StageBar, StageDot, StageWords } from './parts';

/** A robot at work: its photo, how far it got, where it worked, and every project with its source behind "Projects". */
export function RobotUseCard({ group, rank }: { group: RobotUses; rank?: number }) {
  const { picture } = group;
  const lead = group.uses[0];
  const more = group.places.length - 4;
  return <article className="card group flex flex-col overflow-hidden" data-robot={group.robotId}>
    <Link href={group.href} className="relative block aspect-[4/3] overflow-hidden bg-white" aria-label={group.robot}>
      {/* The pictures are already 900 px WebP files, so they skip the paid image transformation. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {picture ? <img src={picture.src} alt={picture.alt} width={picture.width} height={picture.height} loading="lazy" decoding="async"
        className={(picture.scene ? 'object-cover' : 'object-contain p-5') + ' h-full w-full transition duration-500 group-hover:scale-[1.03]'} />
        : <span className="grid h-full place-items-center bg-subtle text-xs text-faint">No picture published</span>}
      <span className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        {rank ? <span className="num grid h-8 min-w-8 place-items-center rounded-full bg-foreground px-2 text-sm font-semibold text-background">{rank}</span>
          : group.sold ? <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm"><GermanFlag className="h-2.5 w-4" title="" />Sold in Germany</span> : <span />}
        <span className="num rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">{group.uses.length} {group.uses.length === 1 ? 'use' : 'uses'}</span>
      </span>
      {picture?.credit ? <span className="absolute bottom-2 right-2 max-w-[70%] truncate rounded bg-card/90 px-1.5 py-0.5 text-[10px] text-muted">{picture.credit}</span> : null}
    </Link>
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div>
        <h3 className="font-semibold leading-snug"><Link href={group.href} className="underline-offset-4 hover:underline">{group.robot}</Link></h3>
        <p className="mt-0.5 text-xs text-muted">{group.maker}</p>
        {group.variants.length ? <p className="mt-1 text-xs text-muted">Same projects: {group.variants.map((v, i) => <span key={v.href}>{i ? ', ' : ''}<Link href={v.href} className="underline underline-offset-2 hover:text-foreground">{v.robot}</Link></span>)}</p> : null}
      </div>
      <p className="line-clamp-2 text-sm">{lead.task}</p>
      <div className="space-y-1.5">
        <StageBar stages={group.stages} />
        <StageWords stages={group.stages} />
      </div>
      {group.places.length ? <div className="flex flex-wrap gap-1.5">
        {group.places.slice(0, 4).map((place) => <span key={place.label} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-edge px-2.5 py-1 text-xs">
          <CountryFlag code={place.country} /><span className="truncate">{place.label}</span>
        </span>)}
        {more > 0 ? <span className="rounded-full bg-subtle px-2.5 py-1 text-xs text-muted">+{more} more</span> : null}
      </div> : <p className="text-xs text-faint">The sources name no place.</p>}
      <details className="group/projects mt-auto border-t border-edge/70 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-muted transition hover:text-foreground [&::-webkit-details-marker]:hidden">
          <span>{group.uses.length === 1 ? 'The project and its source' : `All ${group.uses.length} projects and sources`}</span>
          <span aria-hidden className="transition group-open/projects:rotate-180">⌄</span>
        </summary>
        <ol className="mt-3 space-y-2">
          {group.uses.map((use) => <li key={use.key} className="rounded-xl bg-subtle/70 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-medium"><StageDot stage={use.stage} />{STAGE_LABEL[use.stage]}</span>
              {use.date ? <span className="num text-faint">{use.date}</span> : null}
            </div>
            <p className="mt-1.5 text-foreground">{use.task}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-muted">
              <span className="inline-flex min-w-0 items-center gap-1.5"><CountryFlag code={use.countries[0]} /><span className="truncate">{use.place || 'Place not named'}</span></span>
              {use.sourceUrl ? <a href={use.sourceUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 underline underline-offset-2 hover:text-foreground">Source ↗</a> : null}
            </div>
          </li>)}
        </ol>
      </details>
    </div>
  </article>;
}
