'use client';

import { ArrowSquareOut, GoogleLogo, Key, SignOut, Trash, WindowsLogo, X } from '@phosphor-icons/react';
import Link from '@/components/LocaleLink';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ACCESS_TEXT } from '@/lib/chat/i18n';
import { API_KEY_PATTERN as KEY_PATTERN } from '@/lib/chat/visitor-key';
import { ui } from '@/lib/ui';
import { closeDialog, deleteAccount, removeKey, saveKey, signOut, useAccess, type Provider } from './access-store';
const ICONS: Record<Provider, typeof GoogleLogo> = { google: GoogleLogo, microsoft: WindowsLogo };

/** The visitor's own key: pasted once, checked for shape here, kept in this browser. */
function KeyForm({ lang }: { lang: 'en' | 'de' }) {
  const t = ACCESS_TEXT[lang];
  const id = useId();
  const [value, setValue] = useState('');
  const [remember, setRemember] = useState(false);
  const [wrong, setWrong] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const key = value.trim();
    if (!KEY_PATTERN.test(key)) return setWrong(true);
    saveKey(key, remember);
  };
  return <form onSubmit={submit} className="grid gap-2" noValidate>
    <label htmlFor={id} className="text-sm font-medium">{t.keyLabel}</label>
    <input id={id} type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-..." value={value} aria-invalid={wrong} aria-describedby={id + '-help'}
      onChange={(event) => { setValue(event.target.value); setWrong(false); }} className={ui.input + ' h-11 font-mono'} />
    {wrong ? <p role="alert" className="text-sm text-destructive">{t.keyInvalid}</p> : null}
    <p id={id + '-help'} className="text-xs leading-relaxed text-muted">{t.keySafe}</p>
    <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-4 accent-[var(--accent)]" />{t.remember}</label>
      <button type="submit" className={ui.btnSecondary}><Key size={16} weight="bold" />{t.useKey}</button>
    </div>
    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-foreground underline decoration-muted underline-offset-4 hover:text-safety hover:decoration-safety">{t.getKey}<ArrowSquareOut size={14} /></a>
  </form>;
}

function SignInButtons({ lang, back }: { lang: 'en' | 'de'; back: string }) {
  const t = ACCESS_TEXT[lang];
  const { info } = useAccess();
  const providers = info?.providers ?? [];
  if (!info) return <div className="h-24" aria-hidden />;
  return <div className="grid gap-2">
    {providers.map((provider) => {
      const Icon = ICONS[provider];
      return <a key={provider} href={'/api/auth/signin/' + provider + '?back=' + encodeURIComponent(back)} className={ui.btn + ' h-12 w-full text-[15px]'}><Icon size={19} weight="bold" />{provider === 'google' ? t.google : t.microsoft}</a>;
    })}
    {info.devLogin ? <a href={'/api/auth/dev?back=' + encodeURIComponent(back)} className={ui.btnSecondary + ' h-11 w-full'}>{t.dev}</a> : null}
    {!providers.length && !info.devLogin ? <p className="rounded-2xl bg-subtle px-4 py-3 text-sm text-muted">{t.unavailable}</p> : null}
  </div>;
}

