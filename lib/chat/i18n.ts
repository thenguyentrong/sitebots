// The adviser answers in the person's language, so the labels around its answer must follow it. A German
// answer inside English cards reads like two products glued together.
export type Lang = 'en' | 'de';

/** What the visitor's browser speaks is the best first guess, and the switch on the box overrides it. */
export const browserLang = (language: string): Lang => language.toLowerCase().startsWith('de') ? 'de' : 'en';

/** Marks tap answers from a reply line, which ask nothing the message did not already ask. */
export const REPLY_KEY = 'reply';

export const TEXT = {
  en: {
    title: 'Which robot makes sense for your job?', lead: 'Ask an independent construction and robotics expert. No sales pitch, just honest options.',
    starters: ['Carry boards on a building site', 'A humanoid for my prefab plant', 'Drill ceiling anchors', 'Inspect a site with a robot dog'],
    hints: ['We lift 20 kg boards in a timber hall, which robot makes sense?', 'We are a prefab company near Aachen, where should we start?', 'I want a humanoid for my prefab plant'],
    robots: 'Robots', compare2: 'Compare', privacy: 'Privacy', describe: 'Describe your job', ask: 'Ask', language: 'Language',
    errors: {
      daily_limit: 'You have reached today\'s limit of questions. Please come back tomorrow.', conversation_limit: 'This chat is full. Start a new chat to go on.',
      busy: 'A lot of people are asking right now. Please try again in a minute.', paused: 'The adviser is paused for now. Please come back on the 1st of next month.',
      closed: 'The adviser is not open yet. Please come back soon.', invalid: 'Please shorten your message and try again.', failed: 'Something went wrong on our side. Please try again.',
    } as Record<string, string>,
    suggestion: 'Everything here is a suggestion. Confirm details with the seller.',
    reply: 'Reply to the adviser', brief: 'Your brief', briefHint: 'What I understood so far. Tell me if something is wrong.',
    shortlist: 'Still in the running', stillOpen: 'Still open', notImportant: 'Not important to you', myGuess: 'my guess, correct me', pdf: 'Export as PDF', pdfExport: 'Export result as PDF',
    compare: 'Compare specs', details: 'Full details', pros: 'Pros', cons: 'Cons', confirm: 'Confirm with the seller', buy: 'Where to buy',
    noSeller: 'No seller for Germany is listed.', proof: 'Proof', whyNot: 'Why others are not on this list', send: 'Send answers', notSure: 'Not sure',
    speak: 'Speak instead of typing', listening: 'Listening, just talk...', reading: 'Reading your message', checks: (n: number) => 'Done ' + n + (n === 1 ? ' check' : ' checks'), newChat: 'New chat', facts: (n: number) => 'Your brief (' + n + ')',
    report: 'Robot consultation', prepared: 'Prepared by the sitebots adviser on', project: 'Your project', options: 'Options at a glance', germany: 'Germany', price: 'Price', ourSuggestion: 'Our suggestion', option: 'Option', why: 'Why this one', noOptions: 'No options were given in this chat yet.',
    leftOut: 'Left out, and why', checked: 'What was checked', conversation: 'The full conversation', you: 'You', adviser: 'Adviser', record: 'Full record and sources',
    assumed: '(assumed, please confirm)', notice: 'This is a consultation result, not an offer. Everything here is a suggestion. Confirm every detail with the seller before you decide.',
    noticeEnd: 'Prices, availability and specifications can change. For any information on a robot, please contact the seller.', footer: 'Suggestion only. Confirm details with the seller.',
  },
  de: {
    title: 'Welcher Roboter passt zu Ihrer Arbeit?', lead: 'Fragen Sie einen unabhängigen Experten für Bau und Robotik. Kein Verkaufsgespräch, nur ehrliche Optionen.',
    starters: ['Platten auf der Baustelle tragen', 'Ein Humanoider für mein Fertigteilwerk', 'Deckenanker bohren', 'Baustelle mit einem Roboterhund prüfen'],
    hints: ['Wir heben 20 kg schwere Platten in einer Holzbauhalle, welcher Roboter passt?', 'Wir sind ein Fertighaus-Betrieb bei Aachen, wo fangen wir an?', 'Wir suchen einen Roboter für Trockenbau'],
    robots: 'Roboter', compare2: 'Vergleich', privacy: 'Datenschutz', describe: 'Beschreiben Sie Ihre Arbeit', ask: 'Fragen', language: 'Sprache',
    errors: {
      daily_limit: 'Sie haben das Tageslimit erreicht. Bitte kommen Sie morgen wieder.', conversation_limit: 'Dieser Chat ist voll. Bitte starten Sie einen neuen Chat.',
      busy: 'Gerade fragen sehr viele Menschen. Bitte versuchen Sie es in einer Minute noch einmal.', paused: 'Der Berater pausiert gerade. Bitte kommen Sie am 1. des nächsten Monats wieder.',
      closed: 'Der Berater ist noch nicht geöffnet. Bitte kommen Sie bald wieder.', invalid: 'Bitte kürzen Sie Ihre Nachricht und versuchen Sie es noch einmal.', failed: 'Bei uns ist etwas schiefgegangen. Bitte versuchen Sie es noch einmal.',
    } as Record<string, string>,
    suggestion: 'Alles hier ist ein Vorschlag. Bitte alle Details mit dem Verkäufer bestätigen.',
    reply: 'Dem Berater antworten', brief: 'Ihr Projekt', briefHint: 'Das habe ich bisher verstanden. Sagen Sie mir, wenn etwas nicht stimmt.',
    shortlist: 'Noch im Rennen', stillOpen: 'Noch offen', notImportant: 'Für Sie nicht wichtig', myGuess: 'meine Annahme, bitte korrigieren', pdf: 'Als PDF exportieren', pdfExport: 'Ergebnis als PDF exportieren',
    compare: 'Daten vergleichen', details: 'Alle Details', pros: 'Vorteile', cons: 'Nachteile', confirm: 'Mit dem Verkäufer klären', buy: 'Wo kaufen',
    noSeller: 'Kein Verkäufer für Deutschland bekannt.', proof: 'Nachweis', whyNot: 'Warum andere nicht auf der Liste sind', send: 'Antworten senden', notSure: 'Weiß nicht',
    speak: 'Sprechen statt tippen', listening: 'Ich höre zu, sprechen Sie einfach...', reading: 'Lese Ihre Nachricht', checks: (n: number) => n + (n === 1 ? ' Prüfung' : ' Prüfungen') + ' erledigt', newChat: 'Neuer Chat', facts: (n: number) => 'Ihr Projekt (' + n + ')',
    report: 'Roboter-Beratung', prepared: 'Erstellt vom sitebots-Berater am', project: 'Ihr Projekt', options: 'Optionen im Überblick', germany: 'Deutschland', price: 'Preis', ourSuggestion: 'Unser Vorschlag', option: 'Option', why: 'Warum diese Option', noOptions: 'In diesem Chat wurden noch keine Optionen genannt.',
    leftOut: 'Nicht aufgenommen, und warum', checked: 'Was geprüft wurde', conversation: 'Das ganze Gespräch', you: 'Sie', adviser: 'Berater', record: 'Datensatz und Quellen',
    assumed: '(Annahme, bitte bestätigen)', notice: 'Dies ist ein Beratungsergebnis, kein Angebot. Alles hier ist ein Vorschlag. Bitte klären Sie jedes Detail mit dem Verkäufer, bevor Sie entscheiden.',
    noticeEnd: 'Preise, Verfügbarkeit und technische Daten können sich ändern. Für alle Informationen zu einem Roboter wenden Sie sich bitte an den Verkäufer.', footer: 'Nur ein Vorschlag. Details bitte mit dem Verkäufer klären.',
  },
} as const;

