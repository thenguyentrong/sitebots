import { formatDate } from '@/lib/spec/display';
import { germanyBuyingRoutes, manufacturerSalesContact, type SalesContact } from '@/lib/purchasing';
import { manufacturerReview, canonicalManufacturerSlug } from '@/lib/manufacturers';
import type { PriceCurrent } from '@/lib/spec/types';

function ContactLinks({ contact }: { contact: SalesContact }) {
  return <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
    {contact.email ? <a href={`mailto:${contact.email}`} className="break-all underline underline-offset-2">{contact.email}</a> : null}
    {contact.phone ? <a href={contact.phoneLabel.startsWith('WhatsApp') ? `https://wa.me/${contact.phone.replace(/\D/g, '')}` : `tel:${contact.phone}`} rel="noopener noreferrer" className="underline underline-offset-2">{contact.phoneLabel}</a> : null}
    <a href={contact.contactUrl} target="_blank" rel="noopener noreferrer" className="text-muted underline underline-offset-2">Contact page ↗</a>
  </div>;
}

export function BuyingPanel({ manufacturer, model, variant, prices }: { manufacturer: string; model: string; variant: string; prices: PriceCurrent[] }) {
  const routes = germanyBuyingRoutes(manufacturer, model, variant, prices);
  const maker = manufacturerReview(manufacturer);
  const contact = manufacturerSalesContact(canonicalManufacturerSlug(manufacturer));
  if (!routes.length && !maker?.website && !contact) return null;
  return <section className="card overflow-hidden" aria-labelledby="buying-germany-title">
    <header className="border-b border-edge/70 px-5 py-3.5"><h2 id="buying-germany-title" className="text-sm font-semibold">Buying in Germany</h2></header>
    <div className="divide-y divide-edge/70">
      {routes.map(route => <div key={route.url} className="px-5 py-4" data-buying-route>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><a href={route.url} target="_blank" rel="nofollow noopener noreferrer" className="text-sm font-semibold underline underline-offset-4">{route.name} ↗</a><span className="text-xs text-muted">{route.region === 'DE' ? 'German seller' : 'EU seller'}</span></div>
        <p className="mt-1 text-xs text-muted">{route.configurations.join(' · ')}</p>
        {route.eligibility ? <p className="mt-2 text-xs">{route.eligibility}</p> : null}
        {route.delivery ? <p className="mt-1 text-xs text-muted">{route.delivery}</p> : null}
        {route.contact ? <ContactLinks contact={route.contact} /> : null}
        <p className="mt-2 text-[11px] text-muted">{route.indexed ? 'Indexed seller page; live stock and price unconfirmed' : 'Direct seller listing'} · {formatDate(route.checkedAt)}. Manufacturer authorization unconfirmed.</p>
      </div>)}
      {!routes.length ? <p className="px-5 py-4 text-sm text-muted">No Germany-specific seller listing has been checked for this model yet.</p> : null}
      {maker?.website || contact ? <div className="px-5 py-4">
        <p className="text-xs font-medium">Ask the manufacturer</p>
        <a href={contact?.contactUrl ?? maker!.website!} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold underline underline-offset-4">{contact?.name ?? maker!.name} ↗</a>
        {contact ? <><ContactLinks contact={contact} /><p className="mt-2 text-[11px] text-muted">Contact from the <a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">official website</a> · {formatDate(contact.reviewedAt)}</p></> : null}
        <p className="mt-2 text-xs text-muted">Ask for the exact configuration, a German delivery quote and the local service partner.</p>
      </div> : null}
    </div>
  </section>;
}
