import Link from 'next/link';
import { JourneyStart } from '@/components/journey/JourneyStart';
import { explorerData } from '@/lib/market/landing';
import { HOME_DESCRIPTION, publicMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';
import './plan/plan.css';
import './plan/journey.css';

// Built once per deploy and served from the CDN: the landing depends only on the repository's data,
// and rendering it per request meant a cold function start of about three seconds for the first
// visitor after a quiet spell. It stays static because it uses no request-time API: the explorer
// reads its state from the address in the browser (ExplorerFromUrl), and the specification search
// lives at /search, where next.config.ts redirects its old addresses on this page. Not
// `force-static`: that hands useSearchParams empty values at build time, so a shared link's first
// browser render would not match the built HTML.
export const metadata = publicMetadata({ title: SITE.tagline, description: HOME_DESCRIPTION, path: '/', absoluteTitle: true });

export default function Home() {
  return <main className="visual-home">
    <noscript><p className="jp-page">The plan keeps your work in this browser and needs JavaScript. <Link className="underline" href="/use-cases">Browse the use cases</Link> or <Link className="underline" href="/search#matcher">search by specifications</Link>.</p></noscript>
    <JourneyStart {...explorerData('')} />
  </main>;
}
