import { Advisor } from '@/components/chat/Advisor';
import { LIMITS } from '@/lib/chat/config';
import { HOME_DESCRIPTION, publicMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const metadata = publicMetadata({ title: SITE.tagline, description: HOME_DESCRIPTION, path: '/', absoluteTitle: true });

export default function Home() {
  return <Advisor maxChars={LIMITS.messageChars} />;
}
