'use client';

/* eslint-disable @next/next/no-img-element -- pictures are served as stored, same as the robot pages */
import { ArrowUpRight, Check, DownloadSimple, Minus, Warning } from '@phosphor-icons/react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { CompareToggle } from '@/components/compare/CompareBar';
import { TEXT } from '@/lib/chat/i18n';
import type { ChatOption, LeftOut } from '@/lib/chat/tools';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

function Points({ title, items, icon }: { title: string; items: string[]; icon: ReactNode }) {
  if (!items.length) return null;
  return <div>
    <h4 className="text-xs font-medium text-muted">{title}</h4>
    <ul className="mt-1.5 space-y-1.5 text-sm">{items.map((item) => <li key={item} className="flex gap-2"><span className="mt-0.5 shrink-0">{icon}</span><span>{item}</span></li>)}</ul>
  </div>;
}

function Option({ option, first, index }: { option: ChatOption; first: boolean; index: number }) {
  const t = TEXT[option.language];
  return <article className={cn('adv-item overflow-hidden rounded-3xl border bg-card', first ? 'border-safety/50' : 'border-edge')} style={{ '--delay': index * 0.12 + 's' } as CSSProperties}>
    <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
      <Link href={option.href} className="adv-robot-frame flex h-56 items-center justify-center p-4 sm:h-auto">
        {option.image ? <img src={option.image} alt={option.alt} loading="lazy" className="max-h-52 w-full object-contain" /> : null}
      </Link>
      <div className="min-w-0 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-safety">{option.label}</p>
            <h3 className="mt-1 text-2xl font-semibold leading-tight tracking-tight"><Link href={option.href} className="underline-offset-4 hover:underline">{option.name}</Link></h3>
            <p className="mt-1 text-sm text-muted">{option.type}, {option.maker}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{option.price}</p>
            <p className="max-w-56 text-xs text-muted">{option.status}{option.leadTime ? ', ' + option.leadTime : ''}</p>
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed">{option.why}</p>
        <dl className="mt-4 flex flex-wrap gap-2">
          {[...(option.proof ? [{ label: t.proof, value: option.proof }] : []), ...option.specs].map((spec) => <div key={spec.label} className="rounded-xl bg-subtle px-3 py-1.5">
            <dt className="text-[11px] text-muted">{spec.label}</dt>
            <dd className="text-sm font-medium">{spec.value}</dd>
          </div>)}
        </dl>
      </div>
    </div>

    <div className="grid gap-6 border-t border-edge p-5 sm:grid-cols-2 sm:p-6">
      <Points title={t.pros} items={option.pros} icon={<Check size={15} weight="bold" className="text-safety" />} />
      <Points title={t.cons} items={option.cons} icon={<Minus size={15} weight="bold" className="text-muted" />} />
      <Points title={t.confirm} items={option.confirm} icon={<Warning size={15} className="text-muted" />} />
      {option.sellers.length ? <div>
        <h4 className="text-xs font-medium text-muted">{t.buy}</h4>
        <ul className="mt-1.5 space-y-1.5 text-sm">
          {option.sellers.map((seller) => <li key={seller.name}>
            {seller.url ? <a href={seller.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">{seller.name}<ArrowUpRight size={13} /></a> : <span className="font-medium">{seller.name}</span>}
            <span className="block text-xs text-muted">{[seller.country, seller.price].filter(Boolean).join(', ')}</span>
          </li>)}
        </ul>
      </div> : <p className="text-sm text-muted">{t.noSeller}</p>}
    </div>

    <footer className="flex flex-wrap items-center gap-2 border-t border-edge px-5 py-3 sm:px-6">
      <Link href={option.href} className={ui.btnSecondary + ' ' + ui.sm}>{t.details}</Link>
      <CompareToggle id={option.id} name={option.name} />
    </footer>
  </article>;
}

/** The result of the consultation. Prices, sellers and specs on these cards come from the database,
 *  and only the reasons, pros and cons come from the adviser. */
export function OptionCards({ options, leftOut, reportHref }: { options: ChatOption[]; leftOut: LeftOut[]; reportHref: string | null }) {
  const t = TEXT[options[0].language];
  return <section aria-label="Your options" className="space-y-4">
    {options.map((option, index) => <Option key={option.id} option={option} first={index === 0} index={index} />)}
    {leftOut.length ? <details className="rounded-2xl border border-edge bg-card px-5 py-3 text-sm">
      <summary className="cursor-pointer font-medium">{t.whyNot}</summary>
      <ul className="mt-2 space-y-1 text-muted">{leftOut.map((item) => <li key={item.name}><span className="text-foreground">{item.name}:</span> {item.reason}</li>)}</ul>
    </details> : null}
    <div className="flex flex-wrap items-center gap-3">
      {reportHref ? <a href={reportHref} className={ui.btn}><DownloadSimple size={17} weight="bold" />{t.pdfExport}</a> : null}
      {options.length > 1 ? <Link href={'/compare?ids=' + options.map((option) => encodeURIComponent(option.id)).join(',')} className={ui.btnSecondary}>{t.compare}</Link> : null}
    </div>
  </section>;
}
