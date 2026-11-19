import { bilingual } from './text';

/** The words every page shares: the site's claim, the footer, the language switch, loading and errors. */
export const COMMON = bilingual({
  en: {
    tagline: 'Which jobs can robots do today, and where to buy them in Germany',
    description: 'Which construction jobs robots do today, with the named projects that prove it, and which of those robots you can buy in Germany: prices, sellers and sources.',
    footer: 'Unknown stays unknown. Every value links to its source.',
    privacy: 'Privacy', impressum: 'Impressum', legal: 'Legal',
    switchLabel: 'Language', switchTo: 'Deutsch', switchHint: 'Diese Seite auf Deutsch',
    loading: 'Loading',
    notFoundTitle: 'No such page', notFoundBack: 'Back to the robots',
    errorKicker: 'Page unavailable', errorTitle: 'We couldn’t load this page.',
    errorText: 'Try again in a moment. Your saved comparison and assessments stay in this browser.',
    errorRetry: 'Try again', errorHome: 'Find a robot',
    robots: 'Robots',
    /** Free text from the robot records, which are written in English for now. */
    englishOnly: '',
  },
  de: {
    tagline: 'Welche Arbeiten Roboter heute übernehmen und wo Sie sie in Deutschland kaufen',
    description: 'Welche Bauarbeiten Roboter heute übernehmen, mit den Projekten, die es belegen, und welche dieser Roboter Sie in Deutschland kaufen können: Preise, Händler und Quellen.',
    footer: 'Was unbekannt ist, bleibt unbekannt. Jeder Wert verweist auf seine Quelle.',
    privacy: 'Datenschutz', impressum: 'Impressum', legal: 'Rechtliches',
    switchLabel: 'Sprache', switchTo: 'English', switchHint: 'This page in English',
    loading: 'Wird geladen',
    notFoundTitle: 'Diese Seite gibt es nicht', notFoundBack: 'Zurück zu den Robotern',
    errorKicker: 'Seite nicht verfügbar', errorTitle: 'Diese Seite ließ sich nicht laden.',
    errorText: 'Bitte versuchen Sie es gleich noch einmal. Ihr gespeicherter Vergleich und Ihre Bewertungen bleiben in diesem Browser.',
    errorRetry: 'Noch einmal versuchen', errorHome: 'Roboter finden',
    robots: 'Roboter',
    englishOnly: 'Dieser Text liegt nur auf Englisch vor.',
  },
});
