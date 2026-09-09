import Link from 'next/link';
import { MakerAvatar } from '@/components/MakerAvatar';
import { listManufacturers } from '@/lib/queries/manufacturers';
import { publicMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = publicMetadata({
  title: 'Robot manufacturers',
  description: 'Every maker in the database with the number of humanoids and quadrupeds we track and how many of their published values are manufacturer-verified.',
  path: '/brands',
});

export default async function BrandsPage() {
  const makers = await listManufacturers();
  const maxVerified = Math.max(1, ...makers.map((m) => m.verified_values));
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 py-10">
        <div>
          <p className="eyebrow">Makers</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Manufacturers</h1>
          <p className="mt-3 max-w-2xl text-muted">
            The verified count is how many values on their robots come from the maker&apos;s own pages rather than from a
            third-party database.
          </p>
        </div>
        <p className="num text-sm text-muted">{makers.length} makers</p>
      </header>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge text-left text-xs font-medium text-muted">
              <th className="px-5 py-3 font-medium">Maker</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 text-right font-medium">Robots</th>
              <th className="px-4 py-3 text-right font-medium">Humanoids</th>
              <th className="px-4 py-3 text-right font-medium">Quadrupeds</th>
              <th className="px-5 py-3 text-right font-medium">Verified values</th>
            </tr>
          </thead>
          <tbody className="num">
            {makers.map((m) => (
              <tr key={m.id} className="border-t border-edge/60 transition hover:bg-subtle/60">
                <td className="px-5 py-2.5">
                  <Link href={`/brands/${m.slug}`} className="flex items-center gap-3 font-medium">
                    <MakerAvatar name={m.name} />
                    <span className="underline-offset-4 hover:underline">{m.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted">{m.country ?? '—'}</td>
                <td className="px-4 py-2.5 text-right font-medium">{m.robots}</td>
                <td className="px-4 py-2.5 text-right text-muted">{m.humanoids}</td>
                <td className="px-4 py-2.5 text-right text-muted">{m.quadrupeds}</td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center justify-end gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-subtle">
                      <div className="h-full rounded-full bg-trust-verified" style={{ width: `${Math.round((m.verified_values / maxVerified) * 100)}%` }} />
                    </div>
                    <span className="w-8 text-right">{m.verified_values}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
