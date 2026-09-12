'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Box3, Group, MOUSE, PerspectiveCamera, TOUCH, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export type CameraCommand = { name: 'fit' | 'front' | 'side' | 'top' | 'in' | 'out'; id: number };
export function CameraControls({ content, ready, scale, mode, command, compact }: {
  content: RefObject<Group | null>; ready: boolean; scale: boolean; mode: 'rotate' | 'pan'; command: CameraCommand; compact: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const pending = useRef<CameraCommand['name'] | null>('fit');
  const publish = () => {
    const orbit = controls.current;
    if (!orbit) return;
    gl.domElement.dataset.camera = JSON.stringify({ position: camera.position.toArray(), target: orbit.target.toArray(), distance: orbit.getDistance() });
  };
  useLayoutEffect(() => { pending.current = 'fit'; invalidate(); }, [ready, scale, size.width, size.height, invalidate]);
  useLayoutEffect(() => { pending.current = command.name; invalidate(); }, [command, invalidate]);
  useFrame(() => {
    const orbit = controls.current;
    const action = pending.current;
    if (!ready || !content.current || !orbit || !action || !size.width || !size.height) return;
    pending.current = null;
    // Finish any residual drag before applying a button command, so reset is stable.
    const damping = orbit.enableDamping;
    orbit.enableDamping = false;
    orbit.update();
    orbit.enableDamping = damping;
    if (action === 'in' || action === 'out') {
      const distance = Math.max(orbit.minDistance, Math.min(orbit.maxDistance, orbit.getDistance() * (action === 'in' ? 0.8 : 1.25)));
      camera.position.sub(orbit.target).setLength(distance).add(orbit.target);
    } else {
      const box = new Box3().setFromObject(content.current);
      if (box.isEmpty()) return;
      const center = box.getCenter(new Vector3());
      const extent = box.getSize(new Vector3());
      const radius = Math.max(extent.length() / 2, 0.05);
      const vFov = camera.fov * Math.PI / 360;
      const hFov = Math.atan(Math.tan(vFov) * size.width / size.height);
      const distance = radius / Math.sin(Math.min(vFov, hFov)) * (compact ? 1.02 : 1.25);
      const direction = action === 'front' ? new Vector3(1, 0, 0) : action === 'side' ? new Vector3(0, 0, 1) : action === 'top' ? new Vector3(0.001, 1, 0) : new Vector3(3.2, 1.2, 3.6);
      orbit.target.copy(center);
      camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));
      orbit.minDistance = Math.max(radius * 0.08, 0.015);
      orbit.maxDistance = Math.max(distance * 6, 3);
      camera.near = Math.max(radius / 1000, 0.001);
      camera.far = Math.max(orbit.maxDistance * 4, 60);
      camera.updateProjectionMatrix();
    }
    orbit.update();
    publish();
    gl.domElement.dataset.cameraReady = 'true';
    invalidate();
  });
  return <OrbitControls ref={controls} makeDefault enablePan screenSpacePanning enableDamping dampingFactor={0.12} rotateSpeed={0.7} zoomSpeed={0.8} panSpeed={0.8} zoomToCursor
    minPolarAngle={0.001} maxPolarAngle={Math.PI - 0.001}
    mouseButtons={{ LEFT: mode === 'pan' ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
    touches={{ ONE: mode === 'pan' ? TOUCH.PAN : TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }} onChange={publish} />;
}
