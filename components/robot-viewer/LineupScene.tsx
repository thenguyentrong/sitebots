'use client';

import { Suspense, useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Text, useGLTF } from '@react-three/drei';
import { AgXToneMapping, Box3 } from 'three';
import type { ModelEntry } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';
import { createRobotRig } from '@/lib/models/rig';
import { Studio, WORKER_URL } from './RobotViewer';

export type LineupItem = { key: string; entry: ModelEntry; pose: Pose; turn: number };
type Size = { width: number; minX: number };

const GAP = 0.4;
const LEAD = 0.8;
const WORKER_TURN = -1.0;

/** One robot, posed standing, turned towards the camera, standing on y = 0. Reports its footprint once posed. */
function Posed({ item, x, onSize }: { item: LineupItem; x: number; onSize: (key: string, size: Size) => void }) {
  const { scene } = useGLTF(item.entry.glbUrl, false, true);
  const rig = useMemo(() => createRobotRig(scene, item.entry.joints.joints), [scene, item.entry.joints.joints]);
  const [lift, setLift] = useState(0);
  useLayoutEffect(() => {
    rig.apply(item.pose);
    rig.scene.rotation.y = item.turn;
    rig.scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(rig.scene);
    setLift(-box.min.y);
    onSize(item.key, { width: box.max.x - box.min.x, minX: box.min.x });
  }, [rig, item, onSize]);
  return <group position={[x, lift, 0]}><primitive object={rig.scene} dispose={null} /></group>;
}

/** The site worker from the viewer, turned like the humanoids, standing first in the row. */
function Worker({ x, turn, onSize }: { x: number; turn: number; onSize: (key: string, size: Size) => void }) {
  const { scene } = useGLTF(WORKER_URL, false, true);
  const copy = useMemo(() => scene.clone(true), [scene]);
  useLayoutEffect(() => {
    copy.rotation.y = turn;
    copy.updateMatrixWorld(true);
    const box = new Box3().setFromObject(copy);
    onSize('worker', { width: box.max.x - box.min.x, minX: box.min.x });
  }, [copy, turn, onSize]);
  return <group position={[x, 0, 0]}><primitive object={copy} /></group>;
}

/** A site worker's height across the whole row: the scale every robot is read against. */
function HeightLine({ width }: { width: number }) {
  return <group position={[0, 1.8, -0.6]}>
    <mesh position={[width / 2, 0, 0]}>
      <boxGeometry args={[width, 0.012, 0.012]} />
      <meshBasicMaterial color="#fb923c" toneMapped={false} />
    </mesh>
    <Text position={[0.02, 0.07, 0]} fontSize={0.2} color="#d4d4d8" anchorX="left" anchorY="bottom">1.80 m</Text>
  </group>;
}

function Framing({ width, ready }: { width: number; ready: boolean }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const aspect = size.width / size.height;
    const fov = 14;
    const halfW = width / 2 + 0.25;
    const halfH = 1.02;
    const distW = halfW / (Math.tan((fov * Math.PI) / 360) * aspect);
    const distH = halfH / Math.tan((fov * Math.PI) / 360);
    const dist = Math.max(distW, distH);
    camera.position.set(width / 2, 1.25, dist);
    camera.lookAt(width / 2, 0.93, 0);
    (camera as unknown as { fov: number }).fov = fov;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, width, invalidate]);
  return ready ? null : null;
}

/**
 * The landing's lineup: real catalogue robots rendered from their published
 * descriptions, at true scale next to a 1.80 m site worker, with a line at his height.
 * Used only to make the still image; the page itself shows the image.
 */
export function LineupRender({ items }: { items: LineupItem[] }) {
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const onSize = useCallback((key: string, size: Size) => setSizes((s) => (s[key]?.width === size.width && s[key]?.minX === size.minX ? s : { ...s, [key]: size })), []);
  const ready = Boolean(sizes.worker) && items.every((i) => sizes[i.key]);
  let cursor = LEAD;
  const xs: Record<string, number> = {};
  const worker = sizes.worker ?? { width: 0.6, minX: -0.3 };
  const workerX = cursor - worker.minX;
  cursor += worker.width + GAP;
  for (const item of items) {
    const s = sizes[item.key] ?? { width: 1, minX: -0.5 };
    xs[item.key] = cursor - s.minX;
    cursor += s.width + GAP;
  }
  const width = cursor - GAP;
  return <div data-lineup data-ready={ready ? 'true' : 'false'} style={{ width: '100%', aspectRatio: '12 / 5' }}>
    <Canvas dpr={2} frameloop="demand" gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => { gl.toneMapping = AgXToneMapping; gl.toneMappingExposure = 1.05; }}
      camera={{ fov: 14, position: [0, 1.35, 14], near: 0.05, far: 100 }}>
      <hemisphereLight args={['#ffffff', '#1c1c20', 0.35]} />
      <directionalLight position={[3, 6, 5]} intensity={1.8} />
      <directionalLight position={[-4, 3, -3]} intensity={0.7} />
      <Studio />
      <Suspense fallback={null}>
        <HeightLine width={width} />
        <Worker x={workerX} turn={WORKER_TURN} onSize={onSize} />
        {items.map((item) => <Posed key={item.key} item={item} x={xs[item.key]} onSize={onSize} />)}
        <ContactShadows position={[width / 2, 0.001, 0]} scale={[width + 2, 3]} resolution={2048} blur={2.4} far={2.5} opacity={0.8} color="#000000" frames={Infinity} />
      </Suspense>
      <Framing width={width} ready={ready} />
    </Canvas>
  </div>;
}
