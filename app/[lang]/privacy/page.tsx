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

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return <section>
    <h2 className="font-semibold text-foreground">{n}. {title}</h2>
    <div className="mt-2 space-y-2">{children}</div>
  </section>;
}

const mail = SITE.email ? <a href={'mailto:' + SITE.email} className="underline underline-offset-4">{SITE.email}</a> : null;
const address = <>{SITE.operator}, {SITE.street}, {SITE.city}, {SITE.country}</>;
const box = 'rounded-lg border border-edge p-3 text-foreground';

// Describes what the code really does: lib/chat/store.ts, app/api/chat/route.ts, lib/auth/*, lib/chat/accounts.ts,
// lib/reviews/visitor.ts, proxy.ts (language cookie). Change them together, and change both languages together:
// the German text says the same as the English, sentence by sentence. A lawyer should read both.
function English() {
  return <>
    <p>Last updated: 20 November 2026. This page explains which personal data sitebots.org processes, why, and what rights you have. The site uses no analytics, no advertising and no tracking cookies.</p>

    <Section n={1} title="Who is responsible">
      <p>{LEGAL_READY ? address : <>The operator named in the <Link href="/impressum" className="underline underline-offset-4">Impressum</Link></>}.{mail ? <> Email: {mail}</> : null}</p>
      <p>There is no data protection officer, because the law does not require one for this site. Please send any privacy question to the address above.</p>
    </Section>

    <Section n={2} title="Visiting the website">
      <p>The site is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. For every page request Vercel processes your IP address, the page requested, the time, your browser and operating system, and the referring page, in short-lived server logs. This is needed to deliver the page and to protect it from attacks and overload.</p>
      <p>Legal basis: Art. 6(1)(f) GDPR, our interest in running the site safely. Vercel acts as our processor under a data processing agreement. Logs are kept for a short time by Vercel and then deleted.</p>
      <p>Fonts and almost all pictures are served from our own server. Nothing is loaded from Google Fonts or other font services.</p>
    </Section>

    <Section n={3} title="Cookies and storage in your browser">
      <p>We only use what the service needs. No consent banner is shown for these, because they are strictly necessary for a service you asked for (§ 25(2) no. 2 TDDDG):</p>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>sitebots_session</strong>: the sign-in cookie. It holds a sealed code for your account and your email address, so the account menu can show which account you used. It lasts 30 days, or until you sign out.</li>
        <li><strong>sitebots_oauth</strong>: protects the sign-in with Google for a few minutes and is deleted afterwards.</li>
        <li><strong>sitebots-lang</strong>: remembers the language you chose with the switch at the top, for one year.</li>
        <li>Local storage in your browser: your comparison list, your plan, a display setting of the 3D viewer, the current chat until you close the tab, and your own API key if you enter one. This stays on your device and is not sent to us, except the key as described in section 6.</li>
      </ul>
    </Section>

    <Section n={4} title="Signing in with Google">
      <p>The robot pages, the comparison and everything else are free and need no account. Only the adviser and writing a review need one. You sign in with Google (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland). Google confirms that you signed in and sends us your email address and a Google account number.</p>
      <p>We store a code made from your Google account number and a secret, so it does not show who you are; how many free consultations you started each month; and which chats are yours. We do not store your name or your email address on our server.</p>
      <p>Legal basis: Art. 6(1)(b) GDPR, the service you asked for. The account record is kept until you delete your account with &quot;Delete my account&quot; in the account menu.</p>
    </Section>

    <Section n={5} title="The AI adviser">
      <p>The adviser is an AI. Its answers are written by the model Claude of Anthropic PBC, 548 Market Street, PMB 90375, San Francisco, CA 94104, USA, which processes your messages as our processor. When you use it, we save what you type, the answer, the time and which robots were shown. The operator reads these chats to improve the site and the data. Please do not type personal details such as names, phone numbers or company secrets.</p>
      <p>If you name your company, the adviser may look it up on the public web to understand your work. The search runs through Anthropic and the result shows in your brief, where you can correct it. It looks up companies, not private people.</p>
      <p>To enforce the daily limit we keep a code calculated from your IP address and browser for up to two days. It changes every day, your address itself is not stored, and the code is not saved with your chat.</p>
      <p>If you use the microphone button, your browser turns your speech into text with its own speech service (in Chrome run by Google, in Safari by Apple). We only receive the text you send.</p>
      <p>The adviser gives suggestions only. It makes no decisions about you with legal or similar effect (Art. 22 GDPR).</p>
      <p>Legal basis: Art. 6(1)(b) GDPR for answering you; Art. 6(1)(f) GDPR for reading chats to improve the service and for the daily limit. Saved chats are deleted after six months, or at once with &quot;Delete my account&quot;. Without an account, write to us with the date and topic of the chat and we delete it.</p>
    </Section>

    <Section n={6} title="Your own API key">
      <p>Instead of the free allowance you can use your own Anthropic API key. It is stored only in your browser, until you close the tab or, if you tick &quot;Remember on this device&quot;, on this device. It is sent with each message to our server, which passes it to Anthropic for that one answer. We never save it and never write it to a log. Anthropic bills the answers to your Anthropic account under your agreement with them.</p>
    </Section>

    <Section n={7} title="Reviews">
      <p>If you write a review of a robot or a company, we store it with your account code, the sign-in provider, your rating, whether you say you worked with it, the text and the optional name you choose to show. Everyone can read the review; the account code is never shown. You can change or delete it at any time; it stays online until you or we delete it. &quot;Delete my account&quot; also deletes all your reviews.</p>
      <p>Legal basis: Art. 6(1)(b) GDPR.</p>
    </Section>

    <Section n={8} title="Videos">
      <p>The start page shows films by robot makers that are hosted on YouTube. Until you press play, only a preview picture from our own server is shown and nothing is loaded from YouTube. When you press play, the film loads from youtube-nocookie.com, and Google Ireland Limited receives your IP address and the usual browser data; YouTube&apos;s privacy policy applies. Legal basis: Art. 6(1)(a) GDPR, your consent by pressing play, which you can withdraw at any time for the future by not playing films. The film behind the opening of the start page is stored on our own server.</p>
    </Section>

    <Section n={9} title="Where your data goes">
      <p>Chats, account records and reviews are stored with Vercel in a private store in Frankfurt, Germany. Recipients are only the processors named above: Vercel (hosting and storage), Anthropic (adviser answers) and Google (sign-in, and YouTube when you press play).</p>
      <p>Vercel and Anthropic are US companies, so data may reach the USA. These transfers are based on the EU Standard Contractual Clauses in their data processing terms (Art. 46(2)(c) GDPR), and for companies certified under it, the EU-US Data Privacy Framework (Art. 45 GDPR). We do not sell or share your data for advertising.</p>
    </Section>

    <Section n={10} title="Your rights">
      <p>You can ask for access to your data (Art. 15 GDPR), correction (Art. 16), deletion (Art. 17), restriction (Art. 18) and a copy in a common format (Art. 20). You can withdraw a consent at any time for the future (Art. 7(3)). Write to the address in section 1.</p>
      <p className={box}><strong>Right to object (Art. 21 GDPR).</strong> Where we rely on our legitimate interest (Art. 6(1)(f) GDPR), you can object at any time for reasons arising from your situation. We then stop, unless we show compelling reasons that outweigh your interests.</p>
      <p>You can also complain to a data protection authority, for example the Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW), Kavalleriestraße 2–4, 40213 Düsseldorf.</p>
      <p>You do not have to give us any data to read the site. Without signing in you cannot use the adviser or write reviews.</p>
    </Section>
  </>;
}

