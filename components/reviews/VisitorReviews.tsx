'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star } from '@phosphor-icons/react';
import { openDialog } from '@/components/account/access-store';
import { Badge } from '@/components/ui/badge';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

type Review = { target: string; rating: number; worked: boolean; role: string; text: string; provider: string; createdAt: string; updatedAt: string; mine: boolean };

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} weight={n <= value ? 'fill' : 'regular'} className={n <= value ? 'text-[var(--accent)]' : 'text-faint'} aria-hidden />)}
  </span>;
}

/** Reviews by signed-in visitors: anyone can read them, an account writes one per robot or company and can change it. */
export function VisitorReviews({ target, name }: { target: string; name: string }) {
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
    if (!form.rating) { setError('Please choose 1 to 5 stars.'); return; }
    setBusy(true); setError('');
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target, ...form }) }).catch(() => null);
    setBusy(false);
    if (response?.status === 401) { openDialog('access', 'sign_in'); return; }
    if (!response?.ok) { const data = await response?.json().catch(() => null); setError(data?.message ?? 'Could not save the review. Please try again.'); return; }
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
        <h2 id="visitor-reviews-title" className="text-sm font-semibold">Reviews from people who used it</h2>
        {reviews?.length ? <span className="flex items-center gap-2 text-xs text-muted"><Stars value={Math.round(average)} /><span className="num">{average.toFixed(1)} · {reviews.length}</span></span> : null}
      </div>
      {signedIn
        ? <button type="button" onClick={() => setOpen((v) => !v)} className={ui.btnSecondary}>{mine ? 'Edit my review' : 'Write a review'}</button>
        : <button type="button" onClick={() => openDialog('access', 'sign_in')} className={ui.btnSecondary}>Sign in to write a review</button>}
    </header>

    {open && signedIn ? <form onSubmit={submit} className="space-y-4 border-b border-edge/70 bg-subtle/40 px-5 py-4 text-sm">
      <fieldset>
        <legend className="text-xs font-medium text-muted">Your rating of {name}</legend>
        <div className="mt-1.5 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} aria-label={n + ' stars'} aria-pressed={form.rating === n} className="rounded p-0.5 transition hover:scale-110">
            <Star size={24} weight={n <= form.rating ? 'fill' : 'regular'} className={n <= form.rating ? 'text-[var(--accent)]' : 'text-faint'} />
          </button>)}
        </div>
      </fieldset>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.worked} onChange={(e) => setForm({ ...form, worked: e.target.checked })} /> I have worked with it myself</label>
      <label className="block">
        <span className="text-xs font-medium text-muted">Shown as (optional, e.g. "Site manager, Munich")</span>
        <input value={form.role} maxLength={80} onChange={(e) => setForm({ ...form, role: e.target.value })} className={cn(ui.input, 'mt-1 h-9 w-full')} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted">Your experience: what worked, what did not</span>
        <textarea value={form.text} maxLength={2000} rows={5} onChange={(e) => setForm({ ...form, text: e.target.value })} className={cn(ui.input, 'mt-1 w-full py-2')} />
      </label>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={ui.btn}>{mine ? 'Save changes' : 'Publish review'}</button>
        {mine ? <button type="button" disabled={busy} onClick={remove} className="text-sm text-muted underline underline-offset-4">Delete my review</button> : null}
        <span className="text-xs text-faint">We store your review with a code for your account, never your name or email.</span>
      </div>
    </form> : null}

    {reviews === null ? <p className="px-5 py-4 text-sm text-muted">Loading reviews…</p>
      : reviews.length ? <ul className="divide-y divide-edge/60">{reviews.map((review) => <li key={review.createdAt + review.text.slice(0, 12)} className="space-y-1.5 px-5 py-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Stars value={review.rating} />
          {review.worked ? <Badge variant="success">Worked with it</Badge> : null}
          <span className="text-xs text-muted">{review.role || 'Signed-in user'}</span>
          <span className="num text-xs text-faint">{review.updatedAt.slice(0, 10)}</span>
          {review.mine ? <Badge variant="outline">Yours</Badge> : null}
        </div>
        <p className="whitespace-pre-line">{review.text}</p>
      </li>)}</ul>
      : <p className="px-5 py-4 text-sm text-muted">No reviews yet. If you have worked with {name}, sign in and share what it was like.</p>}
  </section>;
}
