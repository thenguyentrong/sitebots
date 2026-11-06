'use client';

import { CaretDown, Check } from '@phosphor-icons/react';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { Logo } from '@/components/Logo';
import { TEXT, browserLang, type Lang } from '@/lib/chat/i18n';
import type { BriefFact, ChatForm, ChatOption, LeftOut } from '@/lib/chat/tools';
import { ui } from '@/lib/ui';
import { BriefPanel } from './BriefPanel';
import { Composer } from './Composer';
import { MessageText } from './MessageText';
import { OptionCards } from './OptionCards';
import { QuestionForm } from './QuestionForm';
import { SiteStage } from './SiteStage';
import './advisor.css';

type Item =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string; failed?: boolean }
  | { kind: 'trail'; steps: string[] }
  | { kind: 'form'; form: ChatForm; answered: boolean }
  | { kind: 'options'; options: ChatOption[]; leftOut: LeftOut[] }
  | { kind: 'report' };

type StreamEvent = { t: string; conversationId?: string; lang?: Lang; text?: string; delta?: string; facts?: BriefFact[]; form?: ChatForm; options?: ChatOption[]; leftOut?: LeftOut[]; code?: string };

type SavedChat = { items: Item[]; brief: BriefFact[]; lang: Lang; chosen?: boolean; conversation: string | null };

const SAVED_CHAT = 'sitebots-chat';

/** The open chat, kept for this tab. Storage can be blocked or full, and then the chat just lasts as long as the page. */
function readChat(): SavedChat | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVED_CHAT) ?? 'null') as SavedChat | null;
    return Array.isArray(saved?.items) && saved.items.length ? saved : null;
  } catch {
    return null;
  }
}

function writeChat(chat: SavedChat | null) {
  try {
    if (chat) sessionStorage.setItem(SAVED_CHAT, JSON.stringify(chat));
    else sessionStorage.removeItem(SAVED_CHAT);
  } catch {
    // Nothing to do: see readChat.
  }
}

const delay = (seconds: number) => ({ '--delay': seconds + 's' }) as CSSProperties;

const Nav = ({ lang }: { lang: Lang }) => <nav className="flex items-center gap-6 text-sm text-zinc-300" aria-label="Main">
  <Link href="/robots" className="transition hover:text-white">{TEXT[lang].robots}</Link>
  <Link href="/compare" className="transition hover:text-white">{TEXT[lang].compare2}</Link>
</nav>;

/** What the adviser looked at, folded away once the answer is in. */
function Trail({ steps, lang }: { steps: string[]; lang: Lang }) {
  return <details className="group text-sm text-muted">
    <summary className="flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
      <Check size={14} weight="bold" className="text-safety" /> {TEXT[lang].checks(steps.length)}
      <CaretDown size={12} className="transition group-open:rotate-180" />
    </summary>
    <ul className="mt-2 space-y-1 pl-5">{steps.map((step) => <li key={step}>{step}</li>)}</ul>
  </details>;
}

/** The adviser at work: what it finished, ticked, and what it is on now, shimmering. */
function LiveSteps({ steps, working }: { steps: string[]; working: string }) {
  return <ul className="space-y-1.5 text-sm" aria-label="What the adviser is doing">
    {steps.map((step) => <li key={step} className="adv-item flex items-center gap-2"><Check size={14} weight="bold" className="text-safety" /><span className="text-muted">{step}</span></li>)}
    {working ? <li className="flex items-center gap-2"><span className="w-3.5" /><span className="adv-working font-medium">{working}</span></li> : null}
  </ul>;
}

/** The whole product: a conversation that thinks a job through, looks things up as it goes, comes to a
 *  conclusion and can be exported. */
