import { Advisor } from '@/components/chat/Advisor';
import { LIMITS } from '@/lib/chat/config';
import { HOME_DESCRIPTION, publicMetadata } from '@/lib/seo';

export const metadata = publicMetadata({ title: 'Advisor: which robot fits your job', description: HOME_DESCRIPTION, path: '/advisor' });

export default function AdvisorPage() {
  return <Advisor maxChars={LIMITS.messageChars} />;
}
