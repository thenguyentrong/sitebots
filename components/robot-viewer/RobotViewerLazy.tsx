'use client';

import dynamic from 'next/dynamic';
import type { ModelEntry } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';
import { ViewerSkeleton } from './ViewerSkeleton';

// three.js touches window at import time, so the viewer is loaded on the
// client only. The `ssr: false` boundary has to live in a client component;
// the server page imports this wrapper.
const RobotViewer = dynamic(() => import('./RobotViewer').then((m) => m.RobotViewer), {
  ssr: false,
  loading: () => <ViewerSkeleton />,
});

export function RobotViewerLazy(props: { entry: ModelEntry; presets: Record<string, Pose>; name: string; compact?: boolean }) {
  return <RobotViewer {...props} />;
}
