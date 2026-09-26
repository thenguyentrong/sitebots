'use client';

import { useSyncExternalStore } from 'react';
import type { CompanyContext } from '@/lib/context/schema';
import { readWorkspace } from './migrate';
import { EMPTY_WORKSPACE, activeProject, type Project, type Workspace } from './model';

export const PLAN_KEY = 'sitebots.plan.v2';
export const LEGACY_PLAN_KEY = 'sitebots.plan.v1';
let snapshot: Workspace | null = null;
let persistenceError = false;
const listeners = new Set<() => void>();
function load(): Workspace {
  try {
    const { workspace, migrated, error } = readWorkspace(localStorage.getItem(PLAN_KEY), localStorage.getItem(LEGACY_PLAN_KEY));
    persistenceError = error;
    // An old draft is carried over once. The old key stays as it is, so an older build still finds it.
    if (migrated) {
      try { localStorage.setItem(PLAN_KEY, JSON.stringify(workspace)); } catch { persistenceError = true; }
    }
    return workspace;
  } catch { persistenceError = true; }
  return EMPTY_WORKSPACE;
}
function changed() { for (const listener of listeners) listener(); }
function onStorage(event: StorageEvent) {
  if (event.key === PLAN_KEY || event.key === LEGACY_PLAN_KEY || event.key === null) { snapshot = load(); changed(); }
}
function subscribe(listener: () => void) {
  if (snapshot === null || (listeners.size === 0 && !persistenceError)) snapshot = load();
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => { listeners.delete(listener); if (listeners.size === 0) window.removeEventListener('storage', onStorage); };
}
function commit(update: (current: Workspace) => Workspace) {
  snapshot = update(snapshot ?? load());
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(snapshot)); persistenceError = false; }
  catch { persistenceError = true; }
  changed();
}
export const PROJECT_LIMIT = 12;
export function usePlan() {
  const workspace = useSyncExternalStore(subscribe, () => snapshot, () => null);
  const project = activeProject(workspace);
  return {
    workspace, project, context: workspace?.context ?? null, ready: workspace !== null, persistenceError,
    addProject: (next: Project) => commit((current) => current.projects.length >= PROJECT_LIMIT ? current : { ...current, activeId: next.id, projects: [...current.projects, next] }),
    /** Several at once (the library lets a visitor pick many tasks); returns how many fit into the remaining slots. */
    addProjects: (list: Project[]) => {
      let added = 0;
      commit((current) => {
        const next = list.slice(0, Math.max(0, PROJECT_LIMIT - current.projects.length));
        added = next.length;
        return next.length ? { ...current, activeId: next[0].id, projects: [...current.projects, ...next] } : current;
      });
      return added;
    },
    removeProject: (id: string) => commit((current) => {
      const projects = current.projects.filter(item => item.id !== id);
      return { ...current, projects, activeId: current.activeId === id ? projects[0]?.id ?? '' : current.activeId };
    }),
    selectProject: (id: string) => commit((current) => current.projects.some((item) => item.id === id) ? { ...current, activeId: id } : current),
    updateProject: (id: string, update: (item: Project) => Project) => commit((current) => ({ ...current, projects: current.projects.map((item) => item.id === id ? update(item) : item) })),
    updateContext: (patch: Partial<CompanyContext>) => commit((current) => ({ ...current, context: { ...current.context, ...patch, updatedAt: new Date().toISOString() } })),
  };
}
