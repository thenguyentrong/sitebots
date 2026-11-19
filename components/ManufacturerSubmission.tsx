'use client';

import { useState, type FormEvent } from 'react';
import { useLang } from '@/lib/i18n/client';
import { bilingual } from '@/lib/i18n/text';
import { ui } from '@/lib/ui';

// The form is in the page's language. The GitHub issue it prepares stays English, the language the
// maintainers review in, so the status values are English whatever the visitor reads.
const STATUSES = ['Commercial supplier', 'Product announced / in development', 'Unknown'] as const;

const TEXT = bilingual({
  en: {
    summary: 'Suggest a manufacturer',
    intro: 'Know a company we should include? Add its official website and robot product evidence. You’ll review and submit a public issue on GitHub; a GitHub account is required.',
    company: 'Company name', website: 'Official website', country: 'Country (optional)', status: 'Company availability',
    statuses: { 'Commercial supplier': 'Commercial supplier', 'Product announced / in development': 'Product announced / in development', Unknown: 'Unknown' } as Record<(typeof STATUSES)[number], string>,
    evidence: 'Robot products and evidence', evidenceHint: 'Robot names and links to official product, ordering or announcement pages.',
    prepare: 'Prepare submission', reviewed: 'Submissions are reviewed before a company is listed.',
    ready: 'Your draft is ready. It has not been submitted yet.', submit: 'Review and submit on GitHub ↗',
  },
  de: {
    summary: 'Hersteller vorschlagen',
    intro: 'Kennen Sie ein Unternehmen, das hier fehlt? Geben Sie die offizielle Website und Belege zu den Roboterprodukten an. Sie prüfen den Entwurf und reichen ihn als öffentliches Issue auf GitHub ein; dafür brauchen Sie ein GitHub-Konto.',
    company: 'Name des Unternehmens', website: 'Offizielle Website', country: 'Land (optional)', status: 'Status des Unternehmens',
    statuses: { 'Commercial supplier': 'Kommerzieller Anbieter', 'Product announced / in development': 'Produkt angekündigt / in Entwicklung', Unknown: 'Unbekannt' },
    evidence: 'Roboterprodukte und Belege', evidenceHint: 'Namen der Roboter und Links zu offiziellen Produkt-, Bestell- oder Ankündigungsseiten.',
    prepare: 'Vorschlag vorbereiten', reviewed: 'Vorschläge werden geprüft, bevor ein Unternehmen aufgenommen wird.',
    ready: 'Ihr Entwurf ist fertig. Er wurde noch nicht eingereicht.', submit: 'Auf GitHub prüfen und einreichen ↗',
  },
});

export function ManufacturerSubmission() {
  const t = TEXT[useLang()];
  const [draft, setDraft] = useState<string | null>(null);
  function prepare(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get('company') ?? '').trim();
    const website = String(data.get('website') ?? '').trim();
    const evidence = String(data.get('evidence') ?? '').trim();
    const country = String(data.get('country') ?? '').trim();
    const status = String(data.get('status') ?? 'Unknown');
    const url = new URL('https://github.com/thenguyentrong/sitebots/issues/new');
    url.searchParams.set('title', `Manufacturer submission: ${name}`);
    url.searchParams.set('body', `## Manufacturer\n${name}\n\nOfficial website: ${website}\nCountry: ${country || 'Not provided'}\nCommercial status: ${status}\n\n## Product evidence\n${evidence}\n\nSubmitted through the Sitebots manufacturer form. Please verify company identity, commercial status and exact product sources before publishing.`);
    setDraft(url.href);
  }
  const input = 'w-full rounded-xl border border-edge bg-card px-3 py-2.5 text-sm text-foreground';
  return <details id="submit-manufacturer" className="card mt-8 p-5 sm:p-6">
    <summary className="cursor-pointer font-semibold">{t.summary}</summary>
    <p className="mt-3 max-w-2xl text-sm text-muted">{t.intro}</p>
    <form onSubmit={prepare} onChange={() => setDraft(null)} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-xs font-medium text-muted">{t.company}<input required name="company" maxLength={100} autoComplete="organization" className={input} /></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted">{t.website}<input required type="url" pattern="https?://.*" name="website" placeholder="https://" maxLength={250} className={input} /></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted">{t.country}<input name="country" maxLength={60} autoComplete="country-name" className={input} /></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted">{t.status}<select name="status" className={input}>{STATUSES.map((status) => <option key={status} value={status}>{t.statuses[status]}</option>)}</select></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted sm:col-span-2">{t.evidence}<textarea required name="evidence" rows={3} minLength={15} maxLength={700} placeholder={t.evidenceHint} className={input} /></label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2"><button type="submit" className={ui.btnSecondary}>{t.prepare}</button><p className="text-xs text-muted">{t.reviewed}</p></div>
      {draft ? <div role="status" className="rounded-xl bg-subtle p-4 text-sm sm:col-span-2"><p>{t.ready}</p><a href={draft} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-medium underline underline-offset-4">{t.submit}</a></div> : null}
    </form>
  </details>;
}
