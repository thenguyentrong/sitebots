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
        <p className="mt-2">The robot pages, the comparison and everything else are free and need no account. Only the adviser and writing a review need one: every adviser answer costs money, and a review should come from a real account. You sign in with Google. Google confirms to us that you signed in and sends your email address. During sign-in a short-lived cookie (sitebots_oauth) protects the login and is deleted afterwards.</p>
        <p className="mt-2">We store a code made from your Google account number and a secret, so it does not show who you are; how many free consultations you started each month; and which chats are yours. We do not store your name or your email address. Your email address is kept only in the sign-in cookie in your browser, so the account menu can show which account you used. The cookie lasts 30 days, or until you sign out. The account record is kept until you delete your account.</p>
        <p className="mt-2">If you write a review of a robot or a company, we store it with the same account code, the sign-in provider, your rating, whether you worked with it, the text and the optional name you chose to show. Everyone can read the review; the account code is never shown. You can change or delete your review at any time. It stays online until you or we delete it.</p>
        <p className="mt-2">&quot;Delete my account&quot; removes the account record, all chats started with it and all reviews written with it, straight away.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Your own API key</h2>
        <p className="mt-2">Instead of the free allowance, you can use your own Anthropic API key. It is stored only in your browser: until you close the tab, or on this device if you tick &quot;Remember on this device&quot;. It is sent with each of your messages to our server, which passes it to Anthropic for that one answer. We never save it or write it to a log. Anthropic bills the answers to your Anthropic account, under your agreement with them. Your chats are saved as described above.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Who processes it</h2>
        <p className="mt-2">Your messages are sent to Anthropic PBC in the United States, which writes the answers with its AI model Claude as our processor under its data processing terms. The site is hosted by Vercel Inc. (USA), which handles every page request and stores the chats, account records and reviews in a private store in Frankfurt. For every page request Vercel processes your IP address and browser data in server logs, to deliver the page and protect it from attacks. Both transfers to the USA are based on the EU Standard Contractual Clauses in their data processing terms (Art. 46(2)(c) GDPR). Sign-in goes through Google (Google Ireland Limited).</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Videos</h2>
        <p className="mt-2">The start page shows films by robot makers that are hosted on YouTube. Until you press play, only a preview picture stored on our own server is shown and nothing is loaded from YouTube. When you press play, the film loads from youtube-nocookie.com, and Google Ireland Limited receives your IP address and the usual browser data. YouTube&apos;s own privacy policy applies to that film (Art. 6(1)(a) GDPR, by pressing play). The film behind the opening of the start page is stored on our own server.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Legal basis and your rights</h2>
        <p className="mt-2">Chats, sign-in, your account, the free allowance and reviews: Art. 6(1)(b) GDPR, the service you asked for. The daily-limit code, server logs, reading chats to improve the service and protection against abuse: Art. 6(1)(f) GDPR, our interest in running a free service safely and within budget. YouTube films: Art. 6(1)(a) GDPR, your consent by pressing play, which you can withdraw at any time for the future.</p>
        <p className="mt-2">You can ask for access, correction, deletion, restriction and a copy of your data (data portability), and you can complain to a data protection authority, for example the Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW).</p>
        <p className="mt-3 rounded-lg border border-edge p-3 text-foreground"><strong>Right to object (Art. 21 GDPR).</strong> Where we rely on our legitimate interest, you can object at any time for reasons arising from your situation. Write to us at the address in the Impressum.</p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">This browser</h2>
        <p className="mt-2">The site keeps your comparison and your plan in this browser only. The chat remembers the current conversation until you close the tab. If you sign in, a sign-in cookie is set; if you use your own key, it is kept in this browser as described above. Both are needed for the service you asked for, so no consent banner is shown for them.</p>
      </section>
    </div>
  </main>;
}
