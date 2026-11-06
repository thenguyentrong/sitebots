'use client';

import { ArrowUp, Microphone } from '@phosphor-icons/react';
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { TEXT, type Lang } from '@/lib/chat/i18n';

/** Types example jobs into the empty box, so a first-time visitor sees what to write. Stops for people
 *  who ask for less motion. */
function useTypedHint(active: boolean, hints: readonly string[]): string {
  const [text, setText] = useState(hints[0]);
  useEffect(() => {
    // The language can change after the first render, and the old hint must not wait for the typing.
    setText(hints[0]);
    if (!active || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let hint = 0;
    let length = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const full = hints[hint];
      length += deleting ? -1 : 1;
      setText(full.slice(0, length));
      if (!deleting && length === full.length) { deleting = true; timer = setTimeout(step, 2200); return; }
      if (deleting && length === 0) { deleting = false; hint = (hint + 1) % hints.length; timer = setTimeout(step, 300); return; }
      timer = setTimeout(step, deleting ? 16 : 38);
    };
    timer = setTimeout(step, 1200);
    return () => clearTimeout(timer);
  }, [active, hints]);
  return text;
}

// The browser's own speech recognition. It has no types in TypeScript's DOM library yet, and Firefox
// does not have it at all, so the button only appears where it works.
type Heard = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((event: Heard) => void) | null; onend: (() => void) | null };

function speechApi(): (new () => Recognition) | null {
  const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

const nothing = () => () => undefined;

/** Lets people talk instead of type: what they say lands in the box, where they can read and fix it. */
function useDictation(value: string, onChange: (value: string) => void, lang: Lang, maxChars: number) {
  const supported = useSyncExternalStore(nothing, () => speechApi() !== null, () => false);
  const [listening, setListening] = useState(false);
  const active = useRef<Recognition | null>(null);
  useEffect(() => () => active.current?.stop(), []);

  const stop = () => active.current?.stop();
  const toggle = () => {
    if (listening) return stop();
    const Speech = speechApi();
    if (!Speech) return;
    const before = value.trim();
    const speech = new Speech();
    speech.lang = lang === 'de' ? 'de-DE' : 'en-US';
    speech.continuous = true;
    speech.interimResults = true;
    speech.onresult = (event) => {
      const spoken = Array.from(event.results).map((result) => result[0].transcript.trim()).join(' ');
      onChange(((before ? before + ' ' : '') + spoken).slice(0, maxChars));
    };
    speech.onend = () => {
      active.current = null;
      setListening(false);
    };
    active.current = speech;
    speech.start();
    setListening(true);
  };
  return { supported, listening, toggle, stop };
}

export function Composer({ value, onChange, onSend, busy, started, replyHint, maxChars, field, lang, onLang }: {
  value: string; onChange: (value: string) => void; onSend: () => void; busy: boolean; started: boolean; replyHint: string; maxChars: number;
  field: RefObject<HTMLTextAreaElement | null>; lang: Lang; onLang: (lang: Lang) => void;
}) {
  const typed = useTypedHint(!started, TEXT[lang].hints);
  const dictation = useDictation(value, onChange, lang, maxChars);
  // Speech is recognised in one language at a time, so a change has to end what is running.
  const pick = (next: Lang) => {
    dictation.stop();
    onLang(next);
  };
  const hint = dictation.listening ? TEXT[lang].listening : started ? replyHint : typed;
  const send = () => {
    dictation.stop();
    onSend();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };
  return <form onSubmit={submit} className="adv-box" data-busy={busy}>
    <label htmlFor="ask" className="sr-only">{TEXT[lang].describe}</label>
    <textarea
      id="ask" ref={field} rows={1} value={value} maxLength={maxChars}
      onChange={(event) => onChange(event.target.value)} onKeyDown={onKey} placeholder={hint}
      className="max-h-40 min-h-12 w-full resize-none bg-transparent py-3 pl-5 text-[17px] text-foreground outline-none [field-sizing:content] placeholder:text-zinc-500"
    />
    <div role="group" aria-label={TEXT[lang].language} className="adv-lang">
      {(['en', 'de'] as const).map((code) => <button key={code} type="button" onClick={() => pick(code)} aria-pressed={lang === code} disabled={busy}>{code.toUpperCase()}</button>)}
    </div>
    {dictation.supported ? <button type="button" onClick={dictation.toggle} disabled={busy} aria-pressed={dictation.listening} aria-label={TEXT[lang].speak} title={TEXT[lang].speak} className="adv-mic" data-on={dictation.listening}><Microphone size={20} weight={dictation.listening ? 'fill' : 'regular'} /></button> : null}
    <button type="submit" disabled={busy || !value.trim()} aria-label={TEXT[lang].ask} className="adv-send"><ArrowUp size={20} weight="bold" /></button>
  </form>;
}
