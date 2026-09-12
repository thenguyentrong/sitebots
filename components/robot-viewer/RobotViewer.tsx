'use client';

import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, Text, useGLTF } from '@react-three/drei';
import { Group } from 'three';
import type { ModelEntry } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';
import { createRobotRig, modelBounds } from '@/lib/models/rig';
import { useRobotPose } from './useRobotPose';
import { CameraControls, type CameraCommand } from './CameraControls';
import { JointControls } from './JointControls';

const POSE_LABEL: Record<string, string> = { standing: 'Standing', reach_up: 'Reach up', carry: 'Carry', crouch: 'Crouch', sit: 'Sit' };
type PoseApi = { animating: boolean; pose: string; heightM: number; values: Pose; missing: string[] };
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

/**
 * The 1.80 m reference is a person in site clothing — hard hat, hi-vis vest,
 * work trousers, boots — because the question a robot page answers is "how big
 * is this next to the people on my site", not next to a grey mannequin.
 */
function HumanReference({ x, visible }: { x: number; visible: boolean }) {
  if (!visible) return null;
  const skin = <meshStandardMaterial color="#c99a72" roughness={0.8} />;
  const hat = <meshStandardMaterial color="#f5c400" roughness={0.45} />;
  const vest = <meshStandardMaterial color="#ff6a13" roughness={0.75} />;
  const stripe = <meshStandardMaterial color="#d9dde3" roughness={0.3} metalness={0.15} />;
  const shirt = <meshStandardMaterial color="#3a5a8a" roughness={0.85} />;
  const trousers = <meshStandardMaterial color="#3f4652" roughness={0.9} />;
  const boots = <meshStandardMaterial color="#4a3a2a" roughness={0.9} />;
  return (
    <group position={[x, 0, 0]}>
      {/* head, neck */}
      <mesh position={[0, 1.66, 0]}>
        <sphereGeometry args={[0.1, 24, 16]} />
        {skin}
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.06, 12]} />
        {skin}
      </mesh>
      {/* hard hat: dome, brim */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.115, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {hat}
      </mesh>
      <mesh position={[0, 1.69, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 24]} />
        {hat}
      </mesh>
      {/* torso: shirt under a hi-vis vest with two reflective bands */}
      <mesh position={[0, 1.27, 0]}>
        <capsuleGeometry args={[0.165, 0.42, 8, 16]} />
        {shirt}
      </mesh>
      <mesh position={[0, 1.27, 0]}>
        <cylinderGeometry args={[0.18, 0.19, 0.5, 20]} />
        {vest}
      </mesh>
      {[1.38, 1.14].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.186, 0.196, 0.035, 20]} />
          {stripe}
        </mesh>
      ))}
      {/* arms, hanging, hands bare */}
      {[-0.245, 0.245].map((dx) => (
        <group key={dx}>
          <mesh position={[dx, 1.2, 0]} rotation={[0, 0, dx < 0 ? 0.08 : -0.08]}>
            <capsuleGeometry args={[0.05, 0.5, 6, 12]} />
            {shirt}
          </mesh>
          <mesh position={[dx * 1.12, 0.88, 0]}>
            <sphereGeometry args={[0.05, 12, 10]} />
            {skin}
          </mesh>
        </group>
      ))}
      {/* legs and boots */}
      {[-0.1, 0.1].map((dx) => (
        <group key={dx}>
          <mesh position={[dx, 0.55, 0]}>
            <capsuleGeometry args={[0.075, 0.72, 6, 12]} />
            {trousers}
          </mesh>
          <mesh position={[dx, 0.07, 0.04]}>
            <boxGeometry args={[0.13, 0.14, 0.28]} />
            {boots}
          </mesh>
        </group>
      ))}
      <Text position={[0, 1.92, 0]} fontSize={0.09} color="#6b7280" anchorX="center" anchorY="bottom">
        1.80 m
      </Text>
    </group>
  );
}

