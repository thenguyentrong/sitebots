import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompareToggle } from '@/components/compare/CompareBar';
import { MakerAvatar } from '@/components/MakerAvatar';
import { RobotCard } from '@/components/robot/RobotCard';
import { Badge } from '@/components/ui/badge';
import { getManufacturer } from '@/lib/queries/manufacturers';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getManufacturer(slug);
  if (!data) return {};
  const m = data.manufacturer;
  return publicMetadata({
    title: `${m.name} robots`,
    description: `${m.robots} ${m.name} robot${m.robots === 1 ? '' : 's'} with sourced specifications, prices by region and delivery status.`,
    path: `/brands/${slug}`,
  });
}

export default async function BrandPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getManufacturer(slug);
  if (!data) notFound();
  const { manufacturer: m, robots } = data;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <nav className="flex items-center gap-2 pt-6 text-xs text-faint" aria-label="Breadcrumb">
        <Link href="/brands" className="transition hover:text-foreground">
          Manufacturers
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{m.name}</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-6 py-6">
        <div className="flex items-start gap-4">
          <MakerAvatar name={m.name} className="h-14 w-14 rounded-2xl text-lg" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{m.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{m.country ?? 'Country not recorded'}</Badge>
              <Badge variant="neutral">
                {m.models} model{m.models === 1 ? '' : 's'} · {m.robots} variant{m.robots === 1 ? '' : 's'}
              </Badge>
              {m.verified_values > 0 ? <Badge variant="success">{m.verified_values} values verified</Badge> : null}
            </div>
            {m.description ? <p className="mt-4 max-w-2xl text-muted">{m.description}</p> : null}
          </div>
        </div>
        {m.website_url ? (
          <a href={m.website_url} rel="nofollow noopener" target="_blank" className={ui.btnSecondary}>
            {new URL(m.website_url).hostname.replace(/^www\./, '')}
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </a>
        ) : null}
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {robots.map((r) => (
          <RobotCard key={r.id} robot={r} action={<CompareToggle id={r.id} name={r.name} />} />
        ))}
      </div>
    </main>
  );
}
