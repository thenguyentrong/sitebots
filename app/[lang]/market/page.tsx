import { permanentRedirect } from 'next/navigation';
import { ROBOT_TYPES } from '@/lib/market/schema';

type Search = Promise<Record<string, string | string[] | undefined>>;

/** The Germany list now opens the robots page, which shows it first. */
export default async function MarketPage({ searchParams }: { searchParams: Search }) {
  const { type } = await searchParams;
  permanentRedirect((ROBOT_TYPES as readonly string[]).includes(String(type)) ? '/robots?type=' + type : '/robots');
}
