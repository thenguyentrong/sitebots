'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star } from '@phosphor-icons/react';
import { openDialog } from '@/components/account/access-store';
import { Badge } from '@/components/ui/badge';
import { useLang } from '@/lib/i18n/client';
import { formatDate, formatNumber } from '@/lib/i18n/format';
import { bilingual } from '@/lib/i18n/text';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

type Review = { target: string; rating: number; worked: boolean; role: string; text: string; provider: string; createdAt: string; updatedAt: string; mine: boolean };

/** The API answers with codes; the words for them live here, so the form speaks the page's language. */
const TEXT = bilingual({
  en: {
    stars: (n: number) => `${n} of 5 stars`, starButton: (n: number) => n + ' stars',
    chooseStars: 'Please choose 1 to 5 stars.', tooShort: 'Please write at least 20 characters.', invalid: 'Please check the form.',
    saveFailed: 'Could not save the review. Please try again.',
    title: 'Reviews from people who used it', edit: 'Edit my review', write: 'Write a review', signIn: 'Sign in to write a review',
    yourRating: (name: string) => 'Your rating of ' + name, worked: 'I have worked with it myself',
    shownAs: 'Shown as (optional, e.g. "Site manager, Munich")', experience: 'Your experience: what worked, what did not',
    save: 'Save changes', publish: 'Publish review', remove: 'Delete my review',
    privacy: 'We store your review with a code for your account, never your name or email.',
    loading: 'Loading reviews…', workedBadge: 'Worked with it', anonymous: 'Signed-in user', yours: 'Yours',
    none: (name: string) => `No reviews yet. If you have worked with ${name}, sign in and share what it was like.`,
  },
  de: {
    stars: (n: number) => `${n} von 5 Sternen`, starButton: (n: number) => n + (n === 1 ? ' Stern' : ' Sterne'),
    chooseStars: 'Bitte wählen Sie 1 bis 5 Sterne.', tooShort: 'Bitte schreiben Sie mindestens 20 Zeichen.', invalid: 'Bitte prüfen Sie das Formular.',
    saveFailed: 'Die Bewertung ließ sich nicht speichern. Bitte versuchen Sie es noch einmal.',
    title: 'Bewertungen aus der Praxis', edit: 'Meine Bewertung bearbeiten', write: 'Bewertung schreiben', signIn: 'Anmelden und Bewertung schreiben',
    yourRating: (name: string) => 'Ihre Bewertung für ' + name, worked: 'Ich habe selbst damit gearbeitet',
    shownAs: 'Angezeigt als (optional, z. B. „Bauleiter, München“)', experience: 'Ihre Erfahrung: was funktioniert hat und was nicht',
    save: 'Änderungen speichern', publish: 'Bewertung veröffentlichen', remove: 'Meine Bewertung löschen',
    privacy: 'Wir speichern Ihre Bewertung mit einem Code für Ihr Konto, nie mit Ihrem Namen oder Ihrer E-Mail-Adresse.',
    loading: 'Bewertungen werden geladen …', workedBadge: 'Selbst damit gearbeitet', anonymous: 'Angemeldetes Konto', yours: 'Ihre',
    none: (name: string) => `Noch keine Bewertungen. Wenn Sie mit ${name} gearbeitet haben, melden Sie sich an und teilen Sie Ihre Erfahrung.`,
  },
});
/** The server's minimum (lib/reviews/visitor.ts), checked here first so the message is in the page's language. */
const MIN_TEXT = 20;

function Stars({ value, size = 14, label }: { value: number; size?: number; label: string }) {
  return <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} weight={n <= value ? 'fill' : 'regular'} className={n <= value ? 'text-[var(--accent)]' : 'text-faint'} aria-hidden />)}
  </span>;
}

/** Reviews by signed-in visitors: anyone can read them, an account writes one per robot or company and can change it.
 * A visitor's own text is shown as written, in whatever language they wrote it. */
