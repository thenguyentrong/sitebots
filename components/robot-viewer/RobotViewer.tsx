'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Bounds, ContactShadows, Grid, OrbitControls, Text, useGLTF } from '@react-three/drei';
import { Group, MeshStandardMaterial, type Mesh } from 'three';
import type { ModelEntry } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';
import { useRobotPose, worldBounds } from './useRobotPose';

/**
 * The model, ground-snapped, with pose presets and a 1.80 m human silhouette
 * for scale. Demand-rendered: nothing runs between interactions. No HDR
 * environment maps — they would be fetched from a third-party CDN.
 */

const POSE_LABEL: Record<string, string> = { standing: 'Standing', reach_up: 'Reach up', carry: 'Carry', crouch: 'Crouch', sit: 'Sit' };

type PoseApi = { animating: boolean; pose: string; heightM: number };

function RobotModel({ entry, pose, initial, setReady, onPoseApi }: { entry: ModelEntry; pose: { name: string; values: Pose } | null; initial: Pose; setReady: (v: boolean) => void; onPoseApi: (api: PoseApi) => void }) {
  const { scene } = useGLTF(entry.glbUrl, false, true);
  const group = useRef<Group>(null);
  const [offset, setOffset] = useState(0);
  const api = useRobotPose(scene, entry.joints.joints, initial);

  useEffect(() => {
    // Matte, slightly rough surfaces read better on a pale ground than the raw material.
    scene.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh && m.material instanceof MeshStandardMaterial) {
        m.material.roughness = Math.max(m.material.roughness, 0.55);
        m.castShadow = true;
      }
    });
    setOffset(-worldBounds(scene).minY);
    setReady(true);
  }, [scene, setReady]);

  // Keyed on the stable callback, not on `api`: that object is rebuilt every
  // render, and re-running this effect would restart the pose it just finished.
  const { setPose } = api;
  useEffect(() => {
    if (pose) setPose(pose.name, pose.values);
  }, [pose, setPose]);

  useEffect(() => {
    // Once a pose has settled, snap the feet back to the floor and report the posed height.
    const b = api.animating ? null : worldBounds(scene);
    if (b) setOffset(-b.minY);
    onPoseApi({ animating: api.animating, pose: api.pose, heightM: b ? b.maxY - b.minY : entry.joints.modelHeightM });
  }, [api.animating, api.pose, onPoseApi, scene, entry.joints.modelHeightM]);

  return (
    <group ref={group} position={[0, offset, 0]}>
      <primitive object={scene} />
    </group>
  );
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

function ResizeInvalidate() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const on = () => invalidate();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [invalidate]);
  return null;
}

export function RobotViewer({ entry, presets, name, compact = false }: { entry: ModelEntry; presets: Record<string, Pose>; name: string; compact?: boolean }) {
  const [ready, setReady] = useState(false);
  const [pose, setPose] = useState<{ name: string; values: Pose } | null>(null);
  const [scale, setScale] = useState(true);
  const [api, setApi] = useState<PoseApi>({ animating: false, pose: 'standing', heightM: entry.joints.modelHeightM });
  const half = useMemo(() => Math.max(0.5, entry.heightM * 0.45), [entry.heightM]);
  const initial = useMemo(() => presets.standing ?? {}, [presets]);

  useEffect(() => {
    if (compact) return setScale(false);
    try {
      setScale(localStorage.getItem('sitebots.scale') !== '0');
    } catch {
      // default on
    }
  }, [compact]);
  useEffect(() => {
    (window as unknown as { __robotViewer?: unknown }).__robotViewer = { ready, ...api };
  }, [ready, api]);

  const presetNames = Object.keys(presets).filter((p) => p === 'standing' || Object.keys(presets[p]).length > 0);

  return (
    <div className={compact ? 'overflow-hidden' : 'card overflow-hidden'} data-robot-viewer data-ready={ready ? 'true' : 'false'}>
      <div className="relative aspect-[4/3]">
        <Canvas
          dpr={[1, 1.5]}
          frameloop="demand"
          shadows={false}
          gl={{ antialias: true, powerPreference: 'low-power', alpha: compact, preserveDrawingBuffer: compact }}
          camera={{ fov: 30, position: [3.2, 1.7, 3.6], near: 0.05, far: 60 }}
        >
          {compact ? null : <color attach="background" args={['#f6f6f7']} />}
          <ambientLight intensity={0.7} />
          <hemisphereLight args={['#ffffff', '#c8c4bb', 0.6]} />
          <directionalLight position={[4, 6, 3]} intensity={1.4} />
          <directionalLight position={[-4, 3, -2]} intensity={0.5} />
          <Suspense fallback={null}>
            {/* Robot and reference figure are framed together; the fit re-runs when the toggle changes what is in view. */}
            <Bounds fit clip observe margin={compact ? 1.02 : 1.15} key={`${scale ? 'with-scale' : 'robot-only'}-${compact ? 'tight' : 'roomy'}`}>
              <RobotModel entry={entry} pose={pose} initial={initial} setReady={setReady} onPoseApi={setApi} />
              <HumanReference x={half + 0.7} visible={scale} />
              {scale ? <Ruler x={-(half + 0.3)} height={entry.joints.modelHeightM || entry.heightM} /> : null}
            </Bounds>
            {compact ? null : <ContactShadows position={[0, 0.001, 0]} opacity={0.35} blur={2.2} scale={8} far={2} />}
          </Suspense>
          {compact ? null : (
            <Grid position={[0, 0, 0]} args={[12, 12]} cellSize={0.5} cellThickness={0.6} cellColor="#e4e4e7" sectionSize={1} sectionThickness={1} sectionColor="#cfcfd4" fadeDistance={10} fadeStrength={1.2} infiniteGrid />
          )}
          <OrbitControls makeDefault enablePan={false} minDistance={0.8} maxDistance={9} minPolarAngle={0.15} maxPolarAngle={Math.PI / 2 + 0.05} target={[0, entry.heightM / 2, 0]} />
          <ResizeInvalidate />
        </Canvas>
        {!ready ? <div className="absolute inset-0 flex items-center justify-center text-sm text-faint"><span className="rounded-full border border-edge bg-card px-3 py-1 shadow-sm">Loading {name}…</span></div> : null}
      </div>
      {compact ? null : (
      <div className="flex flex-wrap items-center gap-1.5 border-t border-edge/70 px-3 py-2.5 text-sm">
        {presetNames.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={api.pose === p}
            onClick={() => setPose({ name: p, values: presets[p] })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${api.pose === p ? 'border-foreground bg-foreground text-background' : 'border-edge bg-card text-muted hover:border-edge-strong hover:text-foreground'}`}
          >
            {POSE_LABEL[p] ?? p.replace(/_/g, ' ')}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={scale}
            onChange={(e) => {
              setScale(e.target.checked);
              try {
                localStorage.setItem('sitebots.scale', e.target.checked ? '1' : '0');
              } catch {
                // fine
              }
            }}
            className="h-3.5 w-3.5 rounded accent-[var(--foreground)]"
          />
          Show 1.80 m person
        </label>
        <span className="num text-xs text-faint" title="Height of the model in the current pose">model {api.heightM.toFixed(2)} m</span>
      </div>
      )}
      {compact ? null : <ModelCredits entry={entry} />}
    </div>
  );
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
