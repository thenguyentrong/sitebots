import Link from '@/components/LocaleLink';
import { GermanFlag } from '@/components/market/Flag';
import type { RobotUses } from '@/lib/market/use-case-views';
import { STAGE_LABEL } from '@/lib/market/use-cases';
import { CountryFlag, StageBar, StageDot, StageWords, photoFit } from './parts';
import './use-cases.css';

/** A robot at work: its photo, how far it got, where it worked, and every project with its source behind "Projects". */
export function RobotUseCard({ group, rank }: { group: RobotUses; rank?: number }) {
  const { picture } = group;
  const lead = group.uses[0];
  const more = group.places.length - 4;
  return <article className="card uc-card" data-robot={group.robotId}>
    <Link href={group.href} className="uc-media" aria-label={group.robot}>
      {/* The pictures are already 900 px WebP files, so they skip the paid image transformation. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {picture ? <img src={picture.src} alt={picture.alt} width={picture.width} height={picture.height} loading="lazy" decoding="async" className={photoFit(picture, 'p-5')} />
        : <span className="uc-none">No picture published</span>}
      <span className="uc-top">
        {rank ? <span className="num uc-rank">{rank}</span>
          : group.sold ? <span className="uc-pill"><GermanFlag className="h-2.5 w-4" title="" />Sold in Germany</span> : <span />}
        <span className="num uc-pill">{group.uses.length} {group.uses.length === 1 ? 'use' : 'uses'}</span>
      </span>
      {picture?.credit ? <span className="uc-credit">{picture.credit}</span> : null}
    </Link>
    <div className="uc-body">
      <div>
        <h3 className="uc-name"><Link href={group.href}>{group.robot}</Link></h3>
        <p className="uc-sub">{group.maker}</p>
        {group.variants.length ? <p className="uc-sub">Same projects: {group.variants.map((v, i) => <span key={v.href}>{i ? ', ' : ''}<Link href={v.href}>{v.robot}</Link></span>)}</p> : null}
      </div>
      <p className="uc-task">{lead.task}</p>
      <div className="space-y-1.5">
        <StageBar stages={group.stages} />
        <StageWords stages={group.stages} />
      </div>
      {group.places.length ? <div className="uc-places">
        {group.places.slice(0, 4).map((place) => <span key={place.label} className="uc-place"><CountryFlag code={place.country} /><span>{place.label}</span></span>)}
        {more > 0 ? <span className="uc-more">+{more} more</span> : null}
      </div> : <p className="uc-sub">The sources name no place.</p>}
      <details className="uc-projects">
        <summary><span>{group.uses.length === 1 ? 'The project and its source' : `All ${group.uses.length} projects and sources`}</span><span aria-hidden className="uc-chev">⌄</span></summary>
        <ol>
          {group.uses.map((use) => <li key={use.key}>
            <div className="uc-row"><span className="uc-row"><StageDot stage={use.stage} /><b className="font-medium">{STAGE_LABEL[use.stage]}</b></span>{use.date ? <span className="num text-faint">{use.date}</span> : null}</div>
            <p>{use.task}</p>
            <div className="uc-row uc-where">
              <span><CountryFlag code={use.countries[0]} /><span className="truncate">{use.place || 'Place not named'}</span></span>
              {use.sourceUrl ? <a href={use.sourceUrl} target="_blank" rel="noopener noreferrer">Source ↗</a> : null}
            </div>
          </li>)}
        </ol>
      </details>
    </div>
  </article>;
}
