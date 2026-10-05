'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/journey/Icon';
import { OPPORTUNITY_CLUSTERS } from '@/lib/discovery/model';
import { TYPE_PLURAL } from '@/lib/market/cards';
import type { CountKey, JobDetail, JobMapPoint } from '@/lib/market/jobs';
import { jobRank, proofOf } from '@/lib/market/proof';
import type { RobotType } from '@/lib/market/schema';
import { AXES, AXIS_IDS, CONDITIONS, HAND_LABELS, MOVEMENT_LABELS, PROOF, PROOF_LABELS, WHERE, cellLayout, isAxis, robotBin, type AxisId, type ConditionId, type ProofLevel } from '@/lib/market/vocab';
import { MarketChoices } from './MarketChoices';
import { StepStrip } from '@/components/workflows/StepStrip';
import './market.css';

type Layout = 'needs' | 'similar';
type Filters = { robot: '' | RobotType; where: string; condition: string; cluster: string; query: string; withRobots: boolean };
export type ExplorerInitial = Partial<Filters> & { selected?: string; view?: string; layout?: string; x?: string; y?: string };

const ROBOT_TYPES: RobotType[] = ['humanoid', 'quadruped', 'mobile_manipulator', 'specialised'];
const EMPTY: Filters = { robot: '', where: '', condition: '', cluster: '', query: '', withRobots: false };
// Plot area inside the 1000 x 540 drawing.
const L = 168, R = 984, T = 44, B = 448;
// The similarity view has no axis labels and uses the whole drawing.
const SL = 40, SR = 960, ST = 40, SB = 500;
// Colour carries one thing on the map: how far robots have got with the job, strongest first in the key.
const KEY_LEVELS: ProofLevel[] = ['deployment', 'pilot', 'demo', 'claim', 'none'];