export function Advisor({ maxChars }: { maxChars: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [brief, setBrief] = useState<BriefFact[]>([]);
  const [input, setInput] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [working, setWorking] = useState('');
  const [lang, setLang] = useState<Lang>('en');
  // True once the person used the switch: from then on the page stops guessing from what they type.
  const [chosen, setChosen] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<string | null>(null);
  const conversationRef = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const following = useRef(true);

  const started = items.length > 0;

  // Going to a robot page or the comparison and back must find the chat as it was. It is read after the
  // first render, which has to match the server, and before the browser paints, so nothing flashes.
  const restored = useRef(false);
  useLayoutEffect(() => {
    const saved = readChat();
    if (saved) {
      setItems(saved.items);
      setBrief(saved.brief);
      setLang(saved.lang);
      setChosen(saved.chosen ?? false);
      setConversation(saved.conversation);
      conversationRef.current = saved.conversation;
    } else setLang(browserLang(navigator.language));
    restored.current = true;
  }, []);
  useEffect(() => {
    if (restored.current) writeChat(items.length ? { items, brief, lang, chosen, conversation } : null);
  }, [items, brief, lang, chosen, conversation]);

  // Follow the answer only while the person stays at the end of it. Scrolling up to reread wins.
  useEffect(() => {
    if (!started) return;
    const target = bottom.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => { following.current = entry.isIntersecting; }, { rootMargin: '0px 0px 200px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [started]);
  useEffect(() => {
    if (following.current && started) bottom.current?.scrollIntoView({ block: 'end' });
  }, [items, steps, started]);
  useEffect(() => () => abort.current?.abort(), []);

  const appendText = useCallback((delta: string) => {
    setItems((list) => {
      const last = list[list.length - 1];
      if (last?.kind === 'assistant') return [...list.slice(0, -1), { ...last, text: last.text + delta }];
      return delta.trim() ? [...list, { kind: 'assistant', text: delta.trimStart() }] : list;
    });
  }, []);

  const ask = useCallback(async (question: string) => {
    const text = question.trim();
    if (!text || sending) return;
    const firstMessage = !items.length;
    const open = () => {
      setSending(true);
      setInput('');
      setSteps([]);
      setWorking(TEXT[lang].reading);
      following.current = true;
      setItems((list) => [...list.map((item) => item.kind === 'form' ? { ...item, answered: true } : item), { kind: 'user', text }]);
    };
    // The input travels from the opening screen to the foot of the chat where the browser can do it.
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
    if (firstMessage && doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(() => flushSync(open));
    else open();

    const fail = (code: string) => setItems((list) => [...list, { kind: 'assistant', text: TEXT[lang].errors[code] ?? TEXT[lang].errors.failed, failed: true }]);
    // Finished lookups go into the thread above what came out of them, so a long turn reads as
    // thought, lookups, thought, in the order it happened.
    let lookups: string[] = [];
    const settle = () => {
      setWorking('');
      if (!lookups.length) return;
      const finished = lookups;
      lookups = [];
      setSteps([]);
      setItems((list) => [...list, { kind: 'trail', steps: finished }]);
    };
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ message: text.slice(0, maxChars), lang, chosen, ...(conversationRef.current ? { conversationId: conversationRef.current } : {}) }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        fail(body?.error ?? 'failed');
        return;
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.t === 'start' && event.conversationId) {
            conversationRef.current = event.conversationId;
            setConversation(event.conversationId);
            if (event.lang && !chosen) setLang(event.lang);
          } else if (event.t === 'status') setWorking(event.text ?? '');
          else if (event.t === 'step' && event.text && !lookups.includes(event.text)) {
            lookups = [...lookups, event.text];
            setSteps(lookups);
          } else if (event.t === 'text') {
            settle();
            appendText(event.delta ?? '');
          } else if (event.t === 'brief') setBrief(event.facts ?? []);
          else if (event.t === 'form' && event.form) {
            const form = event.form;
            setLang(form.language);
            settle();
            setItems((list) => [...list, { kind: 'form', form, answered: false }]);
          } else if (event.t === 'options' && event.options) {
            const options = event.options;
            setLang(options[0]?.language ?? 'en');
            settle();
            setItems((list) => [...list, { kind: 'options', options, leftOut: event.leftOut ?? [] }]);
          } else if (event.t === 'report') setItems((list) => [...list, { kind: 'report' }]);
          else if (event.t === 'error') fail(event.code ?? 'failed');
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) fail('failed');
    } finally {
      settle();
      setSending(false);
      setSteps([]);
    }
  }, [appendText, chosen, items.length, lang, maxChars, sending]);

  const startOver = () => {
    abort.current?.abort();
    conversationRef.current = null;
    setConversation(null);
    setItems([]);
    setBrief([]);
    setSteps([]);
    setWorking('');
    setInput('');
    setSending(false);
  };

  const reportHref = conversation ? '/api/report?id=' + conversation : null;
  const pickLang = (next: Lang) => {
    setLang(next);
    setChosen(true);
  };
  const composer = <Composer value={input} onChange={setInput} onSend={() => void ask(input)} busy={sending} started={started} replyHint={TEXT[lang].reply} maxChars={maxChars} field={field} lang={lang} onLang={pickLang} />;

  if (!started) return <section className="adv-hero">
    <SiteStage over={copy} />
    <header className="absolute inset-x-0 top-0 z-10">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><Logo className="text-white" /><Nav lang={lang} /></div>
    </header>
    <div ref={copy} className="mx-auto w-full max-w-5xl px-4 pb-5 text-center sm:px-6">
      <h1 className="adv-rise text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">{TEXT[lang].title}</h1>
      <p className="adv-rise mx-auto mt-3 text-base text-zinc-300 sm:text-lg" style={delay(0.1)}>{TEXT[lang].lead}</p>
      <div className="adv-rise mx-auto mt-6 max-w-3xl text-left" style={delay(0.2)}>{composer}</div>
      <div className="adv-rise mt-3 flex flex-wrap justify-center gap-2" style={delay(0.3)}>
        {TEXT[lang].starters.map((starter) => <button key={starter} type="button" onClick={() => void ask(starter)} className="adv-chip">{starter}</button>)}
      </div>
      <p className="adv-rise mt-4 text-xs text-zinc-500" style={delay(0.4)}>
        {TEXT[lang].suggestion} <Link href="/privacy" className="ml-2 underline underline-offset-2 hover:text-zinc-300">{TEXT[lang].privacy}</Link> <Link href="/impressum" className="ml-2 underline underline-offset-2 hover:text-zinc-300">Impressum</Link>
      </p>
    </div>
  </section>;

  return <div className="flex min-h-[100dvh] flex-col">
    <header className="border-b border-edge">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-6">
          <button type="button" onClick={startOver} className="text-sm font-medium text-foreground transition hover:text-safety">{TEXT[lang].newChat}</button>
          <Nav lang={lang} />
        </div>
      </div>
    </header>
    <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-8 px-4 pt-8 pb-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-6" aria-live="polite">
        <div className="lg:hidden"><BriefPanel facts={brief} reportHref={reportHref} lang={lang} /></div>
        {items.map((item, index) => {
          const key = index + item.kind;
          if (item.kind === 'user') return <div key={key} className="adv-item flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-subtle px-5 py-3 text-base leading-relaxed">{item.text}</p></div>;
          if (item.kind === 'trail') return <div key={key} className="adv-item"><Trail steps={item.steps} lang={lang} /></div>;
          if (item.kind === 'assistant') return <div key={key} className="adv-item">{item.failed ? <p role="alert" className="text-destructive">{item.text}</p> : <MessageText text={item.text} />}</div>;
          // Once answered the form is gone: the answers sit in the thread as the person's own message.
          if (item.kind === 'form') return item.answered ? null : <div key={key} className="adv-item"><QuestionForm form={item.form} onAnswer={(message) => void ask(message)} /></div>;
          if (item.kind === 'options') return <div key={key}><OptionCards options={item.options} leftOut={item.leftOut} reportHref={reportHref} /></div>;
          return reportHref ? <div key={key} className="adv-item"><a href={reportHref} className={ui.btn}>{TEXT[lang].pdfExport}</a></div> : null;
        })}
        {sending && (steps.length || working) ? <LiveSteps steps={steps} working={working} /> : null}
        <div ref={bottom} className="scroll-mb-36" />
      </div>
      <div className="hidden self-stretch lg:block"><BriefPanel facts={brief} reportHref={reportHref} lang={lang} /></div>
    </main>
    <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-6">
      <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
        <div>{composer}<p className="mt-2 text-center text-xs text-muted">{TEXT[lang].suggestion}</p></div>
      </div>
    </div>
  </div>;
}
