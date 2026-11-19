import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from '@/components/LocaleLink';
import type { Lang } from '@/lib/i18n/config';
import { pageLang } from '@/lib/i18n/server';
import { LEGAL_READY, SITE } from '@/lib/site';
import { publicMetadata } from '@/lib/seo';

type Params = Promise<{ lang: string }>;

const META = {
  en: { title: 'Privacy', description: 'What sitebots stores, who processes it and what your rights are.' },
  de: { title: 'Datenschutz', description: 'Was sitebots speichert, wer die Daten verarbeitet und welche Rechte Sie haben.' },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = await pageLang(params);
  return publicMetadata({ ...META[lang], path: '/privacy', lang });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section>
    <h2 className="font-semibold text-foreground">{title}</h2>
    {children}
  </section>;
}

const mail = SITE.email ? <a href={'mailto:' + SITE.email} className="underline underline-offset-4">{SITE.email}</a> : null;
const address = <>{SITE.operator}, {SITE.street}, {SITE.city}, {SITE.country}.</>;

// Describes what lib/chat/store.ts and app/api/chat/route.ts really do. Change them together, and change
// both languages together: the German text says the same as the English, sentence by sentence. A lawyer
// should read both before the chat goes live.
function English() {
  return <>
    <Section title="Who is responsible">
      <p className="mt-2">{LEGAL_READY ? address : <>The operator named in the <Link href="/impressum" className="underline underline-offset-4">Impressum</Link>.</>}</p>
      {mail ? <p className="mt-2">Email: {mail}</p> : null}
    </Section>
    <Section title="The chat">
      <p className="mt-2">When you use the chat, we save what you type and the answer you get, with the time and which robots were shown. The owner of this site reads these chats to improve the site and the data. Please do not type personal details, such as names, phone numbers or company secrets.</p>
      <p className="mt-2">To enforce the daily limit we keep a code calculated from your internet address and browser for up to two days. It changes every day and we do not store your address itself, so it cannot follow you from one day to the next, and it is not saved with your chat.</p>
      <p className="mt-2">If you name your company, the adviser may look it up on the public web so it can understand your work. The search goes through Anthropic and what it finds shows in your brief, where you can correct it. It looks up companies, not private people.</p>
      <p className="mt-2">If you use the microphone button, your browser turns your speech into text with its own speech service, which in Chrome is run by Google and in Safari by Apple. We never receive your voice, only the text that you send.</p>
      <p className="mt-2">Saved chats are deleted after six months. If you are signed in, &quot;Delete my account&quot; in the account menu deletes your chats at once. Otherwise contact us and tell us when the chat took place and what it was about.</p>
    </Section>
    <Section title="Signing in">
      <p className="mt-2">The robot pages, the comparison and everything else are free and need no account. Only the adviser and writing a review need one: every adviser answer costs money, and a review should come from a real account. You sign in with Google or Microsoft. They confirm to us that you signed in and send your email address.</p>
      <p className="mt-2">We store a code made from your Google or Microsoft account number and a secret, so it does not show who you are; how many free consultations you started each month; and which chats are yours. We do not store your name or your email address. Your email address is kept only in the sign-in cookie in your browser, so the account menu can show which account you used. The cookie lasts 30 days, or until you sign out.</p>
      <p className="mt-2">If you write a review of a robot or a company, we store it with the same account code, the sign-in provider, your rating, whether you worked with it, the text and the optional name you chose to show. Everyone can read the review; the account code is never shown. You can change or delete your review at any time.</p>
      <p className="mt-2">&quot;Delete my account&quot; removes the account record, all chats started with it and all reviews written with it, straight away.</p>
    </Section>
    <Section title="Your own API key">
      <p className="mt-2">Instead of the free allowance, you can use your own Anthropic API key. It is stored only in your browser: until you close the tab, or on this device if you tick &quot;Remember on this device&quot;. It is sent with each of your messages to our server, which passes it to Anthropic for that one answer. We never save it or write it to a log. Anthropic bills the answers to your Anthropic account, under your agreement with them. Your chats are saved as described above.</p>
    </Section>
    <Section title="Who processes it">
      <p className="mt-2">Your messages are sent to Anthropic PBC in the United States, which generates the answers with its AI model Claude. The site runs on Vercel, which handles every page request and stores the chats, account records and reviews in a private store in Frankfurt. Sign-in goes through Google (Google Ireland Limited) or Microsoft (Microsoft Ireland Operations Limited), depending on the button you choose.</p>
    </Section>
    <Section title="Videos">
      <p className="mt-2">The start page shows films by robot makers that are hosted on YouTube. Until you press play, only a preview picture stored on our own server is shown and nothing is loaded from YouTube. When you press play, the film loads from youtube-nocookie.com, and Google Ireland Limited receives your IP address and the usual browser data. YouTube&apos;s own privacy policy applies to that film (Art. 6(1)(a) GDPR, by pressing play). The film behind the opening of the start page is stored on our own server.</p>
    </Section>
    <Section title="Legal basis and your rights">
      <p className="mt-2">We process chats because you choose to send them and to run and improve this service (Art. 6(1)(b) and (f) GDPR). You can ask for access, correction, deletion or restriction, object to the processing, and complain to a data protection authority.</p>
    </Section>
    <Section title="This browser">
      <p className="mt-2">The site keeps your comparison and your plan in this browser only. The chat remembers the current conversation until you close the tab. If you sign in, a sign-in cookie is set; if you use your own key, it is kept in this browser as described above. If you use the language switch at the top, a cookie remembers your choice for a year, so that links open in that language. These are needed for the service you asked for, so no consent banner is shown for them.</p>
    </Section>
  </>;
}

