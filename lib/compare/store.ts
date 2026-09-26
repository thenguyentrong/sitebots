'use client';

import { useSyncExternalStore } from 'react';

export type CompareItem = { id: string; name: string };
const KEY = 'sitebots.compare';
const MAX = 4;
const EMPTY = { items: [] as CompareItem[], ready: false };
let snapshot = EMPTY;
const listeners = new Set<() => void>();

function parse(raw: string | null): CompareItem[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((item): item is CompareItem => {
      if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' ||
          !item.id.trim() || item.id.length > 128 || !item.name.trim() || item.name.length > 200 || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, MAX).map(({ id, name }) => ({ id, name }));
  } catch { return []; }
}

function getSnapshot() {
  if (!snapshot.ready) {
    let items: CompareItem[] = [];
    try { items = parse(localStorage.getItem(KEY)); } catch { /* Browsing still works without storage. */ }
    snapshot = { items, ready: true };
  }
  return snapshot;
}

function onStorage(event: StorageEvent) {
  if (event.key !== KEY && event.key !== null) return;
  snapshot = { items: parse(event.newValue), ready: true };
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener('storage', onStorage);
  };
}

function write(items: CompareItem[]) {
  snapshot = { items, ready: true };
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* Keep one shared in-memory selection for this visit. */ }
  listeners.forEach(listener => listener());
}

function toggle(item: CompareItem) {
  const current = getSnapshot().items;
  write(current.some(x => x.id === item.id) ? current.filter(x => x.id !== item.id) : [...current, item].slice(0, MAX));
}

export function comparisonHref(items: CompareItem[]) {
  return '/compare?' + new URLSearchParams({ ids: items.map(x => x.id).join(',') });
}

export function useCompare() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return { ...state, toggle, clear: () => write([]), full: state.items.length >= MAX };
}
