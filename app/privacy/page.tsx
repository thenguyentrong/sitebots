import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_READY, SITE } from '@/lib/site';
import { publicMetadata } from '@/lib/seo';

export const metadata: Metadata = publicMetadata({ title: 'Privacy', description: 'What sitebots stores, who processes it and what your rights are.', path: '/privacy' });

// Describes what lib/chat/store.ts and app/api/chat/route.ts really do. Change them together. A lawyer
// should read this before the chat goes live.
export default function PrivacyPage() {
  return <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
    <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
    <div className="mt-6 space-y-8 leading-relaxed text-muted">
      <section>
        <h2 className="font-semibold text-foreground">Who is responsible</h2>
        <p className="mt-2">{LEGAL_READY ? <>{SITE.operator}, {SITE.street}, {SITE.city}, {SITE.country}.</> : <>The operator named in the <Link href="/impressum" className="underline underline-offset-4">Impressum</Link>.</>}</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">The chat</h2>
        <p className="mt-2">When you use the chat, we save what you type and the answer you get, with the time and which robots were shown. The owner of this site reads these chats to improve the site and the data. Please do not type personal details, such as names, phone numbers or company secrets.</p>
        <p className="mt-2">To enforce the daily limit we keep a code calculated from your internet address and browser for up to two days. It changes every day and we do not store your address itself, so it cannot follow you from one day to the next, and it is not saved with your chat.</p>
        <p className="mt-2">If you name your company, the adviser may look it up on the public web so it can understand your work. The search goes through Anthropic and what it finds shows in your brief, where you can correct it. It looks up companies, not private people.</p>
        <p className="mt-2">If you use the microphone button, your browser turns your speech into text with its own speech service, which in Chrome is run by Google and in Safari by Apple. We never receive your voice, only the text that you send.</p>
        <p className="mt-2">Saved chats are deleted after six months. To have a chat deleted sooner, contact us and tell us when it took place and what it was about.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Who processes it</h2>
        <p className="mt-2">Your messages are sent to Anthropic PBC in the United States, which generates the answers with its AI model Claude. The site runs on Vercel, which handles every page request and stores the chats in a private store in Frankfurt.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Legal basis and your rights</h2>
        <p className="mt-2">We process chats because you choose to send them and to run and improve this service (Art. 6(1)(b) and (f) GDPR). You can ask for access, correction, deletion or restriction, object to the processing, and complain to a data protection authority.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">This browser</h2>
        <p className="mt-2">The site keeps your comparison and your plan in this browser only. The chat remembers the current conversation until you close the tab.</p>
      </section>
    </div>
  </main>;
}
