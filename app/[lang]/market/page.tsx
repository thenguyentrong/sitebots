import { permanentRedirect } from 'next/navigation';
import { localePath } from '@/lib/i18n/config';
import { pageLang } from '@/lib/i18n/server';
import { ROBOT_TYPES } from '@/lib/market/schema';

type Params = Promise<{ lang: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

/** The Germany list now opens the robots page, which shows it first, in the same language. */
export default async function MarketPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const lang = await pageLang(params);
  const { type } = await searchParams;
  permanentRedirect(localePath((ROBOT_TYPES as readonly string[]).includes(String(type)) ? '/robots?type=' + type : '/robots', lang));
}