function Account({ lang }: { lang: 'en' | 'de' }) {
  const t = ACCESS_TEXT[lang];
  const { info, key } = useAccess();
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!info) return null;
  return <div className="grid gap-6">
    {info.signedIn ? <div className="rounded-2xl bg-subtle px-4 py-3">
      <p className="text-xs text-muted">{t.signedInAs}</p>
      <p className="mt-0.5 truncate font-medium">{info.label || (info.provider === 'microsoft' ? 'Microsoft' : 'Google')}</p>
      <p className="mt-2 text-sm">{info.free.left ? t.left(info.free.left, info.free.perMonth) : t.noneLeft}</p>
    </div> : null}
    <div>
      {key ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-edge px-4 py-3">
        <p className="inline-flex items-center gap-2 text-sm font-medium"><Key size={16} weight="bold" className="text-safety" />{t.usingKey}</p>
        <button type="button" onClick={removeKey} className={ui.btnSecondary + ' ' + ui.sm}>{t.removeKey}</button>
      </div> : <><h3 className="mb-1 font-semibold">{t.keyTitle}</h3><p className="mb-3 text-sm text-muted">{t.keyLead}</p><KeyForm lang={lang} /></>}
    </div>
    {info.signedIn ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-5">
      <button type="button" onClick={() => void signOut()} className={ui.btnSecondary}><SignOut size={16} weight="bold" />{t.signOut}</button>
      {asking ? <div className="flex w-full flex-col gap-2 rounded-2xl border border-destructive/40 p-4">
        <p className="text-sm">{t.deleteAsk}</p>
        {failed ? <p role="alert" className="text-sm text-destructive">{t.deleteFailed}</p> : null}
        <div className="flex gap-2">
          <button type="button" onClick={async () => setFailed(!(await deleteAccount()))} className={ui.btn + ' bg-destructive text-white hover:bg-destructive/90'}>{t.deleteYes}</button>
          <button type="button" onClick={() => setAsking(false)} className={ui.btnGhost}>{t.cancel}</button>
        </div>
      </div> : <button type="button" onClick={() => setAsking(true)} className="inline-flex items-center gap-1.5 text-sm text-muted underline decoration-edge-strong underline-offset-4 transition hover:text-destructive hover:decoration-destructive"><Trash size={15} />{t.deleteAccount}</button>}
    </div> : null}
  </div>;
}

/** One dialog for both doors: signing in for the free allowance, or pasting an own key; and, once in,
 *  the account menu. A modal <dialog>, so focus, Escape and the page behind work as the browser intends. */
export function AccessDialog() {
  const { dialog, notice, lang, info } = useAccess();
  const t = ACCESS_TEXT[lang];
  const ref = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (dialog && !element.open) element.showModal();
    if (!dialog && element.open) element.close();
  }, [dialog]);
  const signedOut = info ? !info.signedIn : true;
  const showSignIn = dialog === 'access' && signedOut && notice !== 'quota' && notice !== 'free_closed';
  return <dialog ref={ref} onClose={closeDialog} onClick={(event) => { if (event.target === ref.current) closeDialog(); }} aria-labelledby="access-title" className="acc-dialog">
    {dialog ? <div className="acc-panel">
      <div className="flex items-start justify-between gap-4">
        <h2 id="access-title" className="text-xl font-semibold tracking-tight">{dialog === 'account' ? t.account : t.title}</h2>
        <button type="button" onClick={closeDialog} aria-label={t.close} className="-mr-2 -mt-1 grid size-10 place-items-center rounded-full text-muted transition hover:bg-subtle hover:text-foreground"><X size={20} /></button>
      </div>
      {notice ? <p role="status" className="mt-3 rounded-2xl border border-safety/40 bg-safety-soft px-4 py-3 text-sm text-foreground">{t.notice[notice]}</p> : null}
      {showSignIn ? <>
        <p className="mt-2 text-[15px] text-muted">{t.lead(info?.free.perMonth ?? 3)}</p>
        <div className="mt-5"><SignInButtons lang={lang} back={path || '/'} /></div>
        <div className="my-6 flex items-center gap-3 text-xs text-faint"><span className="h-px flex-1 bg-edge" />{t.or}<span className="h-px flex-1 bg-edge" /></div>
        <h3 className="mb-1 font-semibold">{t.keyTitle}</h3>
        <p className="mb-3 text-sm text-muted">{t.keyLead}</p>
        <KeyForm lang={lang} />
        <p className="mt-6 text-xs text-faint">{t.stored} <Link href="/privacy" onClick={closeDialog} className="underline underline-offset-2 hover:text-foreground">{t.privacy}</Link></p>
      </> : <div className="mt-5"><Account lang={lang} /></div>}
    </div> : null}
  </dialog>;
}
