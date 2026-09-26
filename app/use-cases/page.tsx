import Link from 'next/link';
import { Row } from '@/components/journey/ChoiceChips';
import { Icon } from '@/components/journey/Icon';
import { StationHead } from '@/components/journey/StationHead';
import { Steps } from '@/components/journey/Steps';
import { UseCaseCard } from '@/components/journey/UseCaseCard';
import { VerdictMap, type MapPoint } from '@/components/journey/VerdictMap';
import { loadContent } from '@/lib/content/load';
import { FAMILY_IDS, SETTING_GROUPS, SITE_SECTIONS, VERDICTS, type SettingGroup, type SiteSection, type Verdict } from '@/lib/content/vocab';
import { GROUP_LABELS, SECTION_LABELS, SUBSETTING_QUESTION, VERDICT_LABELS, lbLabel, tasksLabel } from '@/lib/journey/labels';
import { publicMetadata } from '@/lib/seo';
import { familyLabels, pickExamples, settingOptions, solutionClassLabels, taskCards } from '@/lib/tasks/cards';
import { byLv } from '@/lib/tasks/order';
import type { SettingOption, TaskCard } from '@/lib/tasks/types';
import { ui } from '@/lib/ui';
import '../plan/plan.css';
import '../plan/journey.css';

export const dynamic = 'force-dynamic';
export const metadata = publicMetadata({
  title: 'Use cases',
  description: 'Construction tasks by LV trade on site, in prefabrication, in yards and in building operation, screened against five tests: object mass, dust, existing machines, variability and error tolerance. Every requirement with its source; the better answer named where a humanoid is the wrong tool.',
  path: '/use-cases',
});

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';
const ORDER: Record<Verdict, number> = { candidate: 0, marginal: 1, unscreened: 2, ruled_out: 3 };
const isGroup = (value: string): value is SettingGroup => (SETTING_GROUPS as readonly string[]).includes(value);

