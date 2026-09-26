'use client';

import { useEffect, useState } from 'react';
import type { PlanResponse } from '@/lib/plan/assessment';
import { matchable, requirementsFor, type Project } from '@/lib/plan/model';

/** Asks the catalogue about a project. The task's checked facts feed the request, so dust, floor and exposure reach the matcher. */
export function useAssessment(project: Project | undefined, ids?: string[], enabled = true) {
  const parsed = project ? requirementsFor(project) : null;
  const valid = Boolean(project && matchable(project));
  const key = enabled && valid && parsed?.success ? JSON.stringify({ requirements: parsed.data, ...(ids ? { ids } : {}) }) : '';
  const [state, setState] = useState<{ key: string; data?: PlanResponse; error?: string }>({ key: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: key, signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'The catalogue could not be checked.');
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : 'The catalogue could not be checked.' });
      });
    return () => controller.abort();
  }, [key, attempt]);
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    loading: Boolean(key && (state.key !== key || (!state.data && !state.error))),
    valid, retry: () => { setState({ key: '' }); setAttempt((value) => value + 1); },
  };
}
