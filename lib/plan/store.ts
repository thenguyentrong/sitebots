'use client';

import { useSyncExternalStore } from 'react';
import { EMPTY_WORKSPACE, WorkspaceSchema, activeProject, type Project, type Workspace } from './model';

const KEY = 'sitebots.plan.v1';
let snapshot: Workspace | null = null;
let persistenceError = false;
const listeners = new Set<() => void>();
function load(): Workspace {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_WORKSPACE;
    const parsed = WorkspaceSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    persistenceError = true;
  } catch { persistenceError = true; }
  return EMPTY_WORKSPACE;
}
function changed() { for (const listener of listeners) listener(); }
function onStorage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) { snapshot = load(); changed(); }
}
function subscribe(listener: () => void) {
  if (snapshot === null || (listeners.size === 0 && !persistenceError)) snapshot = load();
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => { listeners.delete(listener); if (listeners.size === 0) window.removeEventListener('storage', onStorage); };
}
function commit(update: (current: Workspace) => Workspace) {
  snapshot = update(snapshot ?? load());
  try { localStorage.setItem(KEY, JSON.stringify(snapshot)); persistenceError = false; }
  catch { persistenceError = true; }
  changed();
}
export function usePlan() {
  const workspace = useSyncExternalStore(subscribe, () => snapshot, () => null);
  const project = activeProject(workspace);
  return {
    workspace, project, ready: workspace !== null, persistenceError,
    addProject: (next: Project) => commit((current) => current.projects.length >= 12 ? current : { ...current, activeId: next.id, projects: [...current.projects, next] }),
    selectProject: (id: string) => commit((current) => current.projects.some((item) => item.id === id) ? { ...current, activeId: id } : current),
    updateProject: (id: string, update: (item: Project) => Project) => commit((current) => ({ ...current, projects: current.projects.map((item) => item.id === id ? update(item) : item) })),
  };
}
