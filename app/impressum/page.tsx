import type { Metadata } from 'next';
import { LEGAL_READY, SITE } from '@/lib/site';
import { publicMetadata } from '@/lib/seo';

export const metadata: Metadata = publicMetadata({ title: 'Impressum', description: 'Who runs sitebots and how to reach them.', path: '/impressum' });

/** §5 DDG. Stays honest until the operator's details are in lib/site.ts: it says they are missing
 *  rather than showing a placeholder that reads like a real address. */
export default function ImpressumPage() {
  return <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
    <h1 className="text-3xl font-semibold tracking-tight">Impressum</h1>
    {LEGAL_READY ? <div className="mt-6 space-y-4 text-muted">
      <p className="text-foreground">{SITE.operator}<br />{SITE.street}<br />{SITE.city}<br />{SITE.country}</p>
      {SITE.email ? <p>Email: <a href={'mailto:' + SITE.email} className="underline underline-offset-4">{SITE.email}</a></p> : null}
      {SITE.phone ? <p>Phone: {SITE.phone}</p> : null}
      {SITE.vatId ? <p>VAT ID: {SITE.vatId}</p> : null}
      {SITE.register ? <p>Register: {SITE.register}</p> : null}
    </div> : <p className="mt-6 text-muted">The operator&apos;s details are being added.</p>}
    <section className="mt-10 space-y-3 text-muted">
      <h2 className="font-semibold text-foreground">Pictures and content of others</h2>
      <p>Pictures and quotes belong to the makers and publishers named next to them. If you own something shown here and want it removed or credited differently, write to the address above. We remove it within 48 hours.</p>
      <h2 className="pt-3 font-semibold text-foreground">No guarantee</h2>
      <p>We check every value against its source, but prices, availability and specifications change. Please confirm every detail with the seller before you decide.</p>
    </section>
  </main>;
}
