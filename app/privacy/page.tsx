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
        {SITE.email ? <p className="mt-2">Email: <a href={'mailto:' + SITE.email} className="underline underline-offset-4">{SITE.email}</a></p> : null}
      </section>
      <section>
        <h2 className="font-semibold text-foreground">The chat</h2>
        <p className="mt-2">When you use the chat, we save what you type and the answer you get, with the time and which robots were shown. The owner of this site reads these chats to improve the site and the data. Please do not type personal details, such as names, phone numbers or company secrets.</p>
        <p className="mt-2">To enforce the daily limit we keep a code calculated from your internet address and browser for up to two days. It changes every day and we do not store your address itself, so it cannot follow you from one day to the next, and it is not saved with your chat.</p>
        <p className="mt-2">If you name your company, the adviser may look it up on the public web so it can understand your work. The search goes through Anthropic and what it finds shows in your brief, where you can correct it. It looks up companies, not private people.</p>
        <p className="mt-2">If you use the microphone button, your browser turns your speech into text with its own speech service, which in Chrome is run by Google and in Safari by Apple. We never receive your voice, only the text that you send.</p>
        <p className="mt-2">Saved chats are deleted after six months. If you are signed in, &quot;Delete my account&quot; in the account menu deletes your chats at once. Otherwise contact us and tell us when the chat took place and what it was about.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Signing in</h2>
        <p className="mt-2">The robot pages, the comparison and everything else are free and need no account. Only the adviser and writing a review need one: every adviser answer costs money, and a review should come from a real account. You sign in with Google or Microsoft. They confirm to us that you signed in and send your email address.</p>
        <p className="mt-2">We store a code made from your Google or Microsoft account number and a secret, so it does not show who you are; how many free consultations you started each month; and which chats are yours. We do not store your name or your email address. Your email address is kept only in the sign-in cookie in your browser, so the account menu can show which account you used. The cookie lasts 30 days, or until you sign out.</p>
        <p className="mt-2">If you write a review of a robot or a company, we store it with the same account code, the sign-in provider, your rating, whether you worked with it, the text and the optional name you chose to show. Everyone can read the review; the account code is never shown. You can change or delete your review at any time.</p>
        <p className="mt-2">&quot;Delete my account&quot; removes the account record, all chats started with it and all reviews written with it, straight away.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Your own API key</h2>
        <p className="mt-2">Instead of the free allowance, you can use your own Anthropic API key. It is stored only in your browser: until you close the tab, or on this device if you tick &quot;Remember on this device&quot;. It is sent with each of your messages to our server, which passes it to Anthropic for that one answer. We never save it or write it to a log. Anthropic bills the answers to your Anthropic account, under your agreement with them. Your chats are saved as described above.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Who processes it</h2>
        <p className="mt-2">Your messages are sent to Anthropic PBC in the United States, which generates the answers with its AI model Claude. The site runs on Vercel, which handles every page request and stores the chats, account records and reviews in a private store in Frankfurt. Sign-in goes through Google (Google Ireland Limited) or Microsoft (Microsoft Ireland Operations Limited), depending on the button you choose.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Legal basis and your rights</h2>
        <p className="mt-2">We process chats because you choose to send them and to run and improve this service (Art. 6(1)(b) and (f) GDPR). You can ask for access, correction, deletion or restriction, object to the processing, and complain to a data protection authority.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">This browser</h2>
        <p className="mt-2">The site keeps your comparison and your plan in this browser only. The chat remembers the current conversation until you close the tab. If you sign in, a sign-in cookie is set; if you use your own key, it is kept in this browser as described above. Both are needed for the service you asked for, so no consent banner is shown for them.</p>
      </section>
    </div>
  </main>;
}
