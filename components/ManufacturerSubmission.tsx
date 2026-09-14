'use client';

import { useState, type FormEvent } from 'react';
import { ui } from '@/lib/ui';

export function ManufacturerSubmission() {
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
    <summary className="cursor-pointer font-semibold">Suggest a manufacturer</summary>
    <p className="mt-3 max-w-2xl text-sm text-muted">Know a company we should include? Add its official website and robot product evidence. You’ll review and submit a public issue on GitHub; a GitHub account is required.</p>
    <form onSubmit={prepare} onChange={() => setDraft(null)} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-xs font-medium text-muted">Company name<input required name="company" maxLength={100} autoComplete="organization" className={input} /></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted">Official website<input required type="url" pattern="https?://.*" name="website" placeholder="https://" maxLength={250} className={input} /></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted">Country (optional)<input name="country" maxLength={60} autoComplete="country-name" className={input} /></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted">Company availability<select name="status" className={input}><option>Commercial supplier</option><option>Product announced / in development</option><option>Unknown</option></select></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted sm:col-span-2">Robot products and evidence<textarea required name="evidence" rows={3} minLength={15} maxLength={700} placeholder="Robot names and links to official product, ordering or announcement pages." className={input} /></label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2"><button type="submit" className={ui.btnSecondary}>Prepare submission</button><p className="text-xs text-muted">Submissions are reviewed before a company is listed.</p></div>
      {draft ? <div role="status" className="rounded-xl bg-subtle p-4 text-sm sm:col-span-2"><p>Your draft is ready. It has not been submitted yet.</p><a href={draft} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-medium underline underline-offset-4">Review and submit on GitHub ↗</a></div> : null}
    </form>
  </details>;
}
