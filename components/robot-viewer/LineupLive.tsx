'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls, useGLTF } from '@react-three/drei';
import { Box3, DirectionalLight, Matrix4, DoubleSide, EquirectangularReflectionMapping, PMREMGenerator, SRGBColorSpace, TextureLoader, Vector3, type Group, type Mesh, type MeshBasicMaterial, type Object3D, type PerspectiveCamera } from 'three';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import type { ModelEntry } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';
import { createRobotRig } from '@/lib/models/rig';
import { WORKER_URL } from './RobotViewer';
import { taskFor, type PropSpec, type Task } from './lineupTasks';

// The landing's job site: catalogue robots at true scale next to a 1.80 m site worker, each acting
// out a job from the map with its props (lineupTasks.ts), on the photographed concrete of a
// construction yard. The row turns under the mouse; a robot pointed at stops, faces the visitor and
// says what it is doing; a click opens its page.

export type LiveItem = { key: string; name: string; href: string; heightM: number; entry: ModelEntry; presets: Record<string, Pose>; turn: number };
type Size = { width: number; minX: number };
type Footprint = { lift: number; cx: number; cy: number; cz: number; w: number; h: number; d: number; top: number };

const DEG = Math.PI / 180;
/** The site worker's eye height. The camera stands there and looks level, so the photo's horizon, the
 *  orange line and the top of his head coincide at any distance: what reaches the horizon is 1.80 m. */
const EYE = 1.8;
/** Camera to row (m): a wide lens close up keeps the photo sharp; heights stay comparable because the
 *  row stands square to the view. */
const DISTANCE = 7;
/** Room between bodies for the props, and free ground at both ends of the row. */
const GAP = 0.7;
const LEAD = 0.8;
const WORKER_TURN = -1.0;
/** Poly Haven "Construction Yard" (CC0, public/env/NOTICE.txt), the photo of the ctrl-rwth.de hero,
 *  turned so the row stands on its open concrete with brick pallets and apartment blocks behind it and
 *  the hazy sun to the right, its shadows falling towards the viewer. */
const YARD = { photo: '/env/yard_4k.webp', light: '/env/yard_light.hdr', rotation: 100 * DEG, radius: 90, tint: 0.85 };
/** Where the sun is in that photo. */
const SUN = { elevation: 33.7 * DEG, azimuth: 35.9 * DEG };
/** Facing +x is the models' rest; a quarter turn back faces the camera. */
const FACE_CAMERA = -Math.PI / 2;

/** Pointer hits go to one invisible box per robot, not to 150,000 triangles per model; every mesh casts a shadow. */
const prepare = (object: Object3D) => object.traverse((child) => {
  if (!(child as Mesh).isMesh) return;
  (child as Mesh).raycast = () => {};
  child.castShadow = true;
});
/** Bounds in the parent's frame: the layout effects may run again (Suspense shows the row again) after the
 *  row has been placed, and a world box would then carry the robot's own offset. */
const localBox = (object: Object3D) => {
  object.parent?.updateWorldMatrix(true, false);
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  return object.parent ? box.applyMatrix4(new Matrix4().copy(object.parent.matrixWorld).invert()) : box;
};
const short = (name: string) => name.replace(/^(Unitree|Boston Dynamics)\s+/, '');
const metres = (value: number) => value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';

/** Pixels per metre at the row, and the screen row of the horizon, which is the 1.80 m line. On the
 *  landing the row stands on the headline (feet at `floor` px), fills the width and keeps the line below
 *  `ceiling`; the strip for phones shows the row alone. */
function viewFor(row: number, width: number, height: number, mode: 'hero' | 'strip', floor: number, ceiling: number) {
  if (mode === 'strip') {
    const scale = Math.min((width - 32) / row, (height * 0.64) / EYE);
    return { scale, horizon: height * 0.17 };
  }
  const side = Math.max(24, width * 0.025);
  const top = Math.max(64, height * 0.12, ceiling);
  const scale = Math.max(40, Math.min((width - 2 * side) / row, (floor - top) / EYE));
  return { scale, horizon: floor - EYE * scale };
}

/** A level camera at eye height in front of the row's middle; a lens shift puts the horizon on its row of the screen. */
function Lens({ center, row, mode, floor, ceiling }: { center: number; row: number; mode: 'hero' | 'strip'; floor: number; ceiling: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const { scale, horizon } = viewFor(row, size.width, size.height, mode, floor, ceiling);
    const full = 2 * Math.max(horizon, size.height - horizon);
    camera.fov = (2 * Math.atan(full / 2 / (scale * DISTANCE))) / DEG;
    camera.aspect = size.width / full;
    camera.setViewOffset(size.width, full, 0, full / 2 - horizon, size.width, size.height);
    camera.updateProjectionMatrix();
    camera.position.set(center, EYE, DISTANCE);
    camera.lookAt(center, EYE, 0);
    invalidate();
  }, [camera, size, row, center, mode, floor, ceiling, invalidate]);
  return null;
}

