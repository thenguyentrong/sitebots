import Link from 'next/link';
import { MakerAvatar } from '@/components/MakerAvatar';
import { listManufacturers } from '@/lib/queries/manufacturers';
import { manufacturerStatusLabels } from '@/lib/manufacturers';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';

export const dynamic = 'force-dynamic';
export const metadata = publicMetadata({
  title: 'Robot manufacturers',
  description: 'Commercial robot suppliers and companies developing upcoming robots, with official websites, logos and reviewed commercial status.',
  path: '/brands',
});

type Search = Promise<{ q?: string; status?: string }>;
export default async function BrandsPage({ searchParams }: { searchParams: Search }) {
  const [allMakers, search] = await Promise.all([listManufacturers(), searchParams]);
  const q = typeof search.q === 'string' ? search.q.trim() : '';
  const status = search.status === 'commercial' || search.status === 'developing' ? search.status : '';
  const makers = allMakers.filter((m) => (!status || m.review?.status === status) && (!q || `${m.name} ${m.slug} ${m.country ?? ''}`.toLowerCase().includes(q.toLowerCase())));
  const commercial = allMakers.filter((m) => m.review?.status === 'commercial').length;
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <header className="py-10">
        <p className="eyebrow">Makers</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Manufacturers</h1>
        <p className="mt-3 max-w-2xl text-muted">Companies supplying robots today and building the next generation. Research projects and unverified suppliers are excluded.</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <span><strong className="num text-foreground">{commercial}</strong> commercial suppliers</span>
          <span><strong className="num text-foreground">{allMakers.length - commercial}</strong> in development</span>
          <span>Reviewed 12 September 2026</span>
        </div>
      </header>
      <form action="/brands" className="mb-5 flex flex-wrap items-end gap-3" role="search" aria-label="Find a manufacturer">
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-xs font-medium text-muted">
          Search manufacturers
          <input type="search" name="q" defaultValue={q} placeholder="Company or country" className="h-10 rounded-xl border border-edge bg-card px-3 text-sm text-foreground" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          Commercial status
          <select name="status" defaultValue={status} className="h-10 rounded-xl border border-edge bg-card px-3 text-sm text-foreground">
            <option value="">All companies</option>
            <option value="commercial">Commercial suppliers</option>
            <option value="developing">In development</option>
          </select>
        </label>
        <button type="submit" className={ui.btnSecondary}>Filter</button>
        {q || status ? <Link href="/brands" className="px-2 py-2 text-sm text-muted underline underline-offset-4">Clear</Link> : null}
      </form>
      <p className="mb-3 text-xs text-muted"><span className="num">{makers.length}</span> companies · Supplier status does not guarantee that every model is available in your region.</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge text-left text-xs text-muted">
              <th className="px-5 py-3 font-medium">Manufacturer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 text-right font-medium">Robots</th>
              <th className="px-5 py-3 text-right font-medium">Verified values</th>
            </tr>
          </thead>
          <tbody>
            {makers.map((m) => (
              <tr key={m.slug} className="border-t border-edge/60 transition hover:bg-subtle/60" data-manufacturer={m.slug}>
                <td className="px-5 py-3">
                  <Link href={`/brands/${m.slug}`} className="flex items-center gap-3 font-medium">
                    <MakerAvatar name={m.name} logo={m.logo} />
                    <span className="underline-offset-4 hover:underline">{m.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${m.review?.status === 'commercial' ? 'bg-trust-verified/10 text-trust-verified' : 'bg-subtle text-muted'}`}>{manufacturerStatusLabels[m.review?.status ?? 'unverified']}</span></td>
                <td className="px-4 py-3 text-muted">{m.country ?? '—'}</td>
                <td className="num px-4 py-3 text-right font-medium">{m.robots}</td>
                <td className="num px-5 py-3 text-right text-muted">{m.verified_values}</td>
              </tr>
            ))}
            {!makers.length ? <tr><td colSpan={5} className="px-5 py-12 text-center text-muted">No manufacturers match these filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