/** The language of a chat, from what the person wrote. The server needs it before the model has said
 *  anything, so the steps it reports match the answer that follows. */
export function guessLang(text: string, fallback: Lang = 'en'): Lang {
  const german = text.match(/[äöüß]|\b(ich|wir|der|die|das|und|für|ein|eine|einen|nicht|mit|auf|ist|sind|auf|von|zu|den|dem|roboter|baustelle)\b/gi)?.length ?? 0;
  const english = text.match(/\b(i|we|the|and|for|a|an|not|with|on|is|are|of|to|my|our|robot|site)\b/gi)?.length ?? 0;
  return german === english ? fallback : german > english ? 'de' : 'en';
}

/** What the adviser is busy with right now, by tool. */
export const WORK_TEXT = {
  en: { thinking: 'Thinking it through', update_brief: 'Updating your brief', ask_questions: 'Getting a question ready', search_robots: 'Looking through the robots', get_robot: 'Reading a robot record', find_jobs: 'Looking up the job', robots_for_job: 'Checking which robots fit', explore_graph: 'Following the links', site_facts: 'Checking rules and costs', web_search: 'Searching the web', show_options: 'Writing up your options', offer_report: 'Preparing your export' },
  de: { thinking: 'Denke nach', update_brief: 'Aktualisiere Ihr Projekt', ask_questions: 'Bereite eine Frage vor', search_robots: 'Suche in den Robotern', get_robot: 'Lese einen Roboter-Datensatz', find_jobs: 'Suche die Aufgabe', robots_for_job: 'Prüfe, welche Roboter passen', explore_graph: 'Folge den Verbindungen', site_facts: 'Prüfe Regeln und Kosten', web_search: 'Suche im Internet', show_options: 'Schreibe Ihre Optionen auf', offer_report: 'Bereite den Export vor' },
} as const;

