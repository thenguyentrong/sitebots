'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { CompareToggle } from '@/components/compare/CompareBar';
import { RobotPhoto } from '@/components/robot/RobotPhoto';
import { MARKET_STAGES, ROBOT_GROUPS, USE_CASES, clusterMembers, selectedTasks, type ClusterRobot } from '@/lib/catalogue/landscape';
import './RobotLandscape.css';

const trustLabels = { verified: 'Manufacturer states it', assessed: 'Curated assessment', reported: 'Reported · confirm task', unknown: 'Not established' };
const dateLabel = (value: string | null) => value ? value.slice(0, 10) : 'date not recorded';
export function RobotLandscape({ robots, title = 'Explore robot clusters', scope = 'Public catalogue', allowMakerFilter = false }: { robots: ClusterRobot[]; title?: string; scope?: string; allowMakerFilter?: boolean }) {
  const id = useId();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [visible, setVisible] = useState(true);
  const [selection, setSelection] = useState('');
  const [grouping, setGrouping] = useState<'type' | 'usecase'>('type');
  const rows = grouping === 'type' ? ROBOT_GROUPS : USE_CASES;
  const [maker, setMaker] = useState('');
  const [officialOnly, setOfficialOnly] = useState(false);
  const [limit, setLimit] = useState(6);
  const makers = [...new Map(robots.map((robot) => [robot.makerSlug, robot.maker])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const scoped = robots.filter((robot) => !maker || robot.makerSlug === maker);
  // The evidence toggle filters mapped cells; unclassified robots remain discoverable.
  const mapped = scoped.filter((robot) => grouping === 'type' || !officialOnly || robot.trust === 'verified');
  const unmapped = scoped.filter((robot) => grouping === 'type' ? robot.stage === null : robot.unmappedReason !== null);
  const members = selection === 'unmapped' ? unmapped : clusterMembers(mapped, selection);
  const row = rows.find((group) => group.id === selection.split(':')[0]);
  const column = MARKET_STAGES.find((stage) => stage.id === selection.split(':')[1]);
  const mappedCount = mapped.filter((robot) => grouping === 'type' ? robot.stage !== null : robot.unmappedReason === null).length;
  function choose(value: string) { setSelection(selection === value ? '' : value); setLimit(6); }
  return <section className="robot-landscape" aria-labelledby={id + '-title'}>
    <header className="landscape-header"><div><h2 id={id + '-title'}>{title}</h2><p>See the whole catalogue in one view. Select a cluster to discover its robots and compare them.</p></div><button className="landscape-collapse" disabled={!ready} aria-expanded={visible} aria-controls={id + '-body'} onClick={() => setVisible(!visible)}>{visible ? 'Hide map −' : 'Show map +'}</button></header>
    <div id={id + '-body'} hidden={!visible}>
      <div className="landscape-view-switch" role="group" aria-label="Cluster view"><button disabled={!ready} aria-pressed={grouping === 'type'} onClick={() => { setGrouping('type'); setSelection(''); }}>Robot types</button><button disabled={!ready} aria-pressed={grouping === 'usecase'} onClick={() => { setGrouping('usecase'); setSelection(''); }}>Use cases</button><span>{grouping === 'type' ? 'All configurations, grouped by platform and recorded availability.' : 'Recorded task claims. Robots without a task assessment stay in the reference group.'}</span></div>
      <div className="landscape-tools"><p><strong>{scoped.length}</strong> configurations <span>·</span> {scope}</p><div>{allowMakerFilter ? <label><span className="sr-only">Map manufacturer</span><select disabled={!ready} value={maker} onChange={(event) => { setMaker(event.target.value); setSelection(''); setLimit(6); }}><option value="">All manufacturers</option>{makers.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}</select></label> : null}{grouping === 'usecase' ? <label className="landscape-evidence-filter"><input type="checkbox" disabled={!ready} checked={officialOnly} onChange={(event) => { setOfficialOnly(event.target.checked); setLimit(6); }} /> Manufacturer task evidence only</label> : null}</div></div>
      <div className="landscape-axis"><span>{grouping === 'type' ? 'Robot type ↓' : 'Recorded use case ↓'}</span><span>Market access →</span></div>
      <div className="landscape-matrix" role="group" aria-label={(grouping === 'type' ? 'Robot type' : 'Use case') + ' by market access, 3 by 3'}>
        <div aria-hidden="true" />{MARKET_STAGES.map((stage) => <div className="landscape-column" key={stage.id}><strong>{stage.label}</strong><span>{stage.hint}</span></div>)}
        {rows.map((group) => <div className="landscape-row" key={group.id}>
          <div className="landscape-row-label"><strong>{group.label}</strong><small>{group.hint}</small></div>
          {MARKET_STAGES.map((stage) => {
            const key = group.id + ':' + stage.id;
            const items = clusterMembers(mapped, key);
            return <button key={key} className="landscape-cell" data-cluster={key} aria-label={group.label + ' · ' + stage.label + ' · ' + items.length + ' configurations'} aria-pressed={selection === key} aria-controls={id + '-results'} disabled={!ready || !items.length} onClick={() => choose(key)}>
              <span className="landscape-cell-top"><strong>{items.length}</strong><span aria-hidden="true">{items.length ? '↗' : '—'}</span></span>
              <span className="landscape-cell-names">{items.slice(0, 2).map((robot) => <span key={robot.id}>{robot.name}{robot.variant !== 'base' ? ' · ' + robot.variant : ''}</span>)}{items.length > 2 ? <small>+{items.length - 2} more</small> : null}{!items.length ? <small>No recorded matches</small> : null}</span>
            </button>;
          })}
        </div>)}
      </div>
      <div className="landscape-foot"><p>{mappedCount} configurations in this view. {grouping === 'type' ? 'Each configuration appears once.' : 'A robot can appear in several use cases.'}</p><button onClick={() => choose('unmapped')} disabled={!ready || !unmapped.length} aria-pressed={selection === 'unmapped'} aria-controls={id + '-results'}>Not yet mapped / reference <strong>{unmapped.length}</strong> <span aria-hidden="true">→</span></button></div>
      <div id={id + '-results'} className="landscape-results" hidden={!selection}>
        <div className="landscape-results-heading"><div><p className="landscape-eyebrow">Inside this cluster</p><h3>{selection === 'unmapped' ? 'Needs evidence or kept for reference' : row?.label + ' / ' + column?.label}</h3><p>{members.length} configurations{grouping === 'usecase' && officialOnly && selection !== 'unmapped' ? ' with manufacturer task evidence' : ''}</p></div><button onClick={() => setSelection('')} aria-label="Close cluster details">×</button></div>
        {!members.length ? <p className="landscape-no-results">No configurations meet this evidence filter. Clear the checkbox to include assessed and reported task claims.</p> : <ul className="landscape-robot-list">{members.slice(0, limit).map((robot) => <li key={robot.id}>
          <div className="landscape-robot-heading">{robot.image ? <RobotPhoto sizes="64px" url={robot.image} alt="" formFactor={robot.form} className="landscape-photo" /> : null}<div><p>{robot.maker}</p><h4><Link href={robot.href}>{robot.name} <span aria-hidden="true">↗</span></Link></h4><span>{robot.variant === 'base' ? robot.stageLabel : robot.variant + ' · ' + robot.stageLabel}</span></div></div>
          <p className="landscape-task-list">{robot.unmappedReason && selection === 'unmapped' ? robot.unmappedReason : selectedTasks(robot, selection).map((task) => task.label).join(' · ') || 'Task capabilities not assessed'}</p>
          <div className="landscape-robot-bottom"><span className={'landscape-trust trust-' + robot.trust}>{trustLabels[robot.trust]}</span><CompareToggle id={robot.id} name={robot.name} /></div>
          <details className="landscape-sources"><summary>Why this placement?</summary><p>Stage: {robot.stageLabel}. {robot.stageSource ? <a href={robot.stageSource} target="_blank" rel="noopener noreferrer">Status evidence ↗</a> : <Link href={robot.href + '#sources'}>Review the profile sources ↗</Link>} {robot.stageDate ? <span>Checked {dateLabel(robot.stageDate)}.</span> : <span>The stage is the catalogue record; confirmation is still required.</span>}</p><p>Tasks: {robot.taskSource ? <><a href={robot.taskSource} target="_blank" rel="noopener noreferrer">{trustLabels[robot.trust]} ↗</a> · {dateLabel(robot.taskDate)}.</> : robot.tasks.length ? 'Curated task record; a primary-source link has not been recorded.' : 'No usable task source recorded.'}</p><p>A listed task may need additional tools, software, an operator or an integrator. Confirm the exact setup and delivery region with the supplier.</p></details>
        </li>)}</ul>}
        {members.length > limit ? <button className="landscape-more" onClick={() => setLimit(limit + 12)}>Show more in this cluster ({members.length - limit} remaining)</button> : null}
      </div>
      <details className="landscape-method"><summary>How to read this map</summary><div><p>Rows use recorded task claims, with manufacturer statements, curated assessments and unverified reports kept distinct. Navigation, a robot shape, or a payload figure alone does not establish a job capability.</p><p>Columns use the recorded lifecycle: commercial/shipping models; upcoming concepts, prototypes and pre-orders; and unconfirmed availability. Commercial can include enterprise sales; it does not establish stock, German delivery or readiness for your site. A price never determines placement.</p><p>Configurations are counted separately. The Robot types view covers all platforms, including unconfirmed availability. In Use cases, missing task assessments stay in the reference group. Discontinued products are kept there in both views. This is a browsing aid, not a business-value or investment score.</p></div></details>
    </div>
  </section>;
}