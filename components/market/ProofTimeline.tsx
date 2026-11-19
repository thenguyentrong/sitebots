import type { Lang } from '@/lib/i18n/config';
import { GERMANY_TEXT } from '@/lib/i18n/robot';
import type { EvidenceStage } from '@/lib/market/schema';
import { stageLabel } from '@/lib/market/vocab';

// A robot's proof over time: one dot per dated entry, in its proof colour, stacked where entries
// meet, so a reader sees at a glance whether a robot moved from claims to sites and when.

type Item = { stage: EvidenceStage; date: string | null; task: string; where: string | null };
const ORDER: EvidenceStage[] = ['deployment', 'pilot', 'demo', 'claim'];
/** A date as a year with a fraction: a month sits in its middle, a bare year in the middle of the year. */
const when = (date: string) => Number(date.slice(0, 4)) + (date.length >= 7 ? (Number(date.slice(5, 7)) - 0.5) / 12 : 0.5);

export function ProofTimeline({ items, lang = 'en' }: { items: Item[]; lang?: Lang }) {
  const t = GERMANY_TEXT[lang];
  const dated = items.filter((item) => item.date).map((item) => ({ ...item, t: when(item.date!) })).sort((a, b) => a.t - b.t);
  if (dated.length < 2) return null;
  const to = Math.ceil(dated.at(-1)!.t), from = Math.min(Math.floor(dated[0].t), to - 3);
  const W = 640, L = 12, R = 12, ROW = 16, DOT = 6;
  const x = (time: number) => L + (time - from) / (to - from) * (W - L - R);
  const placed: { cx: number; level: number; item: (typeof dated)[number] }[] = [];
  for (const item of dated) {
    const cx = x(item.t);
    let level = 0;
    while (placed.some((other) => other.level === level && Math.abs(other.cx - cx) < DOT * 2 + 2)) level++;
    placed.push({ cx, level, item });
  }
  const base = 14 + (Math.max(...placed.map((dot) => dot.level)) + 1) * ROW;
  const step = to - from > 8 ? 2 : 1;
  const years = Array.from({ length: to - from }, (_, index) => from + index).filter((year) => (year - from) % step === 0);
  const stages = ORDER.filter((stage) => dated.some((item) => item.stage === stage));
  const undated = items.length - dated.length;
  return <figure className="mk-timeline">
    <svg viewBox={`0 0 ${W} ${base + 30}`} role="img" aria-label={t.timeline(String(dated[0].date?.slice(0, 4)), String(dated.at(-1)!.date?.slice(0, 4))) + stages.map((stage) => t.timelineCount(dated.filter((item) => item.stage === stage).length, stageLabel(stage, lang))).join(', ')}>
      <line className="mk-timeline-axis" x1={L} x2={W - R} y1={base + 4} y2={base + 4} />
      {Array.from({ length: to - from + 1 }, (_, index) => <line key={index} className="mk-timeline-tick" x1={x(from + index)} x2={x(from + index)} y1={base} y2={base + 8} />)}
      {years.map((year) => <text key={year} className="mk-timeline-year" x={x(year + 0.5)} y={base + 24} textAnchor="middle">{year}</text>)}
      {/* The task and place in the tooltip are the record's words. */}
      {placed.map(({ cx, level, item }, index) => <circle key={index} className={'mk-timeline-dot is-' + item.stage} cx={cx} cy={base - 8 - level * ROW} r={DOT}>
        <title>{`${item.date} · ${stageLabel(item.stage, lang)} · ${item.task}${item.where ? ' · ' + item.where : ''}`}</title>
      </circle>)}
    </svg>
    <figcaption>{stages.map((stage) => <span key={stage}><i className={'mk-key-dot is-' + stage} aria-hidden="true" />{stageLabel(stage, lang)}</span>)}{undated ? <span>{t.undated(undated)}</span> : null}</figcaption>
  </figure>;
}
