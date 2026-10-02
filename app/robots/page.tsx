import Link from 'next/link';
import { MarketListing } from '@/components/market/MarketListing';
import { RobotSearch, ScopeSwitch } from '@/components/market/RobotsToolbar';
import { TileSection } from '@/components/market/TileSection';
import { FOCUSED_FORM_FACTORS, isFocusedForm } from '@/lib/browse-scope';
import { ROBOT_TYPES, type RobotType } from '@/lib/market/schema';
import { worldTiles } from '@/lib/market/tiles';
import { listRobotCards } from '@/lib/queries/robots';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';
import '@/components/market/market.css';

export const dynamic = 'force-dynamic';
// With all types on one page, each type shows its first rows; its own tab shows the rest.
const PREVIEW = 9;
const TYPE_LABELS = { humanoid: 'Humanoids', quadruped: 'Robot dogs', mobile_manipulator: 'Mobile manipulators' };
const INTRO = {
  humanoid: 'Two arms and a head, on legs or on a wheeled base.',
  quadruped: 'Four legs, some with wheels or an arm.',
  mobile_manipulator: 'One or two arms on a wheeled base.',
};
type Params = { scope?: string; type?: string; form?: string; q?: string; all?: string; pictures?: string; view?: string };
type Search = Promise<Params>;

// One robots page with two views. Old catalogue links (view, form, all, pictures) still open the worldwide view.
const isWorld = (sp: Params) => sp.scope === 'world' || (sp.scope !== 'de' && Boolean(sp.view || sp.form || sp.all || sp.pictures));

export async function generateMetadata({ searchParams }: { searchParams: Search }) {
  return isWorld(await searchParams)
    ? publicMetadata({ title: 'All robots worldwide', description: 'Every humanoid, robot dog and mobile manipulator we track, prototypes included, with pictures, 3D models and sourced specifications.', path: '/robots?scope=world' })
    : publicMetadata({ title: 'Robots you can buy in Germany', description: 'Humanoids, robot dogs, mobile manipulators and job-specific construction robots, with their German sellers, prices where published, and the jobs they fit.', path: '/robots' });
}

export default async function RobotsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  if (!isWorld(sp)) return <MarketListing type={(ROBOT_TYPES as readonly string[]).includes(String(sp.type)) ? sp.type as RobotType : ''} q={q} />;

  const showAllPictures = sp.pictures === 'all';
  const formFactor = isFocusedForm(sp.form) ? sp.form as (typeof FOCUSED_FORM_FACTORS)[number] : undefined;
  const preview = !formFactor && !q;
  // Apply the scope in SQL before counting, including hidden-picture counts.
  const { robots, total, hidden } = await listRobotCards({ formFactor, formFactors: FOCUSED_FORM_FACTORS, q, limit: 5000, pictures: showAllPictures ? 'all' : 'with' });
  const href = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams({ scope: 'world' });
    const merged: Record<string, string | undefined> = { form: formFactor, q, pictures: showAllPictures ? 'all' : undefined, ...params };
    for (const [key, value] of Object.entries(merged)) if (value) query.set(key, value);
    return '/robots?' + query.toString();
  };
  const groups = (formFactor ? [formFactor] : FOCUSED_FORM_FACTORS).map((form) => {
    const items = robots.filter((robot) => robot.form_factor === form);
    return { form, items, visible: preview ? items.slice(0, PREVIEW) : items };
  }).filter((group) => group.items.length);
  const tiles = new Map((await worldTiles(groups.flatMap((group) => group.visible))).map((tile) => [tile.id, tile]));

  return <main className="mk-page">
    <header className="mk-page-head">
      <ScopeSwitch world q={q} />
      <h1>All robots worldwide</h1>
      <p>Every humanoid, robot dog and mobile manipulator we track, including prototypes and robots that are not sold in Germany. Choose robots to compare their specifications.</p>
    </header>

    <div className="card mt-6 flex flex-wrap items-center gap-3 p-2">
      <nav className={cn(ui.segment, 'max-w-full flex-wrap')} aria-label="Robot type">
        <Link href={href({ form: undefined })} className={cn(ui.segmentItem, !formFactor && ui.segmentActive)} aria-current={!formFactor ? 'page' : undefined}>All</Link>
        {FOCUSED_FORM_FACTORS.map((type) => <Link key={type} href={href({ form: type })} className={cn(ui.segmentItem, formFactor === type && ui.segmentActive)} aria-current={formFactor === type ? 'page' : undefined}>{TYPE_LABELS[type]}</Link>)}
      </nav>
      <RobotSearch q={q} keep={{ scope: 'world', pictures: showAllPictures ? 'all' : undefined, form: formFactor }} />
    </div>

    <p className="label mt-6 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span data-testid="catalogue-count">{total} configuration{total === 1 ? '' : 's'}{q ? ' matching “' + q + '”' : ''}, best documented first</span>
      {showAllPictures ? <Link href={href({ pictures: undefined })} className="normal-case tracking-normal text-faint underline-offset-2 hover:text-foreground hover:underline">Hide robots without a picture</Link> : hidden > 0 ? <Link href={href({ pictures: 'all' })} className="normal-case tracking-normal text-faint underline-offset-2 hover:text-foreground hover:underline">Show {hidden.toLocaleString('en-GB')} more without a picture</Link> : null}
    </p>

    {robots.length === 0 ? <div className="card mt-6 px-6 py-10 text-center text-muted" data-testid="catalogue-empty">
      <p>No robots match this selection.</p>
      <Link href={href({ q: undefined, form: undefined, pictures: 'all' })} className={ui.btnSecondary + ' mt-5 whitespace-normal'}>Clear filters</Link>
    </div> : <div data-testid="catalogue-list">
      {groups.map(({ form, items, visible }) => <TileSection key={form} id={'world-' + form} title={TYPE_LABELS[form]} count={items.length} intro={INTRO[form]}
        tiles={visible.flatMap((robot) => tiles.get(robot.id) ?? [])}
        more={preview && items.length > PREVIEW ? { href: href({ form }), label: 'Show all ' + items.length + ' ' + TYPE_LABELS[form].toLowerCase() } : null} />)}
    </div>}
  </main>;
}