function German() {
  return <>
    <p>Stand: 20. November 2026. Diese Seite erklärt, welche personenbezogenen Daten sitebots.org verarbeitet, warum, und welche Rechte Sie haben. Die Website nutzt keine Analyse-Tools, keine Werbung und keine Tracking-Cookies.</p>

    <Section n={1} title="Verantwortlicher">
      <p>{LEGAL_READY ? address : <>Der im <Link href="/impressum" className="underline underline-offset-4">Impressum</Link> genannte Betreiber</>}.{mail ? <> E-Mail: {mail}</> : null}</p>
      <p>Einen Datenschutzbeauftragten gibt es nicht, weil das Gesetz ihn für diese Website nicht verlangt. Fragen zum Datenschutz richten Sie bitte an die oben genannte Adresse.</p>
    </Section>

    <Section n={2} title="Besuch der Website">
      <p>Die Website wird von Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA, gehostet. Bei jedem Seitenaufruf verarbeitet Vercel Ihre IP-Adresse, die aufgerufene Seite, die Uhrzeit, Ihren Browser und Ihr Betriebssystem sowie die verweisende Seite in kurzlebigen Server-Protokollen. Das ist nötig, um die Seite auszuliefern und sie vor Angriffen und Überlastung zu schützen.</p>
      <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO, unser Interesse an einem sicheren Betrieb. Vercel ist unser Auftragsverarbeiter nach einem Auftragsverarbeitungsvertrag. Die Protokolle werden von Vercel kurz aufbewahrt und dann gelöscht.</p>
      <p>Schriften und fast alle Bilder kommen von unserem eigenen Server. Von Google Fonts oder anderen Schriftdiensten wird nichts geladen.</p>
    </Section>

    <Section n={3} title="Cookies und Speicher in Ihrem Browser">
      <p>Wir nutzen nur, was der Dienst braucht. Dafür wird kein Einwilligungsbanner angezeigt, weil es für einen von Ihnen gewünschten Dienst unbedingt erforderlich ist (§ 25 Abs. 2 Nr. 2 TDDDG):</p>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>sitebots_session</strong>: das Anmelde-Cookie. Es enthält einen versiegelten Code für Ihr Konto und Ihre E-Mail-Adresse, damit das Kontomenü zeigen kann, mit welchem Konto Sie angemeldet sind. Es gilt 30 Tage oder bis Sie sich abmelden.</li>
        <li><strong>sitebots_oauth</strong>: schützt die Anmeldung mit Google für wenige Minuten und wird danach gelöscht.</li>
        <li><strong>sitebots-lang</strong>: merkt sich ein Jahr lang die Sprache, die Sie oben mit dem Schalter gewählt haben.</li>
        <li>Lokaler Speicher in Ihrem Browser: Ihre Vergleichsliste, Ihr Plan, eine Anzeigeeinstellung des 3D-Viewers, der aktuelle Chat bis Sie den Tab schließen, und Ihr eigener API-Schlüssel, wenn Sie einen eingeben. Das bleibt auf Ihrem Gerät und wird nicht an uns gesendet, außer dem Schlüssel wie in Abschnitt 6 beschrieben.</li>
      </ul>
    </Section>

    <Section n={4} title="Anmeldung mit Google">
      <p>Die Roboterseiten, der Vergleich und alles andere sind kostenlos und ohne Konto nutzbar. Nur der Berater und das Schreiben einer Bewertung brauchen ein Konto. Sie melden sich mit Google an (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Google bestätigt, dass Sie sich angemeldet haben, und übermittelt uns Ihre E-Mail-Adresse und eine Google-Kontonummer.</p>
      <p>Wir speichern einen Code, der aus Ihrer Google-Kontonummer und einem Geheimwert gebildet wird, sodass er nicht zeigt, wer Sie sind; wie viele kostenlose Beratungen Sie in jedem Monat begonnen haben; und welche Chats Ihnen gehören. Ihren Namen und Ihre E-Mail-Adresse speichern wir nicht auf unserem Server.</p>
      <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO, der Dienst, den Sie angefordert haben. Der Kontodatensatz bleibt gespeichert, bis Sie Ihr Konto mit „Mein Konto löschen“ im Kontomenü löschen.</p>
    </Section>

    <Section n={5} title="Der KI-Berater">
      <p>Der Berater ist eine KI. Seine Antworten schreibt das Modell Claude der Anthropic PBC, 548 Market Street, PMB 90375, San Francisco, CA 94104, USA, die Ihre Nachrichten als unser Auftragsverarbeiter verarbeitet. Wenn Sie ihn nutzen, speichern wir, was Sie eingeben, die Antwort, den Zeitpunkt und die angezeigten Roboter. Der Betreiber liest diese Chats, um die Website und die Daten zu verbessern. Bitte geben Sie keine persönlichen Daten ein, etwa Namen, Telefonnummern oder Betriebsgeheimnisse.</p>
      <p>Wenn Sie Ihr Unternehmen nennen, kann der Berater es im öffentlichen Internet nachschlagen, um Ihre Arbeit zu verstehen. Die Suche läuft über Anthropic, und das Ergebnis erscheint unter „Ihr Projekt“, wo Sie es korrigieren können. Gesucht werden Unternehmen, keine Privatpersonen.</p>
      <p>Um das Tageslimit durchzusetzen, speichern wir bis zu zwei Tage lang einen Code, der aus Ihrer IP-Adresse und Ihrem Browser berechnet wird. Er ändert sich jeden Tag, Ihre Adresse selbst wird nicht gespeichert, und der Code wird nicht mit Ihrem Chat gespeichert.</p>
      <p>Wenn Sie die Mikrofon-Taste nutzen, wandelt Ihr Browser Ihre Sprache mit seinem eigenen Spracherkennungsdienst in Text um (in Chrome betrieben von Google, in Safari von Apple). Wir erhalten nur den Text, den Sie senden.</p>
      <p>Der Berater macht nur Vorschläge. Er trifft keine Entscheidungen über Sie mit rechtlicher oder ähnlicher Wirkung (Art. 22 DSGVO).</p>
      <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO für die Beantwortung; Art. 6 Abs. 1 lit. f DSGVO für das Lesen der Chats zur Verbesserung des Dienstes und für das Tageslimit. Gespeicherte Chats werden nach sechs Monaten gelöscht oder sofort mit „Mein Konto löschen“. Ohne Konto schreiben Sie uns Datum und Thema des Chats, dann löschen wir ihn.</p>
    </Section>

    <Section n={6} title="Ihr eigener API-Schlüssel">
      <p>Statt des kostenlosen Kontingents können Sie Ihren eigenen Anthropic-API-Schlüssel nutzen. Er wird nur in Ihrem Browser gespeichert, bis Sie den Tab schließen oder, wenn Sie „Auf diesem Gerät merken“ ankreuzen, auf diesem Gerät. Er geht mit jeder Nachricht an unseren Server, der ihn für diese eine Antwort an Anthropic weitergibt. Wir speichern ihn nie und schreiben ihn in kein Protokoll. Anthropic rechnet die Antworten über Ihr Anthropic-Konto ab, nach Ihrer Vereinbarung mit Anthropic.</p>
    </Section>

    <Section n={7} title="Bewertungen">
      <p>Wenn Sie eine Bewertung zu einem Roboter oder einem Unternehmen schreiben, speichern wir sie mit Ihrem Kontocode, dem Anmeldedienst, Ihrer Wertung, Ihrer Angabe, ob Sie damit gearbeitet haben, dem Text und dem freiwilligen Namen, den Sie zur Anzeige wählen. Alle können die Bewertung lesen; der Kontocode wird nie angezeigt. Sie können sie jederzeit ändern oder löschen; sie bleibt online, bis Sie oder wir sie löschen. „Mein Konto löschen“ löscht auch alle Ihre Bewertungen.</p>
      <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
    </Section>

    <Section n={8} title="Videos">
      <p>Die Startseite zeigt Filme von Roboterherstellern, die bei YouTube liegen. Bis Sie auf Abspielen drücken, sehen Sie nur ein Vorschaubild von unserem eigenen Server, und von YouTube wird nichts geladen. Wenn Sie auf Abspielen drücken, lädt der Film von youtube-nocookie.com, und Google Ireland Limited erhält Ihre IP-Adresse und die üblichen Browserdaten; es gilt die Datenschutzerklärung von YouTube. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, Ihre Einwilligung durch Drücken auf Abspielen, die Sie jederzeit für die Zukunft widerrufen können, indem Sie keine Filme mehr abspielen. Der Film im Einstieg der Startseite liegt auf unserem eigenen Server.</p>
    </Section>

    <Section n={9} title="Wohin Ihre Daten gehen">
      <p>Chats, Kontodatensätze und Bewertungen werden bei Vercel in einem privaten Speicher in Frankfurt am Main gespeichert. Empfänger sind nur die oben genannten Auftragsverarbeiter: Vercel (Hosting und Speicher), Anthropic (Antworten des Beraters) und Google (Anmeldung sowie YouTube, wenn Sie auf Abspielen drücken).</p>
      <p>Vercel und Anthropic sind US-Unternehmen, daher können Daten in die USA gelangen. Diese Übermittlungen stützen sich auf die EU-Standardvertragsklauseln in deren Datenverarbeitungsbedingungen (Art. 46 Abs. 2 lit. c DSGVO) und, bei danach zertifizierten Unternehmen, auf das EU-US Data Privacy Framework (Art. 45 DSGVO). Wir verkaufen Ihre Daten nicht und geben sie nicht für Werbung weiter.</p>
    </Section>

    <Section n={10} title="Ihre Rechte">
      <p>Sie können Auskunft über Ihre Daten verlangen (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18) und eine Kopie in einem gängigen Format (Art. 20). Eine Einwilligung können Sie jederzeit für die Zukunft widerrufen (Art. 7 Abs. 3). Schreiben Sie an die Adresse in Abschnitt 1.</p>
      <p className={box}><strong>Widerspruchsrecht (Art. 21 DSGVO).</strong> Soweit wir uns auf unser berechtigtes Interesse stützen (Art. 6 Abs. 1 lit. f DSGVO), können Sie jederzeit aus Gründen, die sich aus Ihrer besonderen Situation ergeben, widersprechen. Wir hören dann auf, es sei denn, wir weisen zwingende Gründe nach, die Ihre Interessen überwiegen.</p>
      <p>Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW), Kavalleriestraße 2–4, 40213 Düsseldorf.</p>
      <p>Um die Website zu lesen, müssen Sie uns keine Daten geben. Ohne Anmeldung können Sie den Berater nicht nutzen und keine Bewertungen schreiben.</p>
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
