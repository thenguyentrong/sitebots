'use client';

import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Grid, Lightformer, Text, useGLTF } from '@react-three/drei';
import { AgXToneMapping, Group } from 'three';
import type { ModelEntry } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';
import { createRobotRig, modelBounds } from '@/lib/models/rig';
import { useRobotPose } from './useRobotPose';
import { CameraControls, type CameraCommand } from './CameraControls';
import { JointControls } from './JointControls';

const POSE_LABEL: Record<string, string> = { standing: 'Rest pose', reach_up: 'Reach up', carry: 'Carry', crouch: 'Crouch', sit: 'Sit' };
type PoseApi = { animating: boolean; pose: string; heightM: number; values: Pose; missing: string[] };

type SceneColors = { dark: boolean; cell: string; section: string; ink: string; line: string };
const LIGHT: SceneColors = { dark: false, cell: '#e4e4e7', section: '#d4d4d8', ink: '#71717a', line: '#a1a1aa' };
const DARK: SceneColors = { dark: true, cell: '#232327', section: '#34343a', ink: '#8b8b94', line: '#52525b' };

/** The scene follows the page theme: system preference, overridden by data-theme on <html>. */
function useSceneColors(): SceneColors {
  const [colors, setColors] = useState<SceneColors>(DARK);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const read = () => {
      const forced = document.documentElement.getAttribute('data-theme');
      setColors((forced ? forced === 'dark' : media.matches) ? DARK : LIGHT);
    };
    read();
    media.addEventListener('change', read);
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { media.removeEventListener('change', read); observer.disconnect(); };
  }, []);
  return colors;
}

function RobotModel({ entry, pose, initial, setReady, onPoseApi }: { entry: ModelEntry; pose: { name: string; values: Pose } | null; initial: Pose; setReady: (v: boolean) => void; onPoseApi: (api: PoseApi) => void }) {
  const { scene } = useGLTF(entry.glbUrl, false, true);
  const rig = useMemo(() => createRobotRig(scene, entry.joints.joints), [scene, entry.joints.joints]);
  const [offset, setOffset] = useState(0);
  const api = useRobotPose(rig, entry.joints.joints, initial);
  const { setPose } = api;
  useEffect(() => { if (pose) setPose(pose.name, pose.values); }, [pose, setPose]);
  useLayoutEffect(() => {
    if (api.animating) {
      onPoseApi({ animating: true, pose: api.pose, heightM: entry.joints.modelHeightM, values: api.values, missing: rig.missing });
      return;
    }
    const bounds = modelBounds(rig.scene);
    setOffset(-bounds.min.y);
    onPoseApi({ animating: false, pose: api.pose, heightM: bounds.max.y - bounds.min.y, values: api.values, missing: rig.missing });
    setReady(true);
  }, [api.animating, api.pose, api.revision, api.values, entry.joints.modelHeightM, rig, setReady, onPoseApi]);
  return <group position={[0, offset, 0]}><primitive object={rig.scene} dispose={null} /></group>;
}

class ModelBoundary extends Component<{ children: ReactNode; url: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="flex aspect-[4/3] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted">
      <p>The 3D model could not load. You can still browse the robot’s photos and specifications.</p>
      <button type="button" className="rounded-lg border border-edge px-3 py-2" onClick={() => { useGLTF.clear(this.props.url); this.setState({ failed: false }); }}>Retry 3D model</button>
    </div>;
    return this.props.children;
  }
}

/** The site worker mesh: 1.80 m to the top of the head, feet on y = 0, facing +x like the robots. */
export const WORKER_URL = '/models/reference/construction-worker.glb';

function Worker() {
  const { scene } = useGLTF(WORKER_URL, false, true);
  const copy = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={copy} />;
}

/**
 * The 1.80 m reference is a construction worker (hard hat, hi-vis vest,
 * boots) because the question a robot page answers is "how big is this next
 * to the people on my site", not next to a grey mannequin.
 */
export function HumanReference({ x, visible, ink, label = true }: { x: number; visible: boolean; ink: string; label?: boolean }) {
  if (!visible) return null;
  return (
    <group position={[x, 0, 0]}>
      <Worker />
      {label ? <Text position={[0, 1.95, 0]} fontSize={0.09} color={ink} anchorX="center" anchorY="bottom">
        1.80 m
      </Text> : null}
    </group>
  );
}

function Ruler({ x, height, colors }: { x: number; height: number; colors: SceneColors }) {
  const top = Math.ceil(Math.max(height, 1.8) * 2) / 2;
  const ticks = [];
  for (let h = 0; h <= top + 1e-6; h += 0.5) ticks.push(h);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, top / 2, 0]}>
        <boxGeometry args={[0.004, top, 0.004]} />
        <meshBasicMaterial color={colors.line} />
      </mesh>
      {ticks.map((h) => (
        <group key={h} position={[0, h, 0]}>
          <mesh position={[-0.04, 0, 0]}>
            <boxGeometry args={[0.08, 0.004, 0.004]} />
            <meshBasicMaterial color={colors.line} />
          </mesh>
          <Text position={[-0.12, 0, 0]} fontSize={0.06} color={colors.ink} anchorX="right" anchorY="middle">
            {h.toFixed(1)}
          </Text>
        </group>
      ))}
    </group>
  );
}

