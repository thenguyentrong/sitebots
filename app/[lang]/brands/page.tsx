import Link from '@/components/LocaleLink';
import Form from 'next/form';
import { ManufacturerMap } from '@/components/ManufacturerMap';
import { ManufacturerSubmission } from '@/components/ManufacturerSubmission';
import reviewData from '@/data/manufacturers/review.json';
import { MakerAvatar } from '@/components/MakerAvatar';
import { BRANDS_TEXT } from '@/lib/i18n/brands';
import { LOCALE, localePath } from '@/lib/i18n/config';
import { formatDate, formatNumber, regionName } from '@/lib/i18n/format';
import { pageLang } from '@/lib/i18n/server';
import { allCompanies } from '@/lib/market/company-list';
import { manufacturerStatusLabel } from '@/lib/manufacturers';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';

export const dynamic = 'force-dynamic';

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const lang = await pageLang(params);
  const t = BRANDS_TEXT[lang];
  return publicMetadata({ title: t.title, description: t.description, path: '/brands', lang });
}

type Search = Promise<{ q?: string; status?: string; country?: string }>;
export default async function BrandsPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const lang = await pageLang(params);
  const t = BRANDS_TEXT[lang];
  const num = (n: number) => formatNumber(n, lang);
  const [allMakers, search] = await Promise.all([allCompanies(), searchParams]);
  const q = typeof search.q === 'string' ? search.q.trim() : '';
  const status = search.status === 'commercial' || search.status === 'developing' ? search.status : '';
  const country = typeof search.country === 'string' ? search.country.toUpperCase() : '';
  const countryOf = (code: string) => regionName(code === 'UK' ? 'GB' : code, lang);
  const countryCounts = new Map<string, number>();
  for (const m of allMakers) if (m.country) countryCounts.set(m.country, (countryCounts.get(m.country) ?? 0) + 1);
  const countries = [...countryCounts].map(([code, count]) => {
    const query = new URLSearchParams({ country: code });
    if (q) query.set('q', q);
    if (status) query.set('status', status);
    return { code, count, name: countryOf(code), href: `/brands?${query}#manufacturers` };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, LOCALE[lang]));
  // The country is searched by its code and by its name in the page's language, as the placeholder promises.
  const makers = allMakers.filter((m) => (!country || m.country === country) && (!status || m.status === status) && (!q || `${m.name} ${m.slug} ${m.country ?? ''} ${m.country ? countryOf(m.country) : ''}`.toLowerCase().includes(q.toLowerCase())));
  const commercial = allMakers.filter((m) => m.status === 'commercial').length;
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <header className="py-10">
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t.heading}</h1>
        <p className="mt-3 max-w-2xl text-muted">{t.lead}</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <span><strong className="num text-foreground">{num(commercial)}</strong> {t.commercialCount}</span>
          <span><strong className="num text-foreground">{num(allMakers.length - commercial)}</strong> {t.developingCount}</span>
          <span>{t.reviewed(formatDate(reviewData.reviewedAt, lang))}</span>
        </div>
        <a href="#submit-manufacturer" className="mt-5 inline-block text-sm font-medium underline underline-offset-4">{t.suggest}</a>
      </header>
      <Form key={`filters:${q}:${status}:${country}`} id="manufacturers" action={localePath('/brands', lang)} className="mb-5 flex flex-wrap items-end gap-3" role="search" aria-label={t.find}>
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-xs font-medium text-muted">
          {t.search}
          <input type="search" name="q" defaultValue={q} placeholder={t.searchPlaceholder} className="h-10 rounded-xl border border-edge bg-card px-3 text-sm text-foreground" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          {t.status}
          <select name="status" defaultValue={status} className="h-10 rounded-xl border border-edge bg-card px-3 text-sm text-foreground">
            <option value="">{t.allCompanies}</option>
            <option value="commercial">{t.commercial}</option>
            <option value="developing">{t.developing}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">{t.country}<select name="country" defaultValue={country} className="h-10 rounded-xl border border-edge bg-card px-3 text-sm text-foreground"><option value="">{t.allCountries}</option>{countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
        <button type="submit" className={ui.btnSecondary}>{t.filter}</button>
        {q || status || country ? <Link href="/brands" className="px-2 py-2 text-sm text-muted underline underline-offset-4">{t.clear}</Link> : null}
      </Form>
      <div className="mb-7"><ManufacturerMap countries={countries} selected={country} unknown={allMakers.filter(m => !m.country).length} /></div>
      <p className="mb-3 text-xs text-muted">{t.companies(makers.length, num(makers.length))} · {t.regionNote}</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge text-left text-xs text-muted">
              <th className="px-5 py-3 font-medium">{t.colMaker}</th>
              <th className="px-4 py-3 font-medium">{t.colStatus}</th>
              <th className="px-4 py-3 font-medium">{t.colCountry}</th>
              <th className="px-4 py-3 text-right font-medium">{t.colRobots}</th>
              <th className="px-5 py-3 text-right font-medium">{t.colVerified}</th>
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
                <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${m.status === 'commercial' ? 'bg-trust-verified/10 text-trust-verified' : 'bg-subtle text-muted'}`}>{manufacturerStatusLabel(m.status, lang)}</span></td>
                <td className="px-4 py-3 text-muted">{m.country ? regionName(m.country, lang) : '—'}</td>
                <td className="num px-4 py-3 text-right font-medium">{num(m.robots)}</td>
                <td className="num px-5 py-3 text-right text-muted">{num(m.verified_values)}</td>
              </tr>
            ))}
            {!makers.length ? <tr><td colSpan={5} className="px-5 py-12 text-center text-muted">{t.noMatch}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <ManufacturerSubmission />
    </main>
  );
}