/** One finished lookup, in words the person can follow. It also goes into the export. */
export const STEP_TEXT = {
  en: {
    types: { humanoid: 'humanoids', quadruped: 'robot dogs', mobile_manipulator: 'mobile robots', specialised: 'job-specific robots' }, all: 'all robots',
    carry: (kg: number) => 'carrying ' + kg + ' kg or more', arm: (kg: number) => kg + ' kg or more per arm', outdoor: 'for outdoors', stairs: 'that climb stairs', hands: 'with hands', orderable: 'orderable in Germany', upTo: (eur: number) => 'up to ' + eur + ' EUR',
    searched: (what: string, found: number) => 'Searched ' + what + ': ' + found + ' found', read: (name: string) => 'Read the record of ' + name, job: (query: string) => 'Looked up the job: ' + query,
    fit: (job: string, found: number) => 'Checked ' + job + ': ' + found + (found === 1 ? ' robot' : ' robots') + ' to order', links: (from: string) => 'Followed the links from ' + from, web: (query: string) => 'Searched the web: ' + query,
    facts: { rules: 'Checked the rules', costs: 'Checked pilot costs', labour_cost: 'Checked labour costs', humanoid_limits: 'Checked known humanoid limits', pilot_metrics: 'Checked pilot metrics', questions_for_sellers: 'Checked questions for sellers', roadmap: 'Checked a rollout plan', partners: 'Checked partners' },
  },
  de: {
    types: { humanoid: 'Humanoide', quadruped: 'Roboterhunde', mobile_manipulator: 'mobile Roboter', specialised: 'Spezialroboter' }, all: 'alle Roboter',
    carry: (kg: number) => 'ab ' + kg + ' kg Traglast', arm: (kg: number) => 'ab ' + kg + ' kg pro Arm', outdoor: 'für draußen', stairs: 'treppengängig', hands: 'mit Händen', orderable: 'in Deutschland bestellbar', upTo: (eur: number) => 'bis ' + eur + ' EUR',
    searched: (what: string, found: number) => what + ' gesucht: ' + found + ' gefunden', read: (name: string) => 'Datensatz von ' + name + ' gelesen', job: (query: string) => 'Aufgabe nachgeschlagen: ' + query,
    fit: (job: string, found: number) => job + ' geprüft: ' + found + ' bestellbar', links: (from: string) => 'Verbindungen von ' + from + ' verfolgt', web: (query: string) => 'Im Internet gesucht: ' + query,
    facts: { rules: 'Regeln geprüft', costs: 'Pilotkosten geprüft', labour_cost: 'Lohnkosten geprüft', humanoid_limits: 'Grenzen von Humanoiden geprüft', pilot_metrics: 'Pilot-Kennzahlen geprüft', questions_for_sellers: 'Fragen an Verkäufer geprüft', roadmap: 'Einführungsplan geprüft', partners: 'Partner geprüft' },
  },
} as const;

export const STATUS_TEXT = {
  en: { buy_now: 'Buy in Germany', quote: 'Order on request', preorder: 'Pre-order only', not_sold: 'Not sold in Germany' },
  de: { buy_now: 'In Deutschland kaufbar', quote: 'Auf Anfrage bestellbar', preorder: 'Nur Vorbestellung', not_sold: 'In Deutschland nicht im Verkauf' },
} as const;

export const TYPE_TEXT = {
  en: { humanoid: 'Humanoid', quadruped: 'Robot dog', mobile_manipulator: 'Mobile manipulator', specialised: 'Job-specific robot' },
  de: { humanoid: 'Humanoid', quadruped: 'Roboterhund', mobile_manipulator: 'Mobiler Manipulator', specialised: 'Spezialroboter' },
} as const;

export const PROOF_TEXT = {
  en: { deployment: 'In daily use at a named customer', pilot: 'Tested in a pilot', demo: 'Shown in a demo', none: null },
  de: { deployment: 'Im täglichen Einsatz bei einem Kunden', pilot: 'In einem Pilotprojekt getestet', demo: 'In einer Demo gezeigt', none: null },
} as const;

export const SPEC_TEXT = {
  en: { arm: 'Payload per arm', carry: 'Carries', runtime: 'Runtime', ip: 'Protection', moves: 'Moves on', request: 'Price on request', abroad: 'outside Germany' },
  de: { arm: 'Traglast pro Arm', carry: 'Trägt', runtime: 'Laufzeit', ip: 'Schutzart', moves: 'Bewegt sich auf', request: 'Preis auf Anfrage', abroad: 'außerhalb Deutschlands' },
} as const;
