import type { Metadata } from 'next';
import { pageLang } from '@/lib/i18n/server';
import { bilingual } from '@/lib/i18n/text';
import { LEGAL_READY, SITE } from '@/lib/site';
import { publicMetadata } from '@/lib/seo';

type Params = Promise<{ lang: string }>;

const TEXT = bilingual({
  en: { title: 'Impressum', description: 'Who runs sitebots and how to reach them.', email: 'Email', phone: 'Phone', vat: 'VAT ID', register: 'Register', missing: "The operator's details are being added.", picturesTitle: 'Pictures and content of others', pictures: 'Pictures and quotes belong to the makers and publishers named next to them. If you own something shown here and want it removed or credited differently, write to the address above. We remove it within 48 hours.', guaranteeTitle: 'No guarantee', guarantee: 'We check every value against its source, but prices, availability and specifications change. Please confirm every detail with the seller before you decide.' },
  de: { title: 'Impressum', description: 'Wer sitebots betreibt und wie Sie den Betreiber erreichen.', email: 'E-Mail', phone: 'Telefon', vat: 'USt-IdNr.', register: 'Registereintrag', missing: 'Die Angaben zum Betreiber werden ergänzt.', picturesTitle: 'Bilder und Inhalte Dritter', pictures: 'Bilder und Zitate gehören den Herstellern und Verlagen, die daneben genannt sind. Wenn Ihnen etwas gehört, das hier gezeigt wird, und Sie es entfernt oder anders genannt haben möchten, schreiben Sie an die oben genannte Adresse. Wir entfernen es innerhalb von 48 Stunden.', guaranteeTitle: 'Keine Gewähr', guarantee: 'Wir prüfen jeden Wert an seiner Quelle, aber Preise, Verfügbarkeit und technische Daten ändern sich. Bitte klären Sie jedes Detail mit dem Verkäufer, bevor Sie entscheiden.' },
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = await pageLang(params);
  return publicMetadata({ title: TEXT[lang].title, description: TEXT[lang].description, path: '/impressum', lang });
}

/** §5 DDG. Stays honest until the operator's details are in lib/site.ts: it says they are missing
 *  rather than showing a placeholder that reads like a real address. */
export default async function ImpressumPage({ params }: { params: Params }) {
  const t = TEXT[await pageLang(params)];
  return <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
    <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
    {LEGAL_READY ? <div className="mt-6 space-y-4 text-muted">
      <p className="text-foreground">{SITE.operator}<br />{SITE.street}<br />{SITE.city}<br />{SITE.country}</p>
      {SITE.email ? <p>{t.email}: <a href={'mailto:' + SITE.email} className="underline underline-offset-4">{SITE.email}</a></p> : null}
      {SITE.phone ? <p>{t.phone}: {SITE.phone}</p> : null}
      {SITE.vatId ? <p>{t.vat}: {SITE.vatId}</p> : null}
      {SITE.register ? <p>{t.register}: {SITE.register}</p> : null}
    </div> : <p className="mt-6 text-muted">{t.missing}</p>}
    <section className="mt-10 space-y-3 text-muted">
      <h2 className="font-semibold text-foreground">{t.picturesTitle}</h2>
      <p>{t.pictures}</p>
      <h2 className="pt-3 font-semibold text-foreground">{t.guaranteeTitle}</h2>
      <p>{t.guarantee}</p>
    </section>
  </main>;
}
