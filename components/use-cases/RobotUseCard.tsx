import Link from '@/components/LocaleLink';
import { GermanFlag } from '@/components/market/Flag';
import { recordLang, type Lang } from '@/lib/i18n/config';
import { MARKET_TEXT } from '@/lib/i18n/market';
import { requestLang } from '@/lib/i18n/server';
import { USE_CARD_TEXT } from '@/lib/i18n/use-cases';
import { robotPlaces, type RobotUses } from '@/lib/market/use-case-views';
import { useDate, usePlace, useStageLabel } from '@/lib/market/use-cases';
import { CountryFlag, StageBar, StageDot, StageWords, photoFit } from './parts';
import './use-cases.css';

/** A robot at work: its photo, how far it got, where it worked, and every project with its source behind "Projects".
 * The task text comes from the robot records, which are in English, so it carries lang="en" on German pages. */
export function RobotUseCard({ group, rank, lang = requestLang() }: { group: RobotUses; rank?: number; lang?: Lang }) {
  const t = USE_CARD_TEXT[lang];
  const { picture } = group;
  const lead = group.uses[0];
  // Named again in the page's language: the group's own places are English (see usePlace).
  const places = lang === 'en' ? group.places : robotPlaces(group.uses, lang);
  const more = places.length - 4;
  return <article className="card uc-card" data-robot={group.robotId}>
    <Link href={group.href} className="uc-media" aria-label={group.robot}>
      {/* The pictures are already 900 px WebP files, so they skip the paid image transformation. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {picture ? <img src={picture.src} alt={picture.alt} lang={recordLang(lang)} width={picture.width} height={picture.height} loading="lazy" decoding="async" className={photoFit(picture, 'p-5')} />
        : <span className="uc-none">{t.noPicture}</span>}
      <span className="uc-top">
        {rank ? <span className="num uc-rank">{rank}</span>
          : group.sold ? <span className="uc-pill"><GermanFlag className="h-2.5 w-4" title="" />{t.sold}</span> : <span />}
        <span className="num uc-pill">{t.uses(group.uses.length)}</span>
      </span>
      {picture?.credit ? <span className="uc-credit">{picture.credit}</span> : null}
    </Link>
    <div className="uc-body">
      <div>
        <h3 className="uc-name"><Link href={group.href}>{group.robot}</Link></h3>
        <p className="uc-sub">{group.maker}</p>
        {group.variants.length ? <p className="uc-sub">{t.sameProjects}{group.variants.map((v, i) => <span key={v.href}>{i ? ', ' : ''}<Link href={v.href}>{v.robot}</Link></span>)}</p> : null}
      </div>
      <p className="uc-task" lang={recordLang(lang)}>{lead.task}</p>
      <div className="space-y-1.5">
        <StageBar stages={group.stages} lang={lang} />
        <StageWords stages={group.stages} lang={lang} />
      </div>
      {places.length ? <div className="uc-places">
        {places.slice(0, 4).map((place) => <span key={place.label} className="uc-place"><CountryFlag code={place.country} /><span>{place.label}</span></span>)}
        {more > 0 ? <span className="uc-more">{t.more(more)}</span> : null}
      </div> : <p className="uc-sub">{t.noPlace}</p>}
      <details className="uc-projects">
        <summary><span>{t.projects(group.uses.length)}</span><span aria-hidden className="uc-chev">⌄</span></summary>
        <ol>
          {group.uses.map((use) => <li key={use.key}>
            <div className="uc-row"><span className="uc-row"><StageDot stage={use.stage} /><b className="font-medium">{useStageLabel(use.stage, lang)}</b></span>{use.date ? <span className="num text-faint">{useDate(use.date, lang)}</span> : null}</div>
            <p lang={recordLang(lang)}>{use.task}</p>
            <div className="uc-row uc-where">
              <span><CountryFlag code={use.countries[0]} /><span className="truncate">{usePlace(use, lang) || MARKET_TEXT[lang].region.NONE}</span></span>
              {use.sourceUrl ? <a href={use.sourceUrl} target="_blank" rel="noopener noreferrer">{t.source} ↗</a> : null}
            </div>
          </li>)}
        </ol>
      </details>
    </div>
  </article>;
}
