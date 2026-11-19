'use client';

import { useSyncExternalStore } from 'react';

// Who the visitor is to the adviser, shared by the header, the chat and the sign-in dialog: signed in or
// not, free consultations left, and their own API key if they use one. The key lives in this browser
// only: sessionStorage by default, localStorage when they ask to be remembered.

export type Provider = 'google' | 'microsoft';
export type AccountInfo = {
  signedIn: boolean; label: string | null; provider: Provider | null;
  free: { perMonth: number; left: number; open: boolean };
  providers: Provider[]; devLogin: boolean;
  /** False while the live site has no sign-in set up: then the adviser is open to everyone. */
  signInNeeded: boolean;
};
export type DialogMode = 'access' | 'account';
export type Notice = 'quota' | 'sign_in' | 'signin_failed' | 'free_closed' | 'bad_key' | null;
type State = { info: AccountInfo | null; key: string | null; dialog: DialogMode | null; notice: Notice };

const KEY = 'sitebots-api-key';
const PENDING = 'sitebots-pending-question';

let state: State = { info: null, key: null, dialog: null, notice: null };
const listeners = new Set<() => void>();
const emit = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

function storedKey(): string | null {
  try {
    return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

let loading: Promise<void> | null = null;
export function loadAccount(force = false): Promise<void> {
  if (loading && !force) return loading;
  loading = fetch('/api/account', { cache: 'no-store' })
    .then((response) => response.ok ? response.json() as Promise<AccountInfo> : null)
    .catch(() => null)
    .then((info) => emit({ info: info ?? { signedIn: false, label: null, provider: null, free: { perMonth: 3, left: 0, open: false }, providers: [], devLogin: false, signInNeeded: true } }));
  return loading;
}

let started = false;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started && typeof window !== 'undefined') {
    started = true;
    state = { ...state, key: storedKey() };
    void loadAccount();
  }
  return () => listeners.delete(listener);
}

const server: State = state;
export const useAccess = () => useSyncExternalStore(subscribe, () => state, () => server);

export const openDialog = (mode: DialogMode, notice: Notice = null) => emit({ dialog: mode, notice });
export const closeDialog = () => emit({ dialog: null, notice: null });
export const currentKey = () => state.key;

export function saveKey(key: string, remember: boolean) {
  try {
    (remember ? localStorage : sessionStorage).setItem(KEY, key);
    (remember ? sessionStorage : localStorage).removeItem(KEY);
  } catch {
    // Blocked storage: the key then lasts as long as the page.
  }
  emit({ key, dialog: null, notice: null });
}

export function removeKey() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored, nothing to remove.
  }
  emit({ key: null });
}

export async function signOut() {
  await fetch('/api/auth/signout', { method: 'POST' }).catch(() => null);
  emit({ dialog: null });
  await loadAccount(true);
}

export async function deleteAccount(): Promise<boolean> {
  const response = await fetch('/api/account', { method: 'DELETE' }).catch(() => null);
  if (!response?.ok) return false;
  emit({ dialog: null });
  await loadAccount(true);
  return true;
}

/** True when a message can go out right now: their own key, or a free consultation that is open. */
export const canAsk = (s: State, continuing: boolean) => Boolean(s.key)
  || Boolean(s.info && !s.info.signedIn && !s.info.signInNeeded && s.info.free.open)
  || Boolean(s.info?.signedIn && s.info.free.open && (continuing || s.info.free.left > 0));

/** The question someone typed before they had to sign in, kept for after the round trip. */
export function keepQuestion(text: string) {
  try { sessionStorage.setItem(PENDING, text); } catch { /* the question is then typed again */ }
}
export function takeQuestion(): string | null {
  try {
    const text = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    return text;
  } catch {
    return null;
  }
}