/** Station 1, public. The library of screened tasks: construction-site work by LV trade, the rest by kind of plant; filtered through plain links. */
export default async function UseCasesPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const setting = one(sp.setting);
  const family = one(sp.family);
  const verdict = one(sp.verdict);
  const content = loadContent();
  const settings = settingOptions(content);
  const settingOf = (id: string) => settings.find((s) => s.id === id);
  const settingTitles = Object.fromEntries(settings.map((s) => [s.id, s.title]));
  const lbOf = Object.fromEntries(settings.map((s) => [s.id, lbLabel(s.lv?.lb)]));
  const families = familyLabels(content);
  const classes = solutionClassLabels(content);
  const all = taskCards(content);
  const groupParam = one(sp.group);
  const group: SettingGroup | '' = setting ? (settingOf(setting)?.group ?? '') : isGroup(groupParam) ? groupParam : '';
  const sectionOf = (c: TaskCard): SiteSection | null => settingOf(c.setting)?.section ?? null;
  const rank = (c: TaskCard) => SETTING_GROUPS.indexOf(settingOf(c.setting)?.group ?? 'operations') * 100 + (sectionOf(c) ? SITE_SECTIONS.indexOf(sectionOf(c)!) : 0);
  const lvKey = (c: TaskCard) => settingOf(c.setting)?.lv?.lb[0] ?? '999';
  const cards = all
    .filter((c) => (!setting || c.setting === setting) && (!group || settingOf(c.setting)?.group === group) && (!family || c.family === family) && (!verdict || c.reference_verdict === verdict))
    .sort((a, b) => rank(a) - rank(b) || lvKey(a).localeCompare(lvKey(b)) || ORDER[a.reference_verdict] - ORDER[b.reference_verdict] || a.title.en.localeCompare(b.title.en));
  const filtered = Boolean(group || setting || family || verdict);
  const href = (patch: Record<string, string>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ group, setting, family, verdict, ...patch })) if (value) params.set(key, value);
    const query = params.toString();
    return '/use-cases' + (query ? '?' + query : '');
  };
  const selected = settingOf(setting);
  const inGroup = (g: SettingGroup) => all.filter((c) => settingOf(c.setting)?.group === g);
  const points: MapPoint[] = cards.map((c) => ({ id: c.id, label: c.title.en, mass: c.facts.object_mass_kg?.max ?? null, variability: c.facts.variability, verdict: c.reference_verdict }));
  const card = (c: TaskCard) => <UseCaseCard key={c.id} card={c} settings={settingTitles} lbOf={lbOf} families={families} solutionClasses={classes} showSetting={!setting} />;
  const settingChip = (s: SettingOption) => <Link key={s.id} className={s.records ? '' : 'is-empty'} href={href({ setting: setting === s.id ? '' : s.id })} aria-current={setting === s.id ? 'true' : undefined} title={s.title.de}>
    {s.lv?.lb.length ? <span className="chip-lb">{lbLabel(s.lv.lb)}</span> : null}{s.title.en}{s.records ? <span className="chip-count">{tasksLabel(s.records)}</span> : null}
  </Link>;
  const trades = (list: SettingOption[]) => <div className="chips" role="group" aria-label="Trade">{list.map(settingChip)}</div>;
  const siteGrouped = group === 'site' && !setting;
  return <main className="jp-page plan-page">
    <Steps />
    <StationHead title="Which of your work could be automated?" lede={<>Construction-site work is sorted the way a Leistungsverzeichnis sorts it: by STLB-Bau Leistungsbereich and VOB/C trade. Every task is screened against the five tests, and every requirement carries its source. <Link className="jp-link text-foreground" href="/use-cases/criteria">How a task gets in</Link>.</>} />
    <div className="jp-body">
      <section className="jp-card" aria-label="Filter the library">
        <div className="jp-rows is-compact is-first">
          <Row label="Where" labelId="filter-group">
            <div className="chips" role="group" aria-labelledby="filter-group">
              {SETTING_GROUPS.map((g) => <Link key={g} href={href({ group: group === g ? '' : g, setting: '' })} aria-current={group === g ? 'true' : undefined} className={inGroup(g).length ? '' : 'is-empty'}><Icon name={g} size={16} />{GROUP_LABELS[g]}{inGroup(g).length ? <span className="chip-count">{tasksLabel(inGroup(g).length)}</span> : null}</Link>)}
            </div>
          </Row>
          {selected ? <Row label={selected.section ? SECTION_LABELS[selected.section].en : SUBSETTING_QUESTION[selected.group].label} hint={selected.section ? SECTION_LABELS[selected.section].de : undefined}>
            <div className="flex flex-wrap items-center gap-4">{trades([selected])}<Link className="jp-link jp-text" href={href({ setting: '' })}>{selected.group === 'site' ? 'All trades' : 'All settings'}</Link></div>
          </Row> : group === 'site' ? SITE_SECTIONS.map((section) => {
            const list = settings.filter((s) => s.section === section).sort(byLv);
            return list.length ? <Row key={section} label={SECTION_LABELS[section].en} hint={SECTION_LABELS[section].de}>{trades(list)}</Row> : null;
          }) : group ? <Row label={SUBSETTING_QUESTION[group].label}>{trades(settings.filter((s) => s.group === group).sort((a, b) => a.title.en.localeCompare(b.title.en)))}</Row> : null}
        </div>
        <details className="jp-details mt-6" open={Boolean(family || verdict) || undefined}>
          <summary>More filters{family || verdict ? ` (${[family ? families[family]?.en ?? family : '', verdict ? VERDICT_LABELS[verdict as Verdict] : ''].filter(Boolean).join(', ')})` : ''}</summary>
          <div className="jp-rows is-compact">
            <Row label="Kind of work" labelId="filter-family">
              <div className="chips" role="group" aria-labelledby="filter-family">
                {FAMILY_IDS.map((id) => <Link key={id} href={href({ family: family === id ? '' : id })} aria-current={family === id ? 'true' : undefined}>{families[id]?.en ?? id}</Link>)}
              </div>
            </Row>
            <Row label="Verdict" labelId="filter-verdict">
              <div className="chips" role="group" aria-labelledby="filter-verdict">
                {VERDICTS.filter((v) => v !== 'unscreened').map((v) => <Link key={v} href={href({ verdict: verdict === v ? '' : v })} aria-current={verdict === v ? 'true' : undefined}>{VERDICT_LABELS[v]}</Link>)}
              </div>
            </Row>
          </div>
        </details>
        {selected ? <p className="jp-notice mt-6" data-testid="setting-note"><strong>{selected.title.en}{selected.lv?.lb.length ? ` · ${lbLabel(selected.lv.lb)}` : ''}{selected.lv?.atv.length ? ` · ${selected.lv.atv.join(', ')}` : ''}.</strong> {selected.coverage_note.en}</p> : null}
      </section>

      {filtered ? <>
        <div className="jp-results"><p className="jp-h3">{tasksLabel(cards.length)}</p><Link className="jp-link jp-text" href="/use-cases">Clear filters</Link></div>
        {!cards.length ? <section className="jp-card"><div className="jp-card-head"><h2>No screened tasks for this selection yet</h2><p>Check a task of your own; the same tests run on your answers.</p></div><div className="jp-actions"><Link className={ui.btn} href="/use-cases/custom">Check a task of your own</Link><Link className={ui.btnSecondary} href="/use-cases">Show every task</Link></div></section>
          : siteGrouped ? SITE_SECTIONS.map((section) => {
            const list = cards.filter((c) => sectionOf(c) === section);
            return list.length ? <section key={section} className="flex flex-col gap-4" aria-labelledby={'section-' + section}>
              <h2 id={'section-' + section} className="jp-h3">{SECTION_LABELS[section].en} <span className="jp-muted font-normal">{SECTION_LABELS[section].de} · {tasksLabel(list.length)}</span></h2>
              <div className="jp-grid">{list.map(card)}</div>
            </section> : null;
          })
          : <div className="jp-grid">{cards.map(card)}</div>}
      </> : SETTING_GROUPS.map((g) => {
        const tasks = inGroup(g);
        const where = new Set(tasks.map((c) => c.setting)).size;
        return <section key={g} className="flex flex-col gap-4" aria-labelledby={'group-' + g}>
          <div className="jp-results"><h2 id={'group-' + g} className="jp-h3 inline-flex items-center gap-2"><Icon name={g} size={20} />{GROUP_LABELS[g]}<span className="jp-muted font-normal">{tasks.length ? `${tasksLabel(tasks.length)} in ${where} ${g === 'site' ? (where === 1 ? 'trade' : 'trades') : (where === 1 ? 'setting' : 'settings')}` : 'no tasks yet'}</span></h2>{tasks.length > 3 ? <Link className="jp-link jp-text" href={href({ group: g })}>Show all {tasks.length}</Link> : null}</div>
          {tasks.length ? <div className="jp-grid">{pickExamples(tasks, 3).map(card)}</div> : null}
        </section>;
      })}

      {cards.length ? <section className="jp-card" aria-label="The tasks on two axes"><div className="jp-card-head"><h2>Where {filtered ? 'these' : 'all'} {tasksLabel(cards.length)} sit</h2></div><VerdictMap points={points} caption="Right of the dashed line is too heavy for a humanoid; the shaded band is the payload ceiling. Low variability belongs to a fixed cell." /></section> : null}

      <section className="jp-card flex flex-wrap items-center justify-between gap-4"><div className="jp-card-head"><h2>Not here? Check your own.</h2><p>Describe the task and answer the questions; the same tests run on your answers.</p></div><Link className={ui.btn} href="/use-cases/custom"><Icon name="plus" size={16} /> Check a task of your own</Link></section>
    </div>
  </main>;
}
