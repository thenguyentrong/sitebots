import Link from '@/components/LocaleLink';
import { ManufacturerMap } from '@/components/ManufacturerMap';
import { MarketListing } from '@/components/market/MarketListing';
import { allCompanies } from '@/lib/market/company-list';
import { RobotSearch, ScopeSwitch } from '@/components/market/RobotsToolbar';
import { TileSection } from '@/components/market/TileSection';
import { FOCUSED_FORM_FACTORS, isFocusedForm } from '@/lib/browse-scope';
import { LOCALE } from '@/lib/i18n/config';
import { formatNumber, regionName } from '@/lib/i18n/format';
import { LISTING_TEXT } from '@/lib/i18n/listing';
import { pageLang } from '@/lib/i18n/server';
import { typePlural } from '@/lib/market/cards';
import { readFilters, type FilterParams } from '@/lib/market/filters';
import { ROBOT_TYPES, type RobotType } from '@/lib/market/schema';
import { catalogueIdsWithMarketPictures, worldTiles } from '@/lib/market/tiles';
import { listRobotCards } from '@/lib/queries/robots';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';
import '@/components/market/market.css';

export const dynamic = 'force-dynamic';
// With all types on one page, each type shows its first rows; its own tab shows the rest.
const PREVIEW = 9;
type Params = { scope?: string; type?: string; form?: string; q?: string; all?: string; pictures?: string; view?: string } & FilterParams;
type Search = Promise<Params>;
type RouteParams = Promise<{ lang: string }>;

// One robots page with two views. Old catalogue links (view, form, all, pictures) still open the worldwide view.
const isWorld = (sp: Params) => sp.scope === 'world' || (sp.scope !== 'de' && Boolean(sp.view || sp.form || sp.all || sp.pictures));

export async function generateMetadata({ params, searchParams }: { params: RouteParams; searchParams: Search }) {
  const lang = await pageLang(params);
  const t = LISTING_TEXT[lang];
  return isWorld(await searchParams)
    ? publicMetadata({ title: t.worldTitle, description: t.worldDescription, path: '/robots?scope=world', lang })
    : publicMetadata({ title: t.germanyTitle, description: t.germanyDescription, path: '/robots', lang });
}

export default async function RobotsPage({ params, searchParams }: { params: RouteParams; searchParams: Search }) {
  const lang = await pageLang(params);
  const t = LISTING_TEXT[lang];
  const num = (n: number) => formatNumber(n, lang);
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  if (!isWorld(sp)) return <MarketListing type={(ROBOT_TYPES as readonly string[]).includes(String(sp.type)) ? sp.type as RobotType : ''} q={q} filters={readFilters(sp)} lang={lang} />;

  const showAllPictures = sp.pictures === 'all';
  const formFactor = isFocusedForm(sp.form) ? sp.form as (typeof FOCUSED_FORM_FACTORS)[number] : undefined;
  const preview = !formFactor && !q;
  // Apply the scope in SQL before counting, including hidden-picture counts.
  // German market pictures count as pictures too.
  const withPictureIds = showAllPictures ? undefined : await catalogueIdsWithMarketPictures();
  const { robots, total, hidden } = await listRobotCards({ formFactor, formFactors: FOCUSED_FORM_FACTORS, q, limit: 5000, pictures: showAllPictures ? 'all' : 'with', withPictureIds });
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
  const tiles = new Map((await worldTiles(groups.flatMap((group) => group.visible), lang)).map((tile) => [tile.id, tile]));
  // Which country has how many robot companies: catalogue makers and the construction-machine makers of the guide.
  const companies = await allCompanies();
  const perCountry = new Map<string, number>();
  for (const company of companies) if (company.country) perCountry.set(company.country, (perCountry.get(company.country) ?? 0) + 1);
  const countries = [...perCountry].map(([code, count]) => ({ code, count, name: regionName(code, lang), href: '/brands?country=' + code + '#manufacturers' })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, LOCALE[lang]));

  return <main className="mk-page">
    <header className="mk-page-head">
      <ScopeSwitch world q={q} lang={lang} />
      <h1>{t.worldTitle}</h1>
      <p>{t.worldLead}</p>
    </header>

    <div className="mt-6">
      <ManufacturerMap countries={countries} selected="" unknown={companies.filter((company) => !company.country).length}
        title={t.mapTitle} lead={t.mapLead(num(companies.length), countries.length, num(countries.length))} />
    </div>

    <div className="card mt-6 flex flex-wrap items-center gap-3 p-2">
      <nav className={cn(ui.segment, 'max-w-full flex-wrap')} aria-label={t.typeNav}>
        <Link href={href({ form: undefined })} className={cn(ui.segmentItem, !formFactor && ui.segmentActive)} aria-current={!formFactor ? 'page' : undefined}>{t.all}</Link>
        {FOCUSED_FORM_FACTORS.map((type) => <Link key={type} href={href({ form: type })} className={cn(ui.segmentItem, formFactor === type && ui.segmentActive)} aria-current={formFactor === type ? 'page' : undefined}>{typePlural(type, lang)}</Link>)}
      </nav>
      <RobotSearch q={q} keep={{ scope: 'world', pictures: showAllPictures ? 'all' : undefined, form: formFactor }} lang={lang} />
    </div>

    <p className="label mt-6 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span data-testid="catalogue-count">{t.configurations(total, num(total))}{q ? t.configurationsMatching(q) : ''}{t.bestFirst}</span>
      {showAllPictures ? <Link href={href({ pictures: undefined })} className="normal-case tracking-normal text-faint underline-offset-2 hover:text-foreground hover:underline">{t.hidePictureless}</Link> : hidden > 0 ? <Link href={href({ pictures: 'all' })} className="normal-case tracking-normal text-faint underline-offset-2 hover:text-foreground hover:underline">{t.showPictureless(num(hidden))}</Link> : null}
    </p>

    {robots.length === 0 ? <div className="card mt-6 px-6 py-10 text-center text-muted" data-testid="catalogue-empty">
      <p>{t.catalogueEmpty}</p>
      <Link href={href({ q: undefined, form: undefined, pictures: 'all' })} className={ui.btnSecondary + ' mt-5 whitespace-normal'}>{t.clearFilters}</Link>
    </div> : <div data-testid="catalogue-list">
      {groups.map(({ form, items, visible }) => <TileSection key={form} id={'world-' + form} title={typePlural(form, lang)} count={num(items.length)} intro={t.worldIntro[form]}
        tiles={visible.flatMap((robot) => tiles.get(robot.id) ?? [])}
        more={preview && items.length > PREVIEW ? { href: href({ form }), label: t.showAll(form, num(items.length)) } : null} />)}
    </div>}
  </main>;
}
