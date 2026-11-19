import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { canonicalManufacturerSlug, isPublicManufacturer, manufacturerStatusLabels } from '@/lib/manufacturers';
import { CompanyInsights } from '@/components/company/CompanyInsights';
import { MakerAvatar } from '@/components/MakerAvatar';
import { RobotTile } from '@/components/market/RobotTile';
import { Badge } from '@/components/ui/badge';
import { marketCompany } from '@/lib/market/companies';
import { worldTiles } from '@/lib/market/tiles';
import { countryName } from '@/lib/market/use-cases';
import { getManufacturer } from '@/lib/queries/manufacturers';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import '@/components/market/market.css';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getManufacturer(slug);
  const market = marketCompany(slug);
  if (!data && !market) return {};
  const name = data?.manufacturer.name ?? market!.name;
  const count = (data?.manufacturer.robots ?? 0) + (data ? 0 : market!.robots.length);
  return { ...publicMetadata({
    title: `${name}: robots, strengths and reviews`,
    description: `${name}: ${count} robot${count === 1 ? '' : 's'}, where they work, what can be bought in Germany, strengths, weak points and reviews.`,
    path: `/brands/${canonicalManufacturerSlug(slug)}`,
  }), ...(data && !isPublicManufacturer(slug) ? { robots: { index: false, follow: false } } : {}) };
}

const ExternalIcon = () => <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17 17 7M8 7h9v9" /></svg>;

export default async function BrandPage({ params }: { params: Params }) {
  const { slug } = await params;
  const canonical = canonicalManufacturerSlug(slug);
  if (canonical !== slug) permanentRedirect(`/brands/${canonical}`);
  const [data, market] = [await getManufacturer(slug), marketCompany(slug)];
  if (!data && !market) notFound();
  const m = data?.manufacturer ?? null;
  const tiles = data ? await worldTiles(data.robots) : [];
  const name = m?.name ?? market!.name;
  const country = m?.country ?? market?.country ?? null;
  const logo = m?.logo ?? market?.logo ?? null;
  const website = m?.website_url ?? market?.robots.find((robot) => robot.officialUrl)?.officialUrl ?? null;
  const marketRobots = market?.robots ?? [];
  let host: string | null = null;
  try { host = website ? new URL(website).hostname.replace(/^www\./, '') : null; } catch { host = null; }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <nav className="flex items-center gap-2 pt-6 text-xs text-faint" aria-label="Breadcrumb">
        <Link href="/robots" className="transition hover:text-foreground">Robots</Link>
        <span aria-hidden>/</span>
        <Link href="/brands" className="transition hover:text-foreground">Companies</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{name}</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-6 py-6">
        <div className="flex items-start gap-4">
          <MakerAvatar name={name} logo={logo} className="h-16 w-28 rounded-2xl text-lg" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{country ? countryName(country === 'UK' ? 'GB' : country) : 'Country not recorded'}</Badge>
              {m ? <Badge variant="neutral">{m.models} model{m.models === 1 ? '' : 's'} · {m.robots} variant{m.robots === 1 ? '' : 's'}</Badge> : null}
              {marketRobots.length ? <Badge variant="neutral">{marketRobots.length} in our buying guide</Badge> : null}
              {m && m.verified_values > 0 ? <Badge variant="success">{m.verified_values} values verified</Badge> : null}
            </div>
          </div>
        </div>
        {website && host ? <a href={website} rel="nofollow noopener" target="_blank" className={ui.btnSecondary}>{host}<ExternalIcon /></a> : null}
      </header>

      {m ? <section className="card mb-6 p-5" aria-label="Commercial status">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={m.review?.status === 'commercial' ? 'success' : 'neutral'}>{manufacturerStatusLabels[m.review?.status ?? 'unverified']}</Badge>
          {m.review ? <span className="text-xs text-faint">Reviewed {m.review.reviewedAt}</span> : null}
        </div>
        <p className="mt-3 max-w-3xl text-sm text-muted">{m.review?.reason ?? 'Commercial status has not been verified. This record is kept for reference.'}</p>
        {!isPublicManufacturer(m.slug) ? <p className="mt-2 text-sm font-medium">Reference only · Hidden from the supplier catalogue and robot matcher.</p> : null}
        {m.review?.evidence.length ? <div className="mt-3 flex flex-wrap gap-4 text-xs">{m.review.evidence.map((e, i) => <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{e.kind === 'official' ? 'Official source' : 'Review source'}{m.review!.evidence.length > 1 ? ` ${i + 1}` : ''} ↗</a>)}</div> : null}
      </section> : null}

      <CompanyInsights slug={canonical} name={name} description={m?.description ?? null} robots={marketRobots} showAllRobots={!m} />

      {tiles.length ? <section className="mt-8" aria-labelledby="catalogue-robots">
        <h2 id="catalogue-robots" className="mb-3 text-sm font-semibold">All {name} robots in the catalogue</h2>
        <div className="mk-grid" data-testid="maker-robots">{tiles.map((tile) => <RobotTile key={tile.id} tile={tile} />)}</div>
      </section> : null}
    </main>
  );
}
