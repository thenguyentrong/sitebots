import Link from 'next/link';
import type { PlanResult } from '@/lib/plan/assessment';

export function PriceReference({ result }: { result: PlanResult }) {
  const price = result.price;
  const date = price?.original.observed_at?.slice(0, 10);
  return <div className="finder-price" data-testid="price-reference">
    <span className="plan-kicker">{price?.basis === 'estimate' ? 'Reported estimate' : 'Hardware price reference'}</span>
    {price ? <>
      <strong>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: price.original.currency, maximumFractionDigits: 0 }).format(price.original.amount)}</strong>
      <p>{price.original.tier === 1 ? 'Manufacturer source' : price.original.tier === 2 ? 'Seller source' : 'Third-party source'} · {price.original.region} · {price.original.config || 'Configuration unspecified'}</p>
      <a href={price.original.source_url} target="_blank" rel="noreferrer">View price source ↗</a><small>Recorded {date || 'date unavailable'}</small>
    </> : <><strong>Quote needed</strong><p>No price is recorded for this candidate.</p></>}
    <p className="finder-price-note">Full setup, taxes, delivery and current availability need confirmation. A listed price is not a project quote.</p>
    <Link href={result.href + '#buying-germany-title'}>Buying details & contacts ↗</Link>
  </div>;
}