export function VisitorReviews({ target, name }: { target: string; name: string }) {
  const lang = useLang();
  const t = TEXT[lang];
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rating: 0, worked: true, role: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => fetch('/api/reviews?target=' + encodeURIComponent(target), { cache: 'no-store' })
    .then((r) => r.ok ? r.json() : { reviews: [], signedIn: false })
    .then((data: { reviews: Review[]; signedIn: boolean }) => {
      setReviews(data.reviews); setSignedIn(data.signedIn);
      const mine = data.reviews.find((review) => review.mine);
      if (mine) setForm({ rating: mine.rating, worked: mine.worked, role: mine.role, text: mine.text });
    })
    .catch(() => setReviews([])), [target]);
  useEffect(() => { void load(); }, [load]);

  const mine = reviews?.find((review) => review.mine);
  const average = reviews?.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.rating) { setError(t.chooseStars); return; }
    if (form.text.trim().length < MIN_TEXT) { setError(t.tooShort); return; }
    setBusy(true); setError('');
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target, ...form }) }).catch(() => null);
    setBusy(false);
    if (response?.status === 401) { openDialog('access', 'sign_in'); return; }
    if (!response?.ok) {
      const data: { error?: string; message?: string } | null = await response?.json().catch(() => null) ?? null;
      // The server's own message is English; German pages say the same thing in their own words.
      setError(data?.error === 'invalid' ? (lang === 'en' ? data.message ?? t.invalid : t.invalid) : t.saveFailed);
      return;
    }
    setOpen(false); void load();
  }
  async function remove() {
    setBusy(true);
    await fetch('/api/reviews?target=' + encodeURIComponent(target), { method: 'DELETE' }).catch(() => null);
    setBusy(false); setForm({ rating: 0, worked: true, role: '', text: '' }); setOpen(false); void load();
  }

  return <section id="visitor-reviews" className="card scroll-mt-6 overflow-hidden" aria-labelledby="visitor-reviews-title">
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-edge/70 px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="visitor-reviews-title" className="text-sm font-semibold">{t.title}</h2>
        {reviews?.length ? <span className="flex items-center gap-2 text-xs text-muted"><Stars value={Math.round(average)} label={t.stars(Math.round(average))} /><span className="num">{formatNumber(average, lang, 1, 1)} · {reviews.length}</span></span> : null}
      </div>
      {signedIn
        ? <button type="button" onClick={() => setOpen((v) => !v)} className={ui.btnSecondary}>{mine ? t.edit : t.write}</button>
        : <button type="button" onClick={() => openDialog('access', 'sign_in')} className={ui.btnSecondary}>{t.signIn}</button>}
    </header>

    {open && signedIn ? <form onSubmit={submit} className="space-y-4 border-b border-edge/70 bg-subtle/40 px-5 py-4 text-sm">
      <fieldset>
        <legend className="text-xs font-medium text-muted">{t.yourRating(name)}</legend>
        <div className="mt-1.5 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} aria-label={t.starButton(n)} aria-pressed={form.rating === n} className="rounded p-0.5 transition hover:scale-110">
            <Star size={24} weight={n <= form.rating ? 'fill' : 'regular'} className={n <= form.rating ? 'text-[var(--accent)]' : 'text-faint'} />
          </button>)}
        </div>
      </fieldset>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.worked} onChange={(e) => setForm({ ...form, worked: e.target.checked })} /> {t.worked}</label>
      <label className="block">
        <span className="text-xs font-medium text-muted">{t.shownAs}</span>
        <input value={form.role} maxLength={80} onChange={(e) => setForm({ ...form, role: e.target.value })} className={cn(ui.input, 'mt-1 h-9 w-full')} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted">{t.experience}</span>
        <textarea value={form.text} maxLength={2000} rows={5} onChange={(e) => setForm({ ...form, text: e.target.value })} className={cn(ui.input, 'mt-1 w-full py-2')} />
      </label>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={ui.btn}>{mine ? t.save : t.publish}</button>
        {mine ? <button type="button" disabled={busy} onClick={remove} className="text-sm text-muted underline underline-offset-4">{t.remove}</button> : null}
        <span className="text-xs text-faint">{t.privacy}</span>
      </div>
    </form> : null}

    {reviews === null ? <p className="px-5 py-4 text-sm text-muted">{t.loading}</p>
      : reviews.length ? <ul className="divide-y divide-edge/60">{reviews.map((review) => <li key={review.createdAt + review.text.slice(0, 12)} className="space-y-1.5 px-5 py-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Stars value={review.rating} label={t.stars(review.rating)} />
          {review.worked ? <Badge variant="success">{t.workedBadge}</Badge> : null}
          <span className="text-xs text-muted">{review.role || t.anonymous}</span>
          <span className="num text-xs text-faint">{lang === 'en' ? review.updatedAt.slice(0, 10) : formatDate(review.updatedAt.slice(0, 10), lang, 'short')}</span>
          {review.mine ? <Badge variant="outline">{t.yours}</Badge> : null}
        </div>
        <p className="whitespace-pre-line">{review.text}</p>
      </li>)}</ul>
      : <p className="px-5 py-4 text-sm text-muted">{t.none(name)}</p>}
  </section>;
}