function German() {
  return <>
    <Section title="Wer verantwortlich ist">
      <p className="mt-2">{LEGAL_READY ? address : <>Der im <Link href="/impressum" className="underline underline-offset-4">Impressum</Link> genannte Betreiber.</>}</p>
      {mail ? <p className="mt-2">E-Mail: {mail}</p> : null}
    </Section>
    <Section title="Der Chat">
      <p className="mt-2">Wenn Sie den Chat nutzen, speichern wir, was Sie eingeben, und die Antwort, die Sie erhalten, mit dem Zeitpunkt und den angezeigten Robotern. Der Betreiber dieser Website liest diese Chats, um die Website und die Daten zu verbessern. Bitte geben Sie keine persönlichen Daten ein, etwa Namen, Telefonnummern oder Betriebsgeheimnisse.</p>
      <p className="mt-2">Um das Tageslimit durchzusetzen, speichern wir bis zu zwei Tage lang einen Code, der aus Ihrer IP-Adresse und Ihrem Browser berechnet wird. Er ändert sich jeden Tag, und Ihre Adresse selbst speichern wir nicht. Er kann Sie daher nicht von einem Tag zum nächsten verfolgen, und er wird nicht mit Ihrem Chat gespeichert.</p>
      <p className="mt-2">Wenn Sie Ihr Unternehmen nennen, kann der Berater es im öffentlichen Internet nachschlagen, um Ihre Arbeit zu verstehen. Die Suche läuft über Anthropic, und was sie findet, erscheint unter „Ihr Projekt“, wo Sie es korrigieren können. Gesucht werden Unternehmen, keine Privatpersonen.</p>
      <p className="mt-2">Wenn Sie die Mikrofon-Taste nutzen, wandelt Ihr Browser Ihre Sprache mit seinem eigenen Spracherkennungsdienst in Text um. In Chrome betreibt ihn Google, in Safari Apple. Ihre Stimme erhalten wir nie, nur den Text, den Sie senden.</p>
      <p className="mt-2">Gespeicherte Chats werden nach sechs Monaten gelöscht. Wenn Sie angemeldet sind, löscht „Mein Konto löschen“ im Kontomenü Ihre Chats sofort. Andernfalls schreiben Sie uns und nennen Sie, wann der Chat stattfand und worum es ging.</p>
    </Section>
    <Section title="Anmeldung">
      <p className="mt-2">Die Roboterseiten, der Vergleich und alles andere sind kostenlos und ohne Konto nutzbar. Nur der Berater und das Schreiben einer Bewertung brauchen ein Konto: Jede Antwort des Beraters kostet Geld, und eine Bewertung soll von einem echten Konto stammen. Sie melden sich mit Google oder Microsoft an. Diese bestätigen uns, dass Sie sich angemeldet haben, und übermitteln Ihre E-Mail-Adresse.</p>
      <p className="mt-2">Wir speichern einen Code, der aus der Kontonummer Ihres Google- oder Microsoft-Kontos und einem Geheimwert gebildet wird, sodass er nicht zeigt, wer Sie sind; wie viele kostenlose Beratungen Sie in jedem Monat begonnen haben; und welche Chats Ihnen gehören. Ihren Namen und Ihre E-Mail-Adresse speichern wir nicht. Ihre E-Mail-Adresse liegt nur im Anmelde-Cookie in Ihrem Browser, damit das Kontomenü zeigen kann, mit welchem Konto Sie angemeldet sind. Das Cookie gilt 30 Tage oder bis Sie sich abmelden.</p>
      <p className="mt-2">Wenn Sie eine Bewertung zu einem Roboter oder einem Unternehmen schreiben, speichern wir sie mit demselben Kontocode, dem Anmeldedienst, Ihrer Wertung, der Angabe, ob Sie damit gearbeitet haben, dem Text und dem freiwilligen Namen, den Sie zur Anzeige gewählt haben. Alle können die Bewertung lesen; der Kontocode wird nie angezeigt. Sie können Ihre Bewertung jederzeit ändern oder löschen.</p>
      <p className="mt-2">„Mein Konto löschen“ entfernt sofort den Kontodatensatz, alle damit begonnenen Chats und alle damit geschriebenen Bewertungen.</p>
    </Section>
    <Section title="Ihr eigener API-Schlüssel">
      <p className="mt-2">Statt des kostenlosen Kontingents können Sie Ihren eigenen Anthropic-API-Schlüssel nutzen. Er wird nur in Ihrem Browser gespeichert: bis Sie den Tab schließen oder, wenn Sie „Auf diesem Gerät merken“ ankreuzen, auf diesem Gerät. Er geht mit jeder Ihrer Nachrichten an unseren Server, der ihn für diese eine Antwort an Anthropic weitergibt. Wir speichern ihn nie und schreiben ihn in kein Protokoll. Anthropic rechnet die Antworten über Ihr Anthropic-Konto ab, nach Ihrer Vereinbarung mit Anthropic. Ihre Chats werden wie oben beschrieben gespeichert.</p>
    </Section>
    <Section title="Wer die Daten verarbeitet">
      <p className="mt-2">Ihre Nachrichten werden an Anthropic PBC in den Vereinigten Staaten gesendet, die die Antworten mit ihrem KI-Modell Claude erzeugt. Die Website läuft bei Vercel, das jeden Seitenaufruf bearbeitet und die Chats, Kontodatensätze und Bewertungen in einem privaten Speicher in Frankfurt ablegt. Die Anmeldung läuft über Google (Google Ireland Limited) oder Microsoft (Microsoft Ireland Operations Limited), je nachdem, welche Schaltfläche Sie wählen.</p>
    </Section>
    <Section title="Videos">
      <p className="mt-2">Die Startseite zeigt Filme von Roboterherstellern, die bei YouTube liegen. Bis Sie auf Abspielen drücken, sehen Sie nur ein Vorschaubild von unserem eigenen Server, und von YouTube wird nichts geladen. Wenn Sie auf Abspielen drücken, lädt der Film von youtube-nocookie.com, und Google Ireland Limited erhält Ihre IP-Adresse und die üblichen Browserdaten. Für diesen Film gilt die Datenschutzerklärung von YouTube (Art. 6 Abs. 1 lit. a DSGVO, durch Drücken auf Abspielen). Der Film im Einstieg der Startseite liegt auf unserem eigenen Server.</p>
    </Section>
    <Section title="Rechtsgrundlage und Ihre Rechte">
      <p className="mt-2">Wir verarbeiten Chats, weil Sie sie senden möchten, und um diesen Dienst zu betreiben und zu verbessern (Art. 6 Abs. 1 lit. b und f DSGVO). Sie können Auskunft, Berichtigung, Löschung oder Einschränkung verlangen, der Verarbeitung widersprechen und sich bei einer Datenschutz-Aufsichtsbehörde beschweren.</p>
    </Section>
    <Section title="Dieser Browser">
      <p className="mt-2">Die Website speichert Ihren Vergleich und Ihren Plan nur in diesem Browser. Der Chat merkt sich das aktuelle Gespräch, bis Sie den Tab schließen. Wenn Sie sich anmelden, wird ein Anmelde-Cookie gesetzt; wenn Sie Ihren eigenen Schlüssel nutzen, bleibt er wie oben beschrieben in diesem Browser. Wenn Sie oben die Sprache umschalten, merkt sich ein Cookie Ihre Wahl für ein Jahr, damit Links in dieser Sprache öffnen. Diese Speicherungen sind für den Dienst nötig, den Sie angefordert haben. Deshalb wird für sie kein Einwilligungsbanner angezeigt.</p>
    </Section>
  </>;
}

const BODY: Record<Lang, () => ReactNode> = { en: English, de: German };

export default async function PrivacyPage({ params }: { params: Params }) {
  const lang = await pageLang(params);
  const Body = BODY[lang];
  return <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
    <h1 className="text-3xl font-semibold tracking-tight">{META[lang].title}</h1>
    <div className="mt-6 space-y-8 leading-relaxed text-muted">
      <Body />
    </div>
  </main>;
}