/**
 * A studio in the scene itself: one large softbox overhead and two strips at
 * the sides, rendered once into the environment map. Nothing is downloaded,
 * and painted covers and metal joints pick up real reflections.
 */
export function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.2} position={[0, 5, 1]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 6, 1]} />
      <Lightformer form="rect" intensity={1.4} position={[-5, 1.5, 1]} rotation={[0, Math.PI / 2, 0]} scale={[3, 6, 1]} />
      <Lightformer form="rect" intensity={0.9} position={[5, 2, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 6, 1]} />
      <Lightformer form="rect" intensity={0.6} position={[0, 1.5, -5]} scale={[8, 3, 1]} />
    </Environment>
  );
}

export function RobotViewer({ entry, presets, name, compact = false, fill = false }: { entry: ModelEntry; presets: Record<string, Pose>; name: string; compact?: boolean; fill?: boolean }) {
  const content = useRef<Group>(null);
  const container = useRef<HTMLDivElement>(null);
  const colors = useSceneColors();
  const [ready, setReady] = useState(false);
  const [pose, setPose] = useState<{ name: string; values: Pose } | null>(null);
  const [scale, setScale] = useState(!compact);
  const [mode, setMode] = useState<'rotate' | 'pan'>('rotate');
  const [expanded, setExpanded] = useState(false);
  const [command, setCommand] = useState<CameraCommand>({ name: 'fit', id: 0 });
  const initial = useMemo(() => presets.standing ?? {}, [presets]);
  const [api, setApi] = useState<PoseApi>({ animating: false, pose: 'standing', heightM: entry.joints.modelHeightM, values: initial, missing: [] });
  const half = Math.max(0.5, entry.heightM * 0.45);
  const cameraAction = (name: CameraCommand['name']) => setCommand((c) => ({ name, id: c.id + 1 }));
  useEffect(() => {
    if (compact) return;
    try { setScale(localStorage.getItem('sitebots.scale') !== '0'); } catch { /* Storage is optional. */ }
  }, [compact]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [expanded]);
  useEffect(() => {
    // Kept for the render/export harness; per-viewer data attributes also support multiple viewers.
    (window as unknown as { __robotViewer?: unknown }).__robotViewer = { ready, ...api };
  }, [ready, api]);
  const resetJoints = useCallback(() => setPose({ name: 'standing', values: initial }), [initial]);
  const changeJoint = (joint: string, value: number) => setPose((p) => ({ name: 'custom', values: { ...(p?.values ?? initial), [joint]: value } }));
  const presetNames = Object.keys(presets).filter((p) => p === 'standing' || Object.keys(presets[p]).length > 0);
  const button = 'rounded-lg border border-edge bg-card/90 px-2.5 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-subtle aria-pressed:bg-foreground aria-pressed:text-background disabled:opacity-40';
  return <div ref={container} className={expanded ? 'fixed inset-3 z-50 overflow-auto rounded-2xl border border-edge bg-card shadow-2xl sm:inset-6' : compact ? (fill ? 'h-full overflow-hidden' : 'overflow-hidden') : 'card overflow-hidden'} data-robot-viewer data-ready={ready ? 'true' : 'false'} data-pose={api.pose} data-animating={api.animating} data-joint-values={JSON.stringify(api.values)} data-missing-joints={api.missing.join(',')}>
    <ModelBoundary key={entry.glbUrl} url={entry.glbUrl}>
      <div className={(expanded ? 'relative h-[70vh] min-h-72' : fill ? 'relative h-full' : 'relative aspect-[4/3]') + (compact ? '' : ' viewer-stage')}>
        <Canvas dpr={[1, 2]} frameloop="demand" shadows={false}
          fallback={<div role="alert" className="p-6 text-sm">3D needs WebGL. Photos and specifications are still available.</div>}
          gl={{ antialias: true, powerPreference: 'high-performance', alpha: true, preserveDrawingBuffer: compact }}
          onCreated={({ gl }) => { gl.toneMapping = AgXToneMapping; gl.toneMappingExposure = 1.05; }}
          camera={{ fov: 30, position: [3.2, 1.7, 3.6], near: 0.005, far: 100 }}>
          <hemisphereLight args={['#ffffff', colors.dark ? '#1c1c20' : '#d8d6d0', colors.dark ? 0.35 : 0.5]} />
          <directionalLight position={[3, 6, 4]} intensity={1.8} />
          <directionalLight position={[-4, 3, -3]} intensity={0.7} />
          <Studio />
          <Suspense fallback={null}>
            <group ref={content}>
              <RobotModel entry={entry} pose={pose} initial={initial} setReady={setReady} onPoseApi={setApi} />
              <HumanReference x={half + 0.7} visible={scale} ink={colors.ink} />
              {scale ? <Ruler x={-(half + 0.3)} height={entry.joints.modelHeightM || entry.heightM} colors={colors} /> : null}
            </group>
            <ContactShadows position={[0, 0.001, 0]} scale={8} resolution={1024} blur={2.2} far={2.5} opacity={colors.dark ? 0.75 : 0.45} color="#000000" />
          </Suspense>
          {compact ? null : <Grid position={[0, -0.001, 0]} args={[12, 12]} cellSize={0.5} cellThickness={0.6} cellColor={colors.cell} sectionSize={1} sectionThickness={1} sectionColor={colors.section} fadeDistance={9} fadeStrength={1.4} infiniteGrid />}
          <CameraControls content={content} ready={ready} scale={scale} mode={mode} command={command} compact={compact} />
        </Canvas>
        {!ready ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-faint"><span className="rounded-full border border-edge bg-card px-3 py-1 shadow-sm">Loading {name}…</span></div> : null}
        {compact ? null : <>
          <div className="absolute left-3 top-3 flex gap-1" role="group" aria-label="Drag mode">
            <button type="button" className={button} aria-pressed={mode === 'rotate'} onClick={() => setMode('rotate')}>Rotate</button>
            <button type="button" className={button} aria-pressed={mode === 'pan'} onClick={() => setMode('pan')}>Pan</button>
          </div>
          <div className="absolute right-3 top-3 flex gap-1">
            <button type="button" className={button} aria-label="Zoom in" disabled={!ready} onClick={() => cameraAction('in')}>+</button>
            <button type="button" className={button} aria-label="Zoom out" disabled={!ready} onClick={() => cameraAction('out')}>−</button>
            <button type="button" className={button} aria-label={expanded ? 'Close expanded view' : 'Expand 3D view'} onClick={() => setExpanded((v) => !v)}>{expanded ? 'Close' : 'Expand'}</button>
          </div>
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1" role="group" aria-label="Camera views">
            {(['fit', 'front', 'side', 'top'] as const).map((view) => <button key={view} type="button" className={button} disabled={!ready} onClick={() => cameraAction(view)}>{view === 'fit' ? 'Reset view' : view[0].toUpperCase() + view.slice(1)}</button>)}
          </div>
        </>}
      </div>
    </ModelBoundary>
    {compact ? null : <>
      <p className="border-t border-edge/70 px-3 py-2 text-xs text-muted">Drag to {mode === 'pan' ? 'pan' : 'rotate'}. Scroll or pinch to zoom. Right-drag or two fingers to pan.</p>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-edge/70 px-3 py-2.5 text-sm">
        {presetNames.map((p) => <button key={p} type="button" data-pose-preset={p} aria-pressed={api.pose === p} disabled={!ready} onClick={() => setPose({ name: p, values: presets[p] })}
          className={'rounded-full border px-3 py-1 text-xs font-medium transition ' + (api.pose === p ? 'border-foreground bg-foreground text-background' : 'border-edge bg-card text-muted hover:border-edge-strong hover:text-foreground')}>{POSE_LABEL[p] ?? p.replace(/_/g, ' ')}</button>)}
        {api.pose === 'custom' ? <span className="rounded-full bg-subtle px-3 py-1 text-xs">Custom pose</span> : null}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" checked={scale} onChange={(event) => { setScale(event.target.checked); try { localStorage.setItem('sitebots.scale', event.target.checked ? '1' : '0'); } catch { /* Storage is optional. */ } }} className="h-3.5 w-3.5 rounded accent-[var(--foreground)]" />Show 1.80 m person</label>
        <span className="num text-xs text-faint" title="Height of the model in the current pose">model {api.heightM.toFixed(2)} m</span>
      </div>
      <JointControls joints={entry.joints.joints.filter((j) => !api.missing.includes(j.name))} values={api.values} onChange={changeJoint} onReset={resetJoints} disabled={!ready} />
      <ModelCredits entry={entry} />
    </>}
  </div>;
}

function ModelCredits({ entry }: { entry: ModelEntry }) {
  const c = entry.credits;
  return (
    <details className="border-t border-edge/70 px-3 py-2 text-xs text-muted">
      <summary className="cursor-pointer">Model credits and licence</summary>
      <div className="mt-2 space-y-1">
        <p>
          Source:{' '}
          <a href={c.source.url} rel="noopener" target="_blank" className="underline-offset-2 hover:underline">
            {c.source.repo}
          </a>{' '}
          @ <span className="num">{c.source.sha.slice(0, 7)}</span>, {c.source.path}/{c.source.urdf}
        </p>
        <p>{c.license.copyright}</p>
        <p>
          Licence:{' '}
          <a href={c.license.file} rel="noopener" target="_blank" className="underline-offset-2 hover:underline">
            {c.license.spdx}
          </a>{' '}
          (full text). Not endorsed by the manufacturer.
        </p>
        <p>Modified by sitebots: {c.modifications.join('; ')}.</p>
        <p className="num">
          {c.stats.triangles.after.toLocaleString('en-GB')} triangles, {(c.stats.bytes / 1024).toFixed(0)} KB, {c.stats.joints} joints
        </p>
      </div>
    </details>
  );
}