function Ruler({ x, height }: { x: number; height: number }) {
  const top = Math.ceil(Math.max(height, 1.8) * 2) / 2;
  const ticks = [];
  for (let h = 0; h <= top + 1e-6; h += 0.5) ticks.push(h);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, top / 2, 0]}>
        <boxGeometry args={[0.004, top, 0.004]} />
        <meshBasicMaterial color="#9ca3af" />
      </mesh>
      {ticks.map((h) => (
        <group key={h} position={[0, h, 0]}>
          <mesh position={[-0.04, 0, 0]}>
            <boxGeometry args={[0.08, 0.004, 0.004]} />
            <meshBasicMaterial color="#9ca3af" />
          </mesh>
          <Text position={[-0.12, 0, 0]} fontSize={0.06} color="#6b7280" anchorX="right" anchorY="middle">
            {h.toFixed(1)}
          </Text>
        </group>
      ))}
    </group>
  );
}


export function RobotViewer({ entry, presets, name, compact = false }: { entry: ModelEntry; presets: Record<string, Pose>; name: string; compact?: boolean }) {
  const content = useRef<Group>(null);
  const container = useRef<HTMLDivElement>(null);
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
  const button = 'rounded-lg border border-edge bg-card/95 px-2.5 py-2 text-xs font-medium text-foreground shadow-sm transition hover:bg-subtle aria-pressed:bg-foreground aria-pressed:text-background disabled:opacity-40';
  return <div ref={container} className={expanded ? 'fixed inset-3 z-50 overflow-auto rounded-2xl border border-edge bg-card shadow-2xl sm:inset-6' : compact ? 'overflow-hidden' : 'card overflow-hidden'} data-robot-viewer data-ready={ready ? 'true' : 'false'} data-pose={api.pose} data-animating={api.animating} data-joint-values={JSON.stringify(api.values)} data-missing-joints={api.missing.join(',')}>
    <ModelBoundary key={entry.glbUrl} url={entry.glbUrl}>
      <div className={expanded ? 'relative h-[70vh] min-h-72' : 'relative aspect-[4/3]'}>
        <Canvas dpr={[1, 1.5]} frameloop="demand" shadows={false}
          fallback={<div role="alert" className="p-6 text-sm">3D needs WebGL. Photos and specifications are still available.</div>}
          gl={{ antialias: true, powerPreference: 'low-power', alpha: compact, preserveDrawingBuffer: compact }}
          camera={{ fov: 30, position: [3.2, 1.7, 3.6], near: 0.005, far: 100 }}>
          {compact ? null : <color attach="background" args={['#f6f6f7']} />}
          <ambientLight intensity={0.7} />
          <hemisphereLight args={['#ffffff', '#c8c4bb', 0.6]} />
          <directionalLight position={[4, 6, 3]} intensity={1.4} />
          <directionalLight position={[-4, 3, -2]} intensity={0.5} />
          <Suspense fallback={null}>
            <group ref={content}>
              <RobotModel entry={entry} pose={pose} initial={initial} setReady={setReady} onPoseApi={setApi} />
              <HumanReference x={half + 0.7} visible={scale} />
              {scale ? <Ruler x={-(half + 0.3)} height={entry.joints.modelHeightM || entry.heightM} /> : null}
            </group>

          </Suspense>
          {compact ? null : <Grid position={[0, 0, 0]} args={[12, 12]} cellSize={0.5} cellThickness={0.6} cellColor="#e4e4e7" sectionSize={1} sectionThickness={1} sectionColor="#cfcfd4" fadeDistance={10} fadeStrength={1.2} infiniteGrid />}
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
      <p className="border-t border-edge/70 px-3 py-2 text-xs text-muted">Drag to {mode === 'pan' ? 'pan' : 'rotate'} · Scroll or pinch to zoom · Right-drag or two fingers to pan</p>
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
          {c.stats.triangles.after.toLocaleString('en-GB')} triangles · {(c.stats.bytes / 1024).toFixed(0)} KB · {c.stats.joints} joints
        </p>
      </div>
    </details>
  );
}
