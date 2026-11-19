import { Advisor } from '@/components/chat/Advisor';
import { LIMITS } from '@/lib/chat/config';
import { COMMON } from '@/lib/i18n/common';
import { pageLang } from '@/lib/i18n/server';
import { publicMetadata } from '@/lib/seo';

type Params = Promise<{ lang: string }>;

const TITLE = { en: 'Advisor: which robot fits your job', de: 'Berater: welcher Roboter zu Ihrer Arbeit passt' };

export async function generateMetadata({ params }: { params: Params }) {
  const lang = await pageLang(params);
  return publicMetadata({ title: TITLE[lang], description: COMMON[lang].description, path: '/advisor', lang });
}

// The chat answers in the page's language: /advisor in English, /de/advisor in German (see Advisor).
export default async function AdvisorPage({ params }: { params: Params }) {
  await pageLang(params);
  return <Advisor maxChars={LIMITS.messageChars} />;
}
