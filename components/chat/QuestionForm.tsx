'use client';

import { useState, type FormEvent } from 'react';
import { REPLY_KEY, TEXT } from '@/lib/chat/i18n';
import type { ChatForm } from '@/lib/chat/tools';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

const pill = 'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground/30';
const off = 'border-edge bg-background text-foreground hover:border-edge-strong';
const on = 'border-foreground bg-foreground text-background';

type Question = ChatForm['questions'][number];

/** Answers to the adviser's question, one tap each, like quick replies in a chat. */
function QuickReplies({ question, skip, onAnswer }: { question: Question; skip?: string; onAnswer: (message: string) => void }) {
  return <div role="group" aria-label={question.label} className="flex flex-wrap gap-2">
    {[...(question.options ?? []), ...(skip ? [skip] : [])].map((option) => <button key={option} type="button" onClick={() => onAnswer(option)} className="adv-chip">{option}</button>)}
  </div>;
}

/** Fields for answers a tap cannot give: a number, free text, several ticks, or questions that belong
 *  together. The adviser already asked in its message, so a single field carries no heading of its own. */
function AnswerForm({ form, onAnswer }: { form: ChatForm; onAnswer: (message: string) => void }) {
  const t = TEXT[form.language];
  const SKIP = t.notSure;
  const single = form.questions.length === 1;
  const [values, setValues] = useState<Record<string, string[]>>({});

  const set = (key: string, next: string[]) => setValues((current) => ({ ...current, [key]: next }));
  const toggle = (key: string, option: string, many: boolean) => {
    const list = values[key] ?? [];
    if (!many) return set(key, list[0] === option ? [] : [option]);
    set(key, list.includes(option) ? list.filter((item) => item !== option) : [...list, option]);
  };
  const answer = (question: Question) => {
    const value = (values[question.key] ?? []).join(', ').trim();
    return value ? value + (question.unit ? ' ' + question.unit : '') : SKIP;
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onAnswer(single ? answer(form.questions[0]) : form.questions.map((question) => question.label.replace(/[?:]\s*$/, '') + ': ' + answer(question)).join('\n'));
  };

  return <form onSubmit={submit} className={single ? '' : 'rounded-2xl border border-edge bg-card p-5'}>
    {form.title && !single ? <h2 className="text-base font-semibold">{form.title}</h2> : null}
    <div className={cn('space-y-5', form.title && !single ? 'mt-4' : '')}>
      {form.questions.map((question) => {
        const id = 'q-' + question.key;
        const choices = question.options ?? [];
        const heading = single ? 'sr-only' : 'block text-sm font-medium';
        return <div key={question.key}>
          {question.kind === 'number' || question.kind === 'text'
            ? <label htmlFor={id} className={heading}>{question.label}</label>
            : <p id={id} className={heading}>{question.label}</p>}
          {question.why && !single ? <p className="mt-0.5 text-xs text-muted">{question.why}</p> : null}
          {question.kind === 'choice' || question.kind === 'multi'
            ? <div role={question.kind === 'choice' ? 'radiogroup' : 'group'} aria-labelledby={id} className="mt-2 flex flex-wrap gap-2">
              {choices.map((option) => {
                const selected = (values[question.key] ?? []).includes(option);
                return <label key={option} className={cn(pill, selected ? on : off)}>
                  <input type={question.kind === 'choice' ? 'radio' : 'checkbox'} name={id} checked={selected} onChange={() => toggle(question.key, option, question.kind === 'multi')} className="sr-only" />
                  {option}
                </label>;
              })}
            </div>
            : <div className="mt-2 flex items-center gap-2">
              <input id={id} type={question.kind === 'number' ? 'number' : 'text'} inputMode={question.kind === 'number' ? 'decimal' : undefined} min={question.kind === 'number' ? 0 : undefined} step="any"
                value={values[question.key]?.[0] ?? ''} onChange={(event) => set(question.key, event.target.value ? [event.target.value] : [])}
                className={cn(ui.input, question.kind === 'number' ? 'max-w-40' : '')} />
              {question.unit ? <span className="text-sm text-muted">{question.unit}</span> : null}
            </div>}
        </div>;
      })}
    </div>
    <button type="submit" className={cn(ui.btn, ui.sm, 'mt-4')}>{t.send}</button>
  </form>;
}

/** How the person answers the adviser without retyping. It sits under the adviser's message, and the
 *  box at the bottom always works too, so nobody is forced through it. */
export function QuestionForm({ form, onAnswer }: { form: ChatForm; onAnswer: (message: string) => void }) {
  const only = form.questions.length === 1 ? form.questions[0] : null;
  if (only?.kind === 'choice') return <QuickReplies question={only} skip={only.key === REPLY_KEY ? undefined : TEXT[form.language].notSure} onAnswer={onAnswer} />;
  return <AnswerForm form={form} onAnswer={onAnswer} />;
}