/** The yard: the photo as a dome whose floor the row stands on, lit by an HDR copy of it and its hazy sun. */
function Yard({ center, onLoad }: { center: number; onLoad: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const photo = useLoader(TextureLoader, YARD.photo);
  const light = useLoader(HDRLoader, YARD.light);
  const rotation = YARD.rotation;
  const sky = useMemo(() => {
    photo.mapping = EquirectangularReflectionMapping;
    photo.colorSpace = SRGBColorSpace;
    const dome = new GroundedSkybox(photo, EYE, YARD.radius);
    dome.rotation.y = rotation;
    (dome.material as MeshBasicMaterial).color.setScalar(YARD.tint);
    dome.raycast = () => {};
    return dome;
  }, [photo]);
  const sun = useMemo(() => {
    const made = new DirectionalLight(0xfff1e0, 2.2);
    made.castShadow = true;
    made.shadow.mapSize.setScalar(2048);
    Object.assign(made.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 80 });
    made.shadow.camera.updateProjectionMatrix();
    made.shadow.bias = -0.0003;
    made.shadow.normalBias = 0.03;
    made.shadow.radius = 4;
    return made;
  }, []);
  useLayoutEffect(() => {
    const direction = new Vector3(Math.cos(SUN.azimuth) * Math.cos(SUN.elevation), Math.sin(SUN.elevation), Math.sin(SUN.azimuth) * Math.cos(SUN.elevation)).applyAxisAngle(new Vector3(0, 1, 0), rotation);
    sun.target.position.set(center, 0, 0);
    sun.position.copy(sun.target.position).addScaledVector(direction, 30);
    sun.target.updateMatrixWorld();
  }, [sun, center]);
  useLayoutEffect(() => {
    light.mapping = EquirectangularReflectionMapping;
    const pmrem = new PMREMGenerator(gl);
    const environment = pmrem.fromEquirectangular(light).texture;
    pmrem.dispose();
    scene.environment = environment;
    scene.environmentIntensity = 0.85;
    scene.environmentRotation.y = rotation;
    onLoad();
    return () => { scene.environment = null; environment.dispose(); };
  }, [gl, scene, light, onLoad]);
  return <>
    <primitive object={sky} position={[center, EYE, DISTANCE]} />
    <primitive object={sun} />
    <primitive object={sun.target} />
    {/* Only its shadows show: the photo is the ground. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center, 0.002, 0]} receiveShadow>
      <planeGeometry args={[40, 24]} />
      <shadowMaterial opacity={0.5} />
    </mesh>
  </>;
}

/** A site worker's height across the whole row, on the horizon: the scale every robot is read against. */
function HeightLine({ width }: { width: number }) {
  return <group position={[0, EYE, -0.6]}>
    <mesh position={[width / 2, 0, 0]}>
      <boxGeometry args={[width, 0.012, 0.012]} />
      <meshBasicMaterial color="#fb923c" toneMapped={false} />
    </mesh>
    <Html position={[0.04, 0, 0]} zIndexRange={[12, 10]} style={{ pointerEvents: 'none' }}><span className="lineup-scale">1.80 m</span></Html>
  </group>;
}

/** One prop, drawn from plain boxes: the job site needs no more detail than a sketch. */
function Prop({ spec, register }: { spec: PropSpec; register: (id: string, object: Object3D | null) => void }) {
  const [w, h, d] = spec.size;
  const ref = useCallback((object: Object3D | null) => register(spec.id, object), [register, spec.id]);
  if (spec.kind === 'beam') {
    return <group ref={ref}>
      <group rotation={[0, 0, spec.tilt ?? -0.22]}>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[d / 2, 0, 0]}>
          <coneGeometry args={[w / 2, d, 32, 1, true]} />
          <meshBasicMaterial color={spec.color} transparent opacity={0} depthWrite={false} side={DoubleSide} toneMapped={false} />
        </mesh>
      </group>
    </group>;
  }
  return <group ref={ref} rotation={[0, spec.yaw, 0]}>
    {spec.kind === 'box' ? <mesh castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={spec.color} roughness={0.85} /></mesh> : null}
    {spec.kind === 'tote' ? <>
      <mesh castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={spec.color} roughness={0.7} /></mesh>
      <mesh position={[0, h / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w * 0.84, d * 0.8]} /><meshStandardMaterial color="#18181b" roughness={1} /></mesh>
    </> : null}
    {spec.kind === 'stand' ? <>
      <mesh castShadow position={[0, h / 2 - 0.01, 0]}><boxGeometry args={[w, 0.02, d]} /><meshStandardMaterial color={spec.color} roughness={0.5} metalness={0.4} /></mesh>
      <mesh castShadow><boxGeometry args={[0.035, h, 0.035]} /><meshStandardMaterial color={spec.color} roughness={0.5} metalness={0.4} /></mesh>
      <mesh castShadow position={[0, -h / 2 + 0.01, 0]}><boxGeometry args={[w * 0.8, 0.02, d * 0.8]} /><meshStandardMaterial color={spec.color} roughness={0.5} metalness={0.4} /></mesh>
    </> : null}
    {spec.kind === 'shelf' ? <>
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => <mesh castShadow key={sx + ':' + sz} position={[(sx * w) / 2, 0, (sz * d) / 2]}><boxGeometry args={[0.025, h, 0.025]} /><meshStandardMaterial color={spec.color} roughness={0.5} metalness={0.4} /></mesh>)}
      {[0.55 - h / 2, h / 2 - 0.01].map((y) => <mesh castShadow key={y} position={[0, y, 0]}><boxGeometry args={[w, 0.02, d]} /><meshStandardMaterial color={spec.color} roughness={0.5} metalness={0.4} /></mesh>)}
    </> : null}
  </group>;
}

