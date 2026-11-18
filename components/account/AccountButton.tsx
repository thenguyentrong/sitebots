'use client';

import { Key, UserCircle } from '@phosphor-icons/react';
import { ACCESS_TEXT, type Lang } from '@/lib/chat/i18n';
import { cn } from '@/lib/utils';
import { openDialog, useAccess } from './access-store';

/** The way in, top right on every page: "Sign in" until then, the account and what is left after. */
export function AccountButton({ lang, overlay = false }: { lang: Lang; overlay?: boolean }) {
  const { info, key } = useAccess();
  const t = ACCESS_TEXT[lang];
  // Same width while loading, so the menu next to it does not jump.
  if (!info) return <span className="inline-block h-9 w-20" aria-hidden />;
  // No sign-in set up yet: the adviser is open, so there is no door to show.
  if (!info.signedIn && !key && !info.signInNeeded) return null;
  if (!info.signedIn && !key) return <button type="button" onClick={() => openDialog('access')} className={cn('top-cta', overlay && 'shadow-lg')}>{t.signIn}</button>;
  const status = key ? t.ownKey : t.leftShort(info.free.left);
  return <button type="button" onClick={() => openDialog('account')} className="top-account" aria-label={t.account + ': ' + status}>
    {key ? <Key size={17} weight="bold" className="text-safety" /> : <UserCircle size={19} weight="bold" />}
    <span className="max-sm:hidden">{status}</span>
  </button>;
}
