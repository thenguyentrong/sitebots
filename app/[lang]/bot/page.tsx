import type { ReactNode } from 'react';
import { pageLang } from '@/lib/i18n/server';
import { publicMetadata } from '@/lib/seo';
import { SITE, scraperUserAgent } from '@/lib/site';

type Params = Promise<{ lang: string }>;

const META = {
  en: { title: 'About the crawler', description: 'What SitebotsBot fetches, how often, how it identifies itself, and how to opt out.' },
  de: { title: 'Über den Crawler', description: 'Was SitebotsBot abruft, wie oft, wie er sich ausweist und wie Sie ihn aussperren.' },
};

export async function generateMetadata({ params }: { params: Params }) {
  const lang = await pageLang(params);
  return publicMetadata({ ...META[lang], path: '/bot', lang });
}

const mail = SITE.email ? <a href={`mailto:${SITE.email}`} className="underline-offset-2 hover:underline">{SITE.email}</a> : null;

const TEXT: Record<'en' | 'de', { kicker: string; title: string; lead: string; agent: string; rules: ReactNode[] }> = {
  en: {
    kicker: 'Crawler', title: 'About SitebotsBot', agent: 'User agent',
    lead: `The crawler behind ${SITE.name}. It reads public specification pages, store listings and sitemaps so that this site can cite them.`,
    rules: [
      <>It honours <code>robots.txt</code> on every request and never fetches a URL it was not given by a sitemap, an API or a fixed list. It does not crawl links.</>,
      <>At most one request every two seconds per host, with caching and conditional requests so a page that has not changed is not downloaded again.</>,
      <>A 403 stops it for that site. A 429 or 503 is retried at most three times, honouring <code>Retry-After</code>.</>,
      <>Images are never copied. A product-page preview image is shown as a linked preview from your own server, with your name in the caption.</>,
      <>To opt out, disallow <code>SitebotsBot</code> in <code>robots.txt</code>{mail ? <> or write to {mail}</> : null}. Existing values from your site are removed on request.</>,
    ],
  },
  de: {
    kicker: 'Crawler', title: 'Über SitebotsBot', agent: 'User-Agent',
    lead: `Der Crawler hinter ${SITE.name}. Er liest öffentliche Datenblattseiten, Shop-Angebote und Sitemaps, damit diese Website sie zitieren kann.`,
    rules: [
      <>Er beachtet bei jeder Anfrage die <code>robots.txt</code> und ruft nur URLs ab, die er aus einer Sitemap, einer API oder einer festen Liste hat. Links folgt er nicht.</>,
      <>Höchstens eine Anfrage alle zwei Sekunden pro Host, mit Zwischenspeicher und bedingten Anfragen, damit eine unveränderte Seite nicht noch einmal geladen wird.</>,
      <>Ein 403 stoppt ihn für diese Website. Ein 429 oder 503 wird höchstens dreimal wiederholt, unter Beachtung von <code>Retry-After</code>.</>,
      <>Bilder werden nie kopiert. Ein Vorschaubild einer Produktseite wird als verlinkte Vorschau von Ihrem eigenen Server gezeigt, mit Ihrem Namen in der Bildunterschrift.</>,
      <>Um ihn auszusperren, verbieten Sie <code>SitebotsBot</code> in Ihrer <code>robots.txt</code>{mail ? <> oder schreiben Sie an {mail}</> : null}. Bereits übernommene Werte von Ihrer Website entfernen wir auf Anfrage.</>,
    ],
  },
};

/** The page the crawler's user agent points at. Plain, so a webmaster can read it in ten seconds. */
export default async function BotPage({ params }: { params: Params }) {
  const t = TEXT[await pageLang(params)];
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
      <header className="py-10">
        <p className="eyebrow">{t.kicker}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="mt-3 text-muted">{t.lead}</p>
      </header>
      <section className="card space-y-4 p-5 text-sm">
        <div>
          <p className="label mb-1">{t.agent}</p>
          <code className="rounded-md bg-subtle px-2 py-1 text-xs">{scraperUserAgent()}</code>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          {t.rules.map((rule, i) => <li key={i}>{rule}</li>)}
        </ul>
      </section>
    </main>
  );
}
