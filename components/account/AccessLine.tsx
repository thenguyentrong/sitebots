'use client';

import { Key } from '@phosphor-icons/react';
import { ACCESS_TEXT, type Lang } from '@/lib/chat/i18n';
import { openDialog, removeKey, useAccess } from './access-store';

/** Under the chat box: what a consultation costs this person right now, and the one action that changes it. */
export function AccessLine({ lang }: { lang: Lang }) {
  const { info, key } = useAccess();
  const t = ACCESS_TEXT[lang];
  if (!info) return <p className="acc-line" aria-hidden>&nbsp;</p>;
  if (key) return <p className="acc-line"><Key size={14} weight="bold" className="text-safety" />{t.usingKey}<button type="button" onClick={removeKey} className="acc-action">{t.removeKey}</button></p>;
  if (info.signedIn) return <p className="acc-line">
    {info.free.left ? t.left(info.free.left, info.free.perMonth) : t.noneLeft}
    <button type="button" onClick={() => openDialog('account')} className="acc-action">{t.addKey}</button>
  </p>;
  if (!info.signInNeeded) return null;
  return <p className="acc-line">
    {t.line(info.free.perMonth)}
    <button type="button" onClick={() => openDialog('access')} className="acc-action">{t.signIn}</button>
  </p>;
}
