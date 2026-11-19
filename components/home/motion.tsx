'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play } from '@phosphor-icons/react';

// The moving parts of the start page. Each one is small and starts only when it is on screen; with
// "reduce motion" set in the system, everything shows its end state at once.

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

/** A printed figure such as "206,600", "27%" or "−30%" that counts up from zero when it comes into view. */
export function CountUp({ text }: { text: string }) {
  const match = text.match(/^([^\d]*)([\d.,]+)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);
  useEffect(() => {
    const el = ref.current;
    if (!el || !match || reduced() || !('IntersectionObserver' in window)) return;
    const [, before, digits, after] = match;
    const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;
    const target = Number(digits.replace(/,/g, ''));
    const format = (n: number) => before + n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + after;
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
    // The printed text is the only input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
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
  const [playing, setPlaying] = useState(false);
  return <figure className="hv-card">
    <div className="hv-frame">
      {playing ? <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 h-full w-full" />
        : <button type="button" onClick={() => setPlaying(true)} className="hv-play" aria-label={'Play: ' + title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" loading="lazy" decoding="async" />
          <span className="hv-button"><Play size={22} weight="fill" /></span>
        </button>}
    </div>
    <figcaption className="hv-caption"><span className="hv-label">{label}</span><span className="hv-channel">{channel} · YouTube</span></figcaption>
  </figure>;
}
