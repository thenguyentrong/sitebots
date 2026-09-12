'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { resolveJointValues, type JointValues } from '@/lib/models/joint-values';
import type { createRobotRig } from '@/lib/models/rig';
import type { JointDef } from '@/lib/models/schemas';

export function useRobotPose(rig: ReturnType<typeof createRobotRig>, joints: JointDef[], initial: JointValues) {
  const invalidate = useThree((s) => s.invalidate);
  const current = useRef<JointValues>({});
  const target = useRef<JointValues>({});
  const active = useRef(false);
  const [state, setState] = useState({ pose: 'standing', animating: false, revision: 0 });
  const [values, setValues] = useState<JointValues>(() => resolveJointValues(joints, initial));

  useLayoutEffect(() => {
    current.current = rig.apply(initial);
    target.current = { ...current.current };
    active.current = false;
    invalidate();
  }, [rig, initial, invalidate]);

  const setPose = useCallback((name: string, requested: JointValues) => {
    target.current = resolveJointValues(joints, requested);
    setValues(target.current);
    active.current = true;
    setState((s) => ({ pose: name, animating: true, revision: s.revision + 1 }));
    invalidate();
  }, [joints, invalidate]);

  useFrame((_, delta) => {
    if (!active.current) return;
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * 16);
    let maxDiff = 0;
    const next: JointValues = {};
    for (const [name, t] of Object.entries(target.current)) {
      const c = current.current[name] ?? 0;
      next[name] = c + (t - c) * k;
      maxDiff = Math.max(maxDiff, Math.abs(t - next[name]));
    }
    if (maxDiff < 0.0001) {
      current.current = rig.apply(target.current);
      active.current = false;
      setState((s) => ({ ...s, animating: false, revision: s.revision + 1 }));
    } else current.current = rig.apply(next);
    invalidate();
  });
  return { ...state, setPose, values };
}
