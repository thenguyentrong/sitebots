import { publicMetadata } from '@/lib/seo';
import { SITE, scraperUserAgent } from '@/lib/site';

export const metadata = publicMetadata({
  title: 'About the crawler',
  description: 'What SitebotsBot fetches, how often, how it identifies itself, and how to opt out.',
  path: '/bot',
});

/** The page the crawler's user agent points at. Plain, so a webmaster can read it in ten seconds. */
export default function BotPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
      <header className="py-10">
        <p className="eyebrow">Crawler</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">About SitebotsBot</h1>
        <p className="mt-3 text-muted">The crawler behind {SITE.name}. It reads public specification pages, store listings and sitemaps so that this site can cite them.</p>
      </header>
      <section className="card space-y-4 p-5 text-sm">
        <div>
          <p className="label mb-1">User agent</p>
          <code className="rounded-md bg-subtle px-2 py-1 text-xs">{scraperUserAgent()}</code>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          <li>It honours <code>robots.txt</code> on every request and never fetches a URL it was not given by a sitemap, an API or a fixed list. It does not crawl links.</li>
          <li>At most one request every two seconds per host, with caching and conditional requests so a page that has not changed is not downloaded again.</li>
          <li>A 403 stops it for that site. A 429 or 503 is retried at most three times, honouring <code>Retry-After</code>.</li>
          <li>Images are never copied. A product-page preview image is shown as a linked preview from your own server, with your name in the caption.</li>
          <li>To opt out, disallow <code>SitebotsBot</code> in <code>robots.txt</code>{SITE.email ? <> or write to <a href={`mailto:${SITE.email}`} className="underline-offset-2 hover:underline">{SITE.email}</a></> : null}. Existing values from your site are removed on request.</li>
        </ul>
      </section>
    </main>
  );
}
