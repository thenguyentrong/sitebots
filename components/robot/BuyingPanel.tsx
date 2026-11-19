import { recordLang, type Lang } from '@/lib/i18n/config';
import { PANEL_TEXT } from '@/lib/i18n/robot';
import { formatDate } from '@/lib/spec/display';
import { germanyBuyingRoutes, manufacturerSalesContact, type SalesContact } from '@/lib/purchasing';
import { manufacturerReview, canonicalManufacturerSlug } from '@/lib/manufacturers';
import type { PriceCurrent } from '@/lib/spec/types';

function ContactLinks({ contact, lang }: { contact: SalesContact; lang: Lang }) {
  return <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
    {contact.email ? <a href={`mailto:${contact.email}`} className="break-all underline underline-offset-2">{contact.email}</a> : null}
    {contact.phone ? <a href={contact.phoneLabel.startsWith('WhatsApp') ? `https://wa.me/${contact.phone.replace(/\D/g, '')}` : `tel:${contact.phone}`} rel="noopener noreferrer" className="underline underline-offset-2">{contact.phoneLabel}</a> : null}
    <a href={contact.contactUrl} target="_blank" rel="noopener noreferrer" className="text-muted underline underline-offset-2">{PANEL_TEXT[lang].contactPage}</a>
  </div>;
}

/** What is known about buying a robot without a German market record, inside the page's Buy in Germany section.
 * Eligibility and delivery are the seller's words from data/purchasing and stay as written. */
export function BuyingPanel({ manufacturer, model, variant, prices, lang = 'en' }: { manufacturer: string; model: string; variant: string; prices: PriceCurrent[]; lang?: Lang }) {
  const t = PANEL_TEXT[lang];
  const routes = germanyBuyingRoutes(manufacturer, model, variant, prices);
  const maker = manufacturerReview(manufacturer);
  const contact = manufacturerSalesContact(canonicalManufacturerSlug(manufacturer));
  if (!routes.length && !maker?.website && !contact) return <p className="px-5 py-4 text-sm text-muted">{lang === 'de' ? 'Noch kein Händler in Deutschland erfasst.' : 'No German seller recorded yet.'}</p>;
  return <div className="divide-y divide-edge/70">
      {routes.map(route => <div key={route.url} className="px-5 py-4" data-buying-route>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><a href={route.url} target="_blank" rel="nofollow noopener noreferrer" className="text-sm font-semibold underline underline-offset-4">{route.name} ↗</a><span className="text-xs text-muted">{route.region === 'DE' ? t.germanSeller : t.euSeller}</span></div>
        <p className="mt-1 text-xs text-muted">{route.configurations.join(' · ')}</p>
        {route.eligibility ? <p className="mt-2 text-xs" lang={recordLang(lang)}>{route.eligibility}</p> : null}
        {route.delivery ? <p className="mt-1 text-xs text-muted" lang={recordLang(lang)}>{route.delivery}</p> : null}
        {route.contact ? <ContactLinks contact={route.contact} lang={lang} /> : null}
        <p className="mt-2 text-[11px] text-muted">{route.indexed ? t.indexed : t.directListing} · {formatDate(route.checkedAt, lang)}. {t.unauthorised}</p>
      </div>)}
      {!routes.length ? <p className="px-5 py-4 text-sm text-muted">{t.noListing}</p> : null}
      {maker?.website || contact ? <div className="px-5 py-4">
        <p className="text-xs font-medium">{t.askMaker}</p>
        <a href={contact?.contactUrl ?? maker!.website!} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold underline underline-offset-4">{contact?.name ?? maker!.name} ↗</a>
        {contact ? <><ContactLinks contact={contact} lang={lang} /><p className="mt-2 text-[11px] text-muted">{t.contactFrom}<a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{t.officialSite}</a> · {formatDate(contact.reviewedAt, lang)}</p></> : null}
        <p className="mt-2 text-xs text-muted">{t.askFor}</p>
      </div> : null}
  </div>;
}