const clusterLabel = (point: JobMapPoint) => OPPORTUNITY_CLUSTERS.find((cluster) => cluster.id === point.clusterId)?.label ?? '';
const fold = (value: string) => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function MarketExplorer({ jobs, initialDetail = null, initial = {}, contact }: { jobs: JobMapPoint[]; initialDetail?: JobDetail | null; initial?: ExplorerInitial; contact?: string }) {
  const id = useId();
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, ...initial, robot: ROBOT_TYPES.includes(initial.robot as RobotType) ? initial.robot as RobotType : '' });
  const [view, setView] = useState<'map' | 'list'>(initial.view === 'list' ? 'list' : 'map');
  const [layout, setLayout] = useState<Layout>(initial.layout === 'similar' ? 'similar' : 'needs');
  const [xAxis, setXAxis] = useState<AxisId>(isAxis(initial.x) ? initial.x : 'movement');
  const [yAxis, setYAxis] = useState<AxisId>(isAxis(initial.y) && initial.y !== initial.x ? initial.y : 'handWork');
  const [selectedId, setSelectedId] = useState(initial.selected || initialDetail?.id || '');
  const [hoveredId, setHoveredId] = useState('');
  const [listLimit, setListLimit] = useState(16);
  const [details, setDetails] = useState<Record<string, JobDetail>>(initialDetail ? { [initialDetail.id]: initialDetail } : {});
  const [failed, setFailed] = useState('');
  const svg = useRef<SVGSVGElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const key: CountKey = filters.robot || 'all';
  // The map counts robots that have done the job, did similar work or fit outright.
  const strongOf = (point: JobMapPoint) => point.counts[key].strong;
  const anyOf = (point: JobMapPoint) => point.counts[key].any;
  const axisValue = (point: JobMapPoint, axis: AxisId): string => axis === 'movement' ? point.needs?.movement ?? 'stationary'
    : axis === 'handWork' ? point.needs?.handWork ?? 'none' : axis === 'robots' ? robotBin(strongOf(point)) : PROOF[point.counts[key].world];

  const query = fold(filters.query).split(/\s+/).filter(Boolean);
  const filtered = jobs.filter((point) => (!filters.where || point.where === filters.where) && (!filters.condition || point.conditions.includes(filters.condition as ConditionId)) && (!filters.cluster || point.clusterId === filters.cluster)
    && (!filters.withRobots || strongOf(point) > 0)
    && query.every((term) => fold([point.title, point.summary, point.setting].join(' ')).includes(term)));
  const withRobots = filtered.filter((point) => strongOf(point) > 0).length;
  const inUse = filtered.filter((point) => proofOf(point, key).world === 'deployment').length;
  const placed = cellLayout(filtered, xAxis, yAxis, axisValue);
  const sx = (point: JobMapPoint) => layout === 'needs' ? L + (placed.get(point.id)?.x ?? 50) / 100 * (R - L) : SL + point.x / 100 * (SR - SL);
  const sy = (point: JobMapPoint) => layout === 'needs' ? B - (placed.get(point.id)?.y ?? 50) / 100 * (B - T) : SB - point.y / 100 * (SB - ST);
  // Without a choice, open on proven construction work with robots you can buy here (see jobRank).
  const onSite = filtered.filter((point) => point.where === 'site' && strongOf(point) > 0);
  const selected = filtered.find((point) => point.id === selectedId) ?? [...(onSite.length ? onSite : filtered)].sort((a, b) => jobRank(b, key) - jobRank(a, key) || a.id.localeCompare(b.id))[0];
  const detail = selected ? details[selected.id] : undefined;
  const hovered = filtered.find((point) => point.id === hoveredId);
  const hasFilters = Boolean(filters.robot || filters.where || filters.condition || filters.cluster || filters.query || filters.withRobots);

  useEffect(() => {
    if (!selected || details[selected.id]) return;
    let live = true;
    setFailed('');
    fetch('/api/market/job?id=' + encodeURIComponent(selected.id))
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
      .then((loaded: JobDetail) => { if (live) setDetails((current) => ({ ...current, [loaded.id]: loaded })); })
      .catch(() => { if (live) setFailed(selected.id); });
    return () => { live = false; };
  }, [selected, details]);

  function writeURL(next: Filters, nextSelected = selected?.id ?? '', extra: Record<string, string> = {}) {
    const url = new URL(window.location.href);
    const values = { robot: next.robot, where: next.where, conditions: next.condition, work: next.cluster, search: next.query, robots: next.withRobots ? '1' : '', usecase: nextSelected, view, layout: layout === 'similar' ? 'similar' : '', x: xAxis === 'movement' ? '' : xAxis, y: yAxis === 'handWork' ? '' : yAxis, ...extra };
    for (const [name, value] of Object.entries(values)) value ? url.searchParams.set(name, value) : url.searchParams.delete(name);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  function change(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    setFilters(next); setHoveredId(''); setListLimit(16); writeURL(next);
  }
  function choose(point: JobMapPoint, scroll = false) {
    setSelectedId(point.id); setHoveredId(''); writeURL(filters, point.id);
    if (scroll) requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
  }
  function setAxes(x: AxisId, y: AxisId) {
    setXAxis(x); setYAxis(y); writeURL(filters, selected?.id, { x: x === 'movement' ? '' : x, y: y === 'handWork' ? '' : y });
  }
  function keyPoint(event: KeyboardEvent<SVGGElement>, point: JobMapPoint) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(point, true); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const ordered = [...filtered].sort((a, b) => sx(a) - sx(b) || sy(a) - sy(b));
    const index = ordered.findIndex((item) => item.id === point.id);
    const next = ordered[(index + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + ordered.length) % ordered.length];
    choose(next);
    Array.from(svg.current?.querySelectorAll<SVGGElement>('[data-job]') ?? []).find((element) => element.dataset.job === next.id)?.focus();
  }

  const xLevels = AXES[xAxis].levels, yLevels = AXES[yAxis].levels;
  const clouds = layout === 'similar' ? OPPORTUNITY_CLUSTERS.flatMap((cluster) => {
    const members = filtered.filter((point) => point.clusterId === cluster.id);
    if (!members.length) return [];
    const xs = members.map(sx), ys = members.map(sy);
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length, cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    return [{ cluster, cx, cy, rx: Math.max(46, Math.min(190, (Math.max(...xs) - Math.min(...xs)) / 2 + 24)), ry: Math.max(30, Math.min(120, (Math.max(...ys) - Math.min(...ys)) / 2 + 22)) }];
  }) : [];

  const level = (point: JobMapPoint) => proofOf(point, key);
  // An open ring: robots have done more of this job elsewhere than any robot sold here.
  const dotClass = (point: JobMapPoint) => { const { world, abroad } = level(point); return 'is-' + world + (abroad ? ' is-abroad' : ''); };
  const proofText = (point: JobMapPoint) => {
    const { world, here, abroad } = level(point);
    if (world === 'none') return PROOF_LABELS.none;
    return PROOF_LABELS[world] + (abroad ? (here === 'none' ? ', with robots not sold in Germany' : ', best proof from robots not sold here') : '');
  };

  return <section id="explore" className="mk-explorer" aria-label="Explore use cases">
    <header className="mk-head">
      <div>
        <h2>Find your job on the map</h2>
        <p>Every dot is a job. Its colour shows how far robots have got with it. Pick one to see the proof, the robots you can buy in Germany for it and who sells them.</p>
      </div>
      <div className="mk-segment" role="group" aria-label="Use-case view">
        <button type="button" aria-pressed={view === 'map'} onClick={() => { setView('map'); writeURL(filters, selected?.id, { view: 'map' }); }}>Map</button>
        <button type="button" aria-pressed={view === 'list'} onClick={() => { setView('list'); writeURL(filters, selected?.id, { view: 'list' }); }}>List</button>
      </div>
    </header>

    <div className="mk-card-shell">
      <div className="mk-map-top">
        <p><strong data-testid="job-count">{filtered.length}</strong> jobs · <strong>{inUse}</strong> in daily use · <strong>{withRobots}</strong> with a robot you can buy here that fits</p>
        {view === 'map' ? <div className="mk-layout" role="group" aria-label="Map layout">
          <button type="button" aria-pressed={layout === 'needs'} onClick={() => { setLayout('needs'); writeURL(filters, selected?.id, { layout: '' }); }}>By what the job needs</button>
          <button type="button" aria-pressed={layout === 'similar'} onClick={() => { setLayout('similar'); writeURL(filters, selected?.id, { layout: 'similar' }); }}>Similar jobs together</button>
        </div> : null}
      </div>
      {view === 'map' && layout === 'needs' ? <div className="mk-axes" role="group" aria-label="Map axes">
        <label><span>Across</span><select aria-label="Horizontal axis" value={xAxis} onChange={(event) => { const x = event.target.value as AxisId; setAxes(x, x === yAxis ? xAxis : yAxis); }}>{AXIS_IDS.map((axis) => <option key={axis} value={axis}>{AXES[axis].label}</option>)}</select></label>
        <label><span>Up</span><select aria-label="Vertical axis" value={yAxis} onChange={(event) => { const y = event.target.value as AxisId; setAxes(y === xAxis ? yAxis : xAxis, y); }}>{AXIS_IDS.map((axis) => <option key={axis} value={axis}>{AXES[axis].label}</option>)}</select></label>
      </div> : null}
      {view === 'map' ? <ul className="mk-proof-key" aria-label="Colour key">
        {KEY_LEVELS.map((item) => <li key={item}><span className={'mk-key-dot is-' + item} aria-hidden="true" />{PROOF_LABELS[item]}</li>)}
        <li><span className="mk-key-dot is-deployment is-abroad" aria-hidden="true" />Only with robots not sold here</li>
      </ul> : null}

      {view === 'map' ? <p className="mk-swipe">Swipe the chart sideways to see all of it.</p> : null}
      {view === 'map' ? <div className="mk-chart" data-testid="job-map">
        <svg ref={svg} viewBox="0 0 1000 540" role="group" aria-label={layout === 'needs' ? 'Jobs by ' + AXES[xAxis].label + ' and ' + AXES[yAxis].label : 'Jobs grouped by similarity'} aria-describedby={id + '-help'}>
          {layout === 'needs' ? <g className="mk-grid">
            {xLevels.map((level, index) => {
              const x0 = L + index / xLevels.length * (R - L), x1 = L + (index + 1) / xLevels.length * (R - L);
              return <g key={level.id}>
                {index ? <line x1={x0} x2={x0} y1={T} y2={B} /> : null}
                <text className="mk-tick" x={(x0 + x1) / 2} y={B + 26} textAnchor="middle">{level.label}</text>
              </g>;
            })}
            {yLevels.map((level, index) => {
              const y0 = B - index / yLevels.length * (B - T), y1 = B - (index + 1) / yLevels.length * (B - T);
              return <g key={level.id}>
                {index ? <line x1={L} x2={R} y1={y0} y2={y0} /> : null}
                <text className="mk-tick" x={L - 14} y={(y0 + y1) / 2 + 4} textAnchor="end">{level.label}</text>
              </g>;
            })}
            <rect x={L} y={T} width={R - L} height={B - T} fill="none" className="mk-frame" />
            <text className="mk-axis-title" x={(L + R) / 2} y={B + 60} textAnchor="middle">{AXES[xAxis].label} →</text>
            <text className="mk-axis-title" x={L} y={T - 16} textAnchor="start">↑ {AXES[yAxis].label}</text>
          </g> : <g className="mk-clouds" aria-hidden="true">
            {clouds.map(({ cluster, cx, cy, rx, ry }) => <ellipse key={cluster.id} cx={cx} cy={cy} rx={rx} ry={ry} className="mk-cloud" strokeDasharray="3 5" />)}
          </g>}
          {filtered.map((point) => {
            const count = strongOf(point);
            const isSelected = selected?.id === point.id;
            const proven = level(point).world !== 'none';
            return <g key={point.id} role="button" tabIndex={isSelected ? 0 : -1} aria-pressed={isSelected} aria-label={point.title + ', ' + proofText(point) + ', ' + count + ' robots you can buy fit'} data-job={point.id} data-robots={count} data-proof={level(point).world}
              className={'mk-dot ' + dotClass(point) + (isSelected ? ' is-selected' : '')} transform={'translate(' + sx(point).toFixed(1) + ',' + sy(point).toFixed(1) + ')'}
              onClick={() => choose(point, true)} onMouseEnter={() => setHoveredId(point.id)} onMouseLeave={() => setHoveredId('')} onFocus={() => setHoveredId(point.id)} onBlur={() => setHoveredId('')} onKeyDown={(event) => keyPoint(event, point)}>
              <circle className="mk-hit" r="9" />
              {isSelected ? <circle className="mk-ring" r="11" /> : null}
              <circle className="mk-fill" r={proven ? 5.5 : 3.6} />
            </g>;
          })}
          {/* Cluster names go on top of the dots so they stay readable where clouds meet. */}
          {clouds.length ? <g className="mk-clouds" aria-hidden="true">{clouds.map(({ cluster, cx, cy, ry }) => <text key={cluster.id} x={cx} y={Math.max(16, cy - ry - 8)} textAnchor="middle">{cluster.label}</text>)}</g> : null}
          {!filtered.length ? <text x="500" y="250" textAnchor="middle" className="mk-empty-text">No jobs match these filters</text> : null}
        </svg>
        {hovered ? <div role="tooltip" className="mk-tooltip" style={{ left: Math.min(78, Math.max(14, sx(hovered) / 10)) + '%', top: Math.max(2, sy(hovered) / 5.4 - 16) + '%' }}>
          <span className="mk-tooltip-proof"><i className={'mk-key-dot ' + dotClass(hovered)} aria-hidden="true" />{proofText(hovered)}</span>
          <strong>{hovered.title}</strong>
          <small>{strongOf(hovered) ? strongOf(hovered) + ' robots you can buy in Germany fit' : anyOf(hovered) ? anyOf(hovered) + ' robots could, with add-ons or a trial' : 'No robot you can buy yet'}</small>
        </div> : null}
        <p id={id + '-help'} className="mk-help">{layout === 'needs' ? 'Positions show what the job needs, as we read the task. Confirm them for your site.' : 'Close dots describe similar work. Distances have no unit.'}</p>
      </div> : <ol className="mk-list" data-testid="job-list">
        {/* Proven work first, as on the landing's answer; the number of robots that fit on paper breaks ties. */}
        {[...filtered].sort((a, b) => jobRank(b, key) - jobRank(a, key) || a.title.localeCompare(b.title)).slice(0, listLimit).map((point) => <li key={point.id}>
          <button type="button" aria-pressed={selected?.id === point.id} onClick={() => choose(point, true)}>
            <span className={'mk-key-dot ' + dotClass(point)} aria-hidden="true" />
            <span className="mk-list-title"><strong>{point.title}</strong><small>{point.setting}</small></span>
            <span className="mk-list-count"><b>{proofText(point)}</b>{strongOf(point) ? strongOf(point) + ' robots fit' : anyOf(point) ? anyOf(point) + ' with add-ons' : 'No robot fits yet'}</span>
          </button>
        </li>)}
        {filtered.length > listLimit ? <li><button type="button" className="mk-more" onClick={() => setListLimit(listLimit + 32)}>Show {Math.min(32, filtered.length - listLimit)} more of {filtered.length - listLimit}</button></li> : null}
      </ol>}

      <div className="mk-filters" role="group" aria-label="Filter the jobs">
        <div className="mk-chips" role="group" aria-label="Robot type">
          <button type="button" aria-pressed={!filters.robot} onClick={() => change({ robot: '' })}>All robots</button>
          {ROBOT_TYPES.map((robot) => <button type="button" key={robot} aria-pressed={filters.robot === robot} onClick={() => change({ robot })}>{TYPE_PLURAL[robot]}</button>)}
        </div>
        <div className="mk-selects">
          <label><span>Where</span><select value={filters.where} onChange={(event) => change({ where: event.target.value })}><option value="">Everywhere</option>{WHERE.map((place) => <option key={place.id} value={place.id}>{place.label}</option>)}</select></label>
          <label><span>Conditions</span><select value={filters.condition} onChange={(event) => change({ condition: event.target.value })}><option value="">Any conditions</option>{CONDITIONS.map((condition) => <option key={condition.id} value={condition.id}>{condition.label}</option>)}</select></label>
          <label><span>Kind of work</span><select value={filters.cluster} onChange={(event) => change({ cluster: event.target.value })}><option value="">All work</option>{OPPORTUNITY_CLUSTERS.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.label}</option>)}</select></label>
          <label className="mk-search"><span>Search</span><input type="search" placeholder="Drywall, inspection, tiles…" value={filters.query} onChange={(event) => change({ query: event.target.value })} /></label>
          <label className="mk-toggle"><input type="checkbox" checked={filters.withRobots} onChange={(event) => change({ withRobots: event.target.checked })} /><span>Only jobs with robots</span></label>
        </div>
        <div className="mk-legend" role="group" aria-label="Kinds of work">
          {OPPORTUNITY_CLUSTERS.filter((cluster) => jobs.some((point) => point.clusterId === cluster.id)).map((cluster) => <button type="button" key={cluster.id} aria-pressed={filters.cluster === cluster.id} onClick={() => change({ cluster: filters.cluster === cluster.id ? '' : cluster.id })}>
            {cluster.label}
          </button>)}
          {hasFilters ? <button type="button" className="mk-reset" onClick={() => change(EMPTY)}>Reset filters</button> : null}
        </div>
      </div>
    </div>

    {selected ? <div ref={panel} className="mk-job" data-testid="selected-job" tabIndex={-1} aria-label="Selected job">
      <div className="mk-job-head">
        <span className="mk-job-icon"><Icon name={selected.family} size={22} /></span>
        <div>
          <p className="mk-kicker">{WHERE.find((place) => place.id === selected.where)?.label} · {selected.setting} · {clusterLabel(selected)}</p>
          <h2>{selected.title}</h2>
          <p className="mk-job-proof" data-testid="job-proof"><span className={'mk-key-dot ' + dotClass(selected)} aria-hidden="true" />{proofText(selected)}</p>
          <p>{selected.summary}</p>
          {selected.needs ? <ul className="mk-needs" aria-label="What this job needs">
            <li>{MOVEMENT_LABELS[selected.needs.movement]}</li>
            <li>{HAND_LABELS[selected.needs.handWork]}</li>
            {selected.needs.maxObjectKg ? <li>Up to {selected.needs.maxObjectKg.toLocaleString('en-GB')} kg</li> : null}
            {selected.outdoor ? <li>Outdoors</li> : null}
            {selected.needs.tool ? <li>{selected.needs.tool}</li> : null}
          </ul> : null}
        </div>
        {selected.href.startsWith('/use-cases/') && !selected.href.includes('custom') ? <div className="mk-job-links">
          <Link className="mk-job-link" href={selected.href + '#check'}>Check it for your site <Icon name="arrow" size={15} /></Link>
        </div> : null}
      </div>
      {detail?.workflow ? <StepStrip data={detail.workflow} href={selected.href} /> : null}
      {detail ? <MarketChoices key={selected.id} job={detail} type={filters.robot} contact={contact} />
        : failed === selected.id ? <p className="mk-empty">The robots for this job did not load. <button type="button" onClick={() => setDetails((current) => ({ ...current }))}>Try again</button></p>
        : <div className="mk-loading" aria-busy="true"><span /><span /><span /></div>}
    </div> : <p className="mk-empty">No job matches these filters. <button type="button" onClick={() => change(EMPTY)}>Show all jobs</button></p>}
  </section>;
}