function LiveRobot({ item, x, motion, hovered, onHover, onOpen, onSize, onAction }: {
  item: LiveItem; x: number; motion: boolean; hovered: boolean;
  onHover: (key: string | null) => void; onOpen: (href: string) => void; onSize: (key: string, size: Size) => void; onAction: (key: string, action: string) => void;
}) {
  const { scene } = useGLTF(item.entry.glbUrl, false, true);
  const joints = item.entry.joints.joints;
  const rig = useMemo(() => { const made = createRobotRig(scene, joints); prepare(made.scene); return made; }, [scene, joints]);
  const standing = useMemo(() => item.presets.standing ?? {}, [item.presets]);
  const task: Task | null = useMemo(() => taskFor({ key: item.key, turn: item.turn, joints: joints.map((joint) => joint.name), presets: item.presets }), [item.key, item.turn, item.presets, joints]);
  const hands = useMemo(() => (task?.hands ?? []).map((name) => rig.scene.getObjectByName(name)).filter((node): node is Object3D => Boolean(node)), [task, rig]);
  const anchor = useMemo(() => (task?.body ? rig.scene.getObjectByName(task.body) ?? null : null), [task, rig]);
  const humanoid = Boolean(item.presets.reach_up);
  const forward = useMemo(() => [Math.cos(item.turn), 0, -Math.sin(item.turn)] as const, [item.turn]);
  const body = useRef<Group>(null);
  const props = useRef<Record<string, Object3D | null>>({});
  const register = useCallback((id: string, object: Object3D | null) => { props.current[id] = object; }, []);
  const clock = useRef(0);
  const action = useRef('');
  const point = useMemo(() => new Vector3(), []);
  const scratch = useMemo(() => new Vector3(), []);
  const ground = useMemo(() => new Box3(), []);
  const [foot, setFoot] = useState<Footprint | null>(null);

  useLayoutEffect(() => {
    rig.apply(standing);
    rig.scene.rotation.y = item.turn;
    const box = localBox(rig.scene);
    setFoot({ lift: -box.min.y, cx: (box.min.x + box.max.x) / 2, cy: (box.min.y + box.max.y) / 2, cz: (box.min.z + box.max.z) / 2, w: box.max.x - box.min.x, h: box.max.y - box.min.y, d: box.max.z - box.min.z, top: box.max.y });
    onSize(item.key, { width: box.max.x - box.min.x, minX: box.min.x });
  }, [rig, standing, item.turn, item.key, onSize]);

  useFrame((_, delta) => {
    const group = body.current;
    if (!group) return;
    // Paused while pointed at, and for visitors who asked for less motion; screenshots may set the clock.
    const fixed = (window as unknown as { __lineupAt?: number }).__lineupAt;
    if (motion && !hovered) clock.current += Math.min(delta, 0.1);
    const time = typeof fixed === 'number' ? fixed : clock.current;
    const frame = task ? task.frame((((time - task.delay) % task.loop) + task.loop) % task.loop) : null;
    const lastY = group.position.y;
    rig.apply(frame && (motion || typeof fixed === 'number') ? frame.pose : standing);
    // Feet stay on the ground: bent knees bring the body down instead of lifting the feet.
    const sink = ground.setFromObject(rig.scene).min.y;
    const move = frame ? frame.move : 0;
    group.position.set(forward[0] * move, lastY - sink, forward[2] * move);
    const facing = hovered && humanoid ? FACE_CAMERA - item.turn : 0;
    group.rotation.y += (facing - group.rotation.y) * (1 - Math.exp(-Math.min(delta, 0.1) * 5));
    if (!frame || !task) return;
    // Held props sit between the hands, or on the back of a dog.
    let holdAt: Vector3 | null = null;
    if (hands.length) {
      point.set(0, 0, 0);
      for (const hand of hands) point.add(hand.getWorldPosition(scratch));
      holdAt = point.divideScalar(hands.length);
    } else if (anchor) holdAt = anchor.getWorldPosition(point);
    if (holdAt) holdAt.y -= sink;
    for (const state of frame.props) {
      const object = props.current[state.id];
      if (!object) continue;
      let [px, py, pz] = state.at;
      if (state.held && holdAt) {
        const [ox, oy, oz] = state.offset ?? [0, 0, 0];
        px += (holdAt.x - x + ox - px) * state.held;
        py += (holdAt.y + oy - py) * state.held;
        pz += (holdAt.z + oz - pz) * state.held;
      }
      const spec = task.props.find((candidate) => candidate.id === state.id);
      if (spec?.kind === 'beam' && anchor) {
        // The sensor sweep starts at the front of the dog's body.
        const origin = anchor.getWorldPosition(scratch);
        object.position.set(origin.x - x + forward[0] * 0.42, origin.y - sink + 0.06, origin.z + forward[2] * 0.42);
        object.rotation.set(0, item.turn + (state.spin ?? 0), 0);
        object.traverse((child) => { const material = (child as Mesh).material as MeshBasicMaterial | undefined; if (material && 'opacity' in material) material.opacity = state.opacity ?? 0; });
      } else {
        object.position.set(px, py, pz);
        if (state.yaw !== undefined) object.rotation.y = state.yaw;
      }
    }
    if (frame.action !== action.current) { action.current = frame.action; onAction(item.key, frame.action); }
  });

  return <>
    <group position={[x, foot?.lift ?? 0, 0]}>
      <group ref={body}><primitive object={rig.scene} dispose={null} /></group>
      {foot ? <mesh position={[foot.cx, foot.cy, foot.cz]}
        onPointerOver={(event) => { event.stopPropagation(); onHover(item.key); }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => { event.stopPropagation(); onOpen(item.href); }}>
        <boxGeometry args={[Math.max(foot.w, 0.35), foot.h, Math.max(foot.d, 0.45)]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh> : null}
      {foot ? <Html position={[foot.cx, -foot.lift, 0.25]} zIndexRange={[12, 10]}>
        <a className="lineup-label" href={item.href}>{short(item.name)}<b>{metres(item.heightM)}</b></a>
      </Html> : null}
      {foot && hovered ? <Html position={[foot.cx, foot.top + 0.14, foot.cz]} center zIndexRange={[20, 14]} style={{ pointerEvents: 'none' }}>
        <span className="lineup-tag"><strong>{item.name}</strong><span>{task ? task.label + ' · ' : ''}{metres(item.heightM)} · click to open</span></span>
      </Html> : null}
    </group>
    {task ? <group position={[x, 0, 0]}>{task.props.map((spec) => <Prop key={spec.id} spec={spec} register={register} />)}</group> : null}
  </>;
}

/** After a turn the row glides back to the front view, so it never stays half hidden. */
function ReturnHome({ center }: { center: number }) {
  const controls = useThree((s) => s.controls) as unknown as { addEventListener: (type: string, fn: () => void) => void; removeEventListener: (type: string, fn: () => void) => void; update: () => void } | null;
  const camera = useThree((s) => s.camera);
  const dragging = useRef(false);
  const released = useRef(0);
  const home = useMemo(() => new Vector3(), []);
  useEffect(() => {
    if (!controls) return;
    const start = () => { dragging.current = true; };
    const end = () => { dragging.current = false; released.current = performance.now(); };
    controls.addEventListener('start', start);
    controls.addEventListener('end', end);
    return () => { controls.removeEventListener('start', start); controls.removeEventListener('end', end); };
  }, [controls]);
  useFrame((_, delta) => {
    if (!controls || dragging.current || performance.now() - released.current < 1800) return;
    home.set(center, EYE, DISTANCE);
    if (camera.position.distanceToSquared(home) < 1e-6) return;
    camera.position.lerp(home, 1 - Math.exp(-Math.min(delta, 0.1) * 2.2));
    controls.update();
  });
  return null;
}

function LiveWorker({ x, onSize }: { x: number; onSize: (key: string, size: Size) => void }) {
  const { scene } = useGLTF(WORKER_URL, false, true);
  const copy = useMemo(() => { const made = scene.clone(true); prepare(made); return made; }, [scene]);
  const [center, setCenter] = useState<number | null>(null);
  useLayoutEffect(() => {
    copy.rotation.y = WORKER_TURN;
    const box = localBox(copy);
    setCenter((box.min.x + box.max.x) / 2);
    onSize('worker', { width: box.max.x - box.min.x, minX: box.min.x });
  }, [copy, onSize]);
  return <group position={[x, 0, 0]}>
    <primitive object={copy} />
    {center === null ? null : <Html position={[center, 0, 0.25]} zIndexRange={[12, 10]} style={{ pointerEvents: 'none' }}>
      <span className="lineup-label">Site worker<b>{metres(EYE)}</b></span>
    </Html>}
  </group>;
}

export function LineupLive({ items, mode = 'hero', floor = 0, ceiling = 0, onReady, onActions, onHovered }: {
  items: LiveItem[]; mode?: 'hero' | 'strip'; floor?: number; ceiling?: number; onReady?: () => void;
  onActions?: (actions: Record<string, string>) => void; onHovered?: (key: string | null) => void;
}) {
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const [motion, setMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const [yard, setYard] = useState(false);
  const actions = useRef<Record<string, string>>({});
  const host = useRef<HTMLDivElement>(null);
  const onSize = useCallback((key: string, size: Size) => setSizes((s) => (s[key]?.width === size.width && s[key]?.minX === size.minX ? s : { ...s, [key]: size })), []);
  const onAction = useCallback((key: string, action: string) => {
    if (actions.current[key] === action) return;
    actions.current = { ...actions.current, [key]: action };
    onActions?.(actions.current);
  }, [onActions]);
  const onYard = useCallback(() => setYard(true), []);
  const ready = yard && Boolean(sizes.worker) && items.every((item) => sizes[item.key]);
  useEffect(() => { if (ready) onReady?.(); }, [ready, onReady]);
  useEffect(() => { onHovered?.(hovered); }, [hovered, onHovered]);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  // No frames while the row is scrolled away.
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const open = useCallback((href: string) => { window.location.assign(href); }, []);

  // The worker, then each robot, LEAD free on both ends.
  let cursor = LEAD;
  const xs: Record<string, number> = {};
  const worker = sizes.worker ?? { width: 0.6, minX: -0.3 };
  const workerX = cursor - worker.minX;
  cursor += worker.width + GAP;
  for (const item of items) {
    const size = sizes[item.key] ?? { width: 1, minX: -0.5 };
    xs[item.key] = cursor - size.minX;
    cursor += size.width + GAP;
  }
  const width = cursor - GAP + LEAD;
  const center = width / 2;

  return <div ref={host} className="lineup-live" data-lineup-live data-ready={ready ? 'true' : 'false'} data-hovered={hovered ?? ''}
    onPointerLeave={() => setHovered(null)}>
    <Canvas dpr={[1, 1.5]} shadows="percentage" frameloop={visible ? 'always' : 'never'} gl={{ antialias: true }}
      camera={{ fov: 30, position: [center, EYE, DISTANCE], near: 0.05, far: 400, manual: true }}>
      <Suspense fallback={null}>
        <Yard center={center} onLoad={onYard} />
        <HeightLine width={width} />
        <LiveWorker x={workerX} onSize={onSize} />
        {items.map((item) => <LiveRobot key={item.key} item={item} x={xs[item.key]} motion={motion} hovered={hovered === item.key}
          onHover={setHovered} onOpen={open} onSize={onSize} onAction={onAction} />)}
        <ContactShadows position={[center, 0.003, 0]} scale={[width + 2, 3]} resolution={512} blur={2.4} far={2.5} opacity={0.6} color="#000000" frames={Infinity} />
      </Suspense>
      <Lens center={center} row={width} mode={mode} floor={floor} ceiling={ceiling} />
      {/* Turning only, at eye height: the page keeps the scroll wheel and touch scrolling. */}
      <OrbitControls makeDefault target={[center, EYE, 0]} enableZoom={false} enablePan={false} enableDamping dampingFactor={0.08} rotateSpeed={0.45}
        minAzimuthAngle={-0.3} maxAzimuthAngle={0.3} minPolarAngle={Math.PI / 2} maxPolarAngle={Math.PI / 2} />
      <ReturnHome center={center} />
    </Canvas>
  </div>;
}
