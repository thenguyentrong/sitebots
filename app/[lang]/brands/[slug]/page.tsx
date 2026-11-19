import type { Metadata } from 'next';
import Link from '@/components/LocaleLink';
import { notFound, permanentRedirect } from 'next/navigation';
import { canonicalManufacturerSlug, isPublicManufacturer, manufacturerStatusLabel } from '@/lib/manufacturers';
import { CompanyInsights } from '@/components/company/CompanyInsights';
import { MakerAvatar } from '@/components/MakerAvatar';
import { RobotTile } from '@/components/market/RobotTile';
import { Badge } from '@/components/ui/badge';
import { BRANDS_TEXT } from '@/lib/i18n/brands';
import { localePath, recordLang } from '@/lib/i18n/config';
import { formatDate, formatNumber } from '@/lib/i18n/format';
import { pageLang } from '@/lib/i18n/server';
import { marketCompany } from '@/lib/market/companies';
import { worldTiles } from '@/lib/market/tiles';
import { countryName } from '@/lib/market/use-cases';
import { getManufacturer } from '@/lib/queries/manufacturers';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import '@/components/market/market.css';

export const dynamic = 'force-dynamic';

type Params = Promise<{ lang: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = await pageLang(params);
  const t = BRANDS_TEXT[lang];
  const { slug } = await params;
  const data = await getManufacturer(slug);
  const market = marketCompany(slug);
  if (!data && !market) return {};
  const name = data?.manufacturer.name ?? market!.name;
  const count = (data?.manufacturer.robots ?? 0) + (data ? 0 : market!.robots.length);
  return { ...publicMetadata({
    title: t.pageTitle(name),
    description: t.pageDescription(name, count, formatNumber(count, lang)),
    path: `/brands/${canonicalManufacturerSlug(slug)}`,
    lang,
  }), ...(data && !isPublicManufacturer(slug) ? { robots: { index: false, follow: false } } : {}) };
}

const ExternalIcon = () => <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17 17 7M8 7h9v9" /></svg>;

export default async function BrandPage({ params }: { params: Params }) {
  const lang = await pageLang(params);
  const t = BRANDS_TEXT[lang];
  const num = (n: number) => formatNumber(n, lang);
  const { slug } = await params;
  const canonical = canonicalManufacturerSlug(slug);
  if (canonical !== slug) permanentRedirect(localePath(`/brands/${canonical}`, lang));
  const [data, market] = [await getManufacturer(slug), marketCompany(slug)];
  if (!data && !market) notFound();
  const m = data?.manufacturer ?? null;
  const tiles = data ? await worldTiles(data.robots, lang) : [];
  const name = m?.name ?? market!.name;
  const country = m?.country ?? market?.country ?? null;
  const logo = m?.logo ?? market?.logo ?? null;
  const website = m?.website_url ?? market?.robots.find((robot) => robot.officialUrl)?.officialUrl ?? null;
  const marketRobots = market?.robots ?? [];
  let host: string | null = null;
  try { host = website ? new URL(website).hostname.replace(/^www\./, '') : null; } catch { host = null; }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <nav className="flex items-center gap-2 pt-6 text-xs text-faint" aria-label={t.breadcrumb}>
        <Link href="/robots" className="transition hover:text-foreground">{t.robots}</Link>
        <span aria-hidden>/</span>
        <Link href="/brands" className="transition hover:text-foreground">{t.companiesCrumb}</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{name}</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-6 py-6">
        <div className="flex items-start gap-4">
          <MakerAvatar name={name} logo={logo} className="h-16 w-28 rounded-2xl text-lg" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{country ? countryName(country === 'UK' ? 'GB' : country, lang) : t.noCountry}</Badge>
              {m ? <Badge variant="neutral">{t.modelsVariants(m.models, num(m.models), m.robots, num(m.robots))}</Badge> : null}
              {marketRobots.length ? <Badge variant="neutral">{t.inGuide(num(marketRobots.length))}</Badge> : null}
              {m && m.verified_values > 0 ? <Badge variant="success">{t.verifiedValues(m.verified_values, num(m.verified_values))}</Badge> : null}
            </div>
          </div>
        </div>
        {website && host ? <a href={website} rel="nofollow noopener" target="_blank" className={ui.btnSecondary}>{host}<ExternalIcon /></a> : null}
      </header>

      {m ? <section className="card mb-6 p-5" aria-label={t.statusSection}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={m.review?.status === 'commercial' ? 'success' : 'neutral'}>{manufacturerStatusLabel(m.review?.status ?? 'unverified', lang)}</Badge>
          {m.review ? <span className="text-xs text-faint">{t.reviewed(formatDate(m.review.reviewedAt, lang))}</span> : null}
        </div>
        {/* The review's reason is our research note, kept as written; only the fallback is ours to translate. */}
        {m.review?.reason ? <p className="mt-3 max-w-3xl text-sm text-muted" lang={recordLang(lang)}>{m.review.reason}</p> : <p className="mt-3 max-w-3xl text-sm text-muted">{t.notReviewed}</p>}
        {!isPublicManufacturer(m.slug) ? <p className="mt-2 text-sm font-medium">{t.referenceOnly}</p> : null}
        {m.review?.evidence.length ? <div className="mt-3 flex flex-wrap gap-4 text-xs">{m.review.evidence.map((e, i) => <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{e.kind === 'official' ? t.officialSource : t.reviewSource}{m.review!.evidence.length > 1 ? ` ${i + 1}` : ''} ↗</a>)}</div> : null}
      </section> : null}

      <CompanyInsights slug={canonical} name={name} description={m?.description ?? null} robots={marketRobots} showAllRobots={!m} lang={lang} />

      {tiles.length ? <section className="mt-8" aria-labelledby="catalogue-robots">
        <h2 id="catalogue-robots" className="mb-3 text-sm font-semibold">{t.catalogueRobots(name)}</h2>
        <div className="mk-grid" data-testid="maker-robots">{tiles.map((tile) => <RobotTile key={tile.id} tile={tile} />)}</div>
      </section> : null}
    </main>
  );
}
