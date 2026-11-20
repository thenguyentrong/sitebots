import type { Metadata } from 'next';
import Link from '@/components/LocaleLink';
import { pageLang } from '@/lib/i18n/server';
import { bilingual } from '@/lib/i18n/text';
import { LEGAL_READY, SITE } from '@/lib/site';
import { publicMetadata } from '@/lib/seo';

type Params = Promise<{ lang: string }>;

// § 5 DDG and § 18 Abs. 2 MStV. German is the legally relevant version; the English says the same.
const TEXT = bilingual({
  en: {
    title: 'Impressum', description: 'Who runs sitebots and how to reach them.',
    provider: 'Information according to § 5 DDG', contact: 'Contact', email: 'Email', phone: 'Phone',
    responsible: 'Responsible for content according to § 18(2) MStV',
    missing: "The operator's details are being added.",
    project: 'sitebots.org is a free, non-commercial project run by a private person.',
    disputeTitle: 'Consumer dispute resolution', dispute: 'We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.',
    contentTitle: 'Liability for content', content: 'We collect the information on this site with care and link every value to its source. Prices, availability and specifications change, so we cannot guarantee that everything is complete, correct and current. Please confirm every detail with the seller before you decide.',
    linksTitle: 'Liability for links', links: 'This site links to websites of others. We have no influence on their content and are not responsible for it; the operator of each linked site is. When we learn that a linked page breaks the law, we remove the link.',
    picturesTitle: 'Pictures and content of others', pictures: 'Pictures and quotes belong to the makers and publishers named next to them. If you own something shown here and want it removed or credited differently, write to the email address above. We remove it within 48 hours.',
    privacy: 'Privacy', privacyText: 'How we handle personal data is explained on the privacy page.',
  },
  de: {
    title: 'Impressum', description: 'Wer sitebots betreibt und wie Sie den Betreiber erreichen.',
    provider: 'Angaben gemäß § 5 DDG', contact: 'Kontakt', email: 'E-Mail', phone: 'Telefon',
    responsible: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
    missing: 'Die Angaben zum Betreiber werden ergänzt.',
    project: 'sitebots.org ist ein kostenloses, nicht kommerzielles Projekt einer Privatperson.',
    disputeTitle: 'Verbraucherstreitbeilegung', dispute: 'Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
    contentTitle: 'Haftung für Inhalte', content: 'Wir erstellen die Inhalte dieser Website mit Sorgfalt und verlinken jeden Wert mit seiner Quelle. Preise, Verfügbarkeit und technische Daten ändern sich, daher können wir nicht garantieren, dass alles vollständig, richtig und aktuell ist. Bitte klären Sie jedes Detail mit dem Verkäufer, bevor Sie entscheiden.',
    linksTitle: 'Haftung für Links', links: 'Diese Website verlinkt auf Websites Dritter. Auf deren Inhalte haben wir keinen Einfluss und sind dafür nicht verantwortlich; verantwortlich ist der jeweilige Betreiber. Erfahren wir, dass eine verlinkte Seite gegen Gesetze verstößt, entfernen wir den Link.',
    picturesTitle: 'Bilder und Inhalte Dritter', pictures: 'Bilder und Zitate gehören den Herstellern und Verlagen, die daneben genannt sind. Wenn Ihnen etwas gehört, das hier gezeigt wird, und Sie es entfernt oder anders genannt haben möchten, schreiben Sie an die oben genannte E-Mail-Adresse. Wir entfernen es innerhalb von 48 Stunden.',
    privacy: 'Datenschutz', privacyText: 'Wie wir mit personenbezogenen Daten umgehen, erklärt die Seite Datenschutz.',
  },
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = await pageLang(params);
  return publicMetadata({ title: TEXT[lang].title, description: TEXT[lang].description, path: '/impressum', lang });
}

/** Stays honest until the operator's details are in lib/site.ts: it says they are missing rather than showing a
 *  placeholder that reads like a real address. */
export default async function ImpressumPage({ params }: { params: Params }) {
  const t = TEXT[await pageLang(params)];
  const h2 = 'font-semibold text-foreground';
  const who = <p className="text-foreground">{SITE.operator}<br />{SITE.street}<br />{SITE.city}<br />{SITE.country}</p>;
  return <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
    <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
    <div className="mt-6 space-y-8 leading-relaxed text-muted">
      {LEGAL_READY ? <>
        <section className="space-y-2"><h2 className={h2}>{t.provider}</h2>{who}<p>{t.project}</p></section>
        <section className="space-y-1">
          <h2 className={h2}>{t.contact}</h2>
          {SITE.email ? <p>{t.email}: <a href={'mailto:' + SITE.email} className="underline underline-offset-4">{SITE.email}</a></p> : null}
          {SITE.phone ? <p>{t.phone}: {SITE.phone}</p> : null}
        </section>
        <section className="space-y-2"><h2 className={h2}>{t.responsible}</h2>{who}</section>
      </> : <p>{t.missing}</p>}
      <section className="space-y-2"><h2 className={h2}>{t.disputeTitle}</h2><p>{t.dispute}</p></section>
      <section className="space-y-2"><h2 className={h2}>{t.contentTitle}</h2><p>{t.content}</p></section>
      <section className="space-y-2"><h2 className={h2}>{t.linksTitle}</h2><p>{t.links}</p></section>
      <section className="space-y-2"><h2 className={h2}>{t.picturesTitle}</h2><p>{t.pictures}</p></section>
      <section className="space-y-2"><h2 className={h2}>{t.privacy}</h2><p>{t.privacyText} <Link href="/privacy" className="underline underline-offset-4">{t.privacy}</Link></p></section>
    </div>
  </main>;
}
