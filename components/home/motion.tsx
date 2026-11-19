'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play } from '@phosphor-icons/react';
import { useLang } from '@/lib/i18n/client';
import type { Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { bilingual } from '@/lib/i18n/text';

// The moving parts of the start page. Each one is small and starts only when it is on screen; with
// "reduce motion" set in the system, everything shows its end state at once.

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TEXT = bilingual({ en: { play: 'Play: ' }, de: { play: 'Abspielen: ' } });

/**
 * Reads a figure printed the English way ("206,600", "2.58", "−30%", "€39.60") and prints any number in its
 * place in the page's language. German puts the euro and per cent signs after the number, with a space:
 * "39,60 €", "−30 %". Null when the text holds no number.
 */
function figure(text: string, lang: Lang): { target: number; print: (n: number) => string } | null {
  const match = text.match(/^([^\d]*)([\d.,]+)(.*)$/);
  if (!match) return null;
  const [, before, digits, after] = match;
  const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;
  const target = Number(digits.replace(/,/g, ''));
  const euro = lang === 'de' && before.endsWith('€');
  const pre = euro ? before.slice(0, -1) : before;
  const post = lang === 'de' ? (euro ? ' €' : '') + after.replace(/^%/, ' %') : after;
  return { target, print: (n) => pre + formatNumber(n, lang, decimals, decimals) + post };
}

/** Sets data-in on its box once it scrolls into view; CSS in home.css draws the charts and fades content in. */
export function InView({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'figure' }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced() || !('IntersectionObserver' in window)) { el.dataset.in = '1'; return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { el.dataset.in = '1'; io.disconnect(); }
    }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref as never} className={className}>{children}</Tag>;
}

/** A figure printed the English way, such as "206,600", "27%" or "−30%", that counts up from zero when it comes
 * into view, written in the page's language ("206.600", "27 %" on German pages). */
export function CountUp({ text }: { text: string }) {
  const lang = useLang();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(() => { const f = figure(text, lang); return f ? f.print(f.target) : text; });
  useEffect(() => {
    const el = ref.current;
    const f = figure(text, lang);
    if (!el || !f || reduced() || !('IntersectionObserver' in window)) return;
    const { target, print: format } = f;
    setShown(format(0));
    let frame = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 1400);
        setShown(format(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(frame); };
  }, [text, lang]);
  return <span ref={ref} className="num">{shown}</span>;
}

/** Real site footage behind the opening. The poster shows at once; the film loads after the page, and not at all
 * for visitors who save data or reduce motion. */
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!video || reduced() || saveData) return;
    const start = () => { video.src = src; video.play().catch(() => undefined); };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
  }, [src]);
  // eslint-disable-next-line jsx-a11y/media-has-caption -- silent background footage, no speech
  return <video ref={ref} poster={poster} muted loop playsInline preload="none" aria-hidden className="absolute inset-0 h-full w-full object-cover" />;
}

/** A maker's or contractor's film of the robot at work. Nothing is loaded from YouTube until the visitor clicks. */
export function VideoCard({ id, thumb, label, channel, title }: { id: string; thumb: string; label: string; channel: string; title: string }) {
  const t = TEXT[useLang()];
  const [playing, setPlaying] = useState(false);
  return <figure className="hv-card">
    <div className="hv-frame">
      {playing ? <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 h-full w-full" />
        : <button type="button" onClick={() => setPlaying(true)} className="hv-play" aria-label={t.play + title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" loading="lazy" decoding="async" />
          <span className="hv-button"><Play size={22} weight="fill" /></span>
        </button>}
    </div>
    <figcaption className="hv-caption"><span className="hv-label">{label}</span><span className="hv-channel">{channel} · YouTube</span></figcaption>
  </figure>;
}
