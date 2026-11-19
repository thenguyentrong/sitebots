import { bilingual } from './text';

// The words of /compare and its table. Server side; the client controls (CompareBar, CompareControls,
// SavedComparison) carry their own small blocks. The row names come from factLabel (lib/compare/facts.ts).

export const COMPARE_TEXT = bilingual({
  en: {
    title: 'Compare robots',
    heading: 'Compare',
    lead: (max: string) => `Up to ${max} robots side by side, any type. Each row shows what was published, with its conditions and source. We do not score or rank them: what fits your job is your call. If a value is missing, it says Not published.`,
    limited: (max: string, robots: string) => `Only the first ${max} of ${robots} robots are shown.`,
    unknown: (n: number, count: string) => `${count} robot${n === 1 ? '' : 's'} not found.`,
    browse: 'Browse robots',
    emptyBefore: 'Nothing to compare yet. Search for a robot above, or use the Compare button on ',
    emptyLink: 'the robots page',
    emptyAfter: ' or on any robot page.',
    fact: 'Fact',
    noPicture: 'No picture published',
    sources: 'Sources',
    allSources: 'All sources on the robot page',
  },
  de: {
    title: 'Roboter vergleichen',
    heading: 'Vergleich',
    lead: (max: string) => `Bis zu ${max} Roboter nebeneinander, jeder Typ. Jede Zeile zeigt, was veröffentlicht wurde, mit Bedingungen und Quelle. Wir vergeben keine Punkte und keine Rangfolge: Was zu Ihrer Arbeit passt, entscheiden Sie. Fehlt ein Wert, steht dort „Nicht veröffentlicht“.`,
    limited: (max: string, robots: string) => `Nur die ersten ${max} von ${robots} Robotern werden gezeigt.`,
    unknown: (_n: number, count: string) => `${count} Roboter nicht gefunden.`,
    browse: 'Roboter ansehen',
    emptyBefore: 'Noch nichts zu vergleichen. Suchen Sie oben nach einem Roboter oder nutzen Sie die Schaltfläche „Vergleichen“ in ',
    emptyLink: 'der Roboterübersicht',
    emptyAfter: ' oder auf einer Roboterseite.',
    fact: 'Merkmal',
    noPicture: 'Kein Bild veröffentlicht',
    sources: 'Quellen',
    allSources: 'Alle Quellen auf der Roboterseite',
  },
});
