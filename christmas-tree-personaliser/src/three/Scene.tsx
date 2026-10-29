import { forwardRef, Suspense, useEffect, useImperativeHandle, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { ChristmasTree, type NameLayout } from './ChristmasTree';
import { Tabletop } from './Tabletop';
import type { LetterColourId, TreeColourId } from '../config/options';

declare global {
  interface Window {
    __viewerDebug?: {
      azimuth: () => number;
      polar: () => number;
      distance: () => number;
      rotateTo: (azimuth: number, polar?: number) => void;
    };
  }
}

export interface ViewerHandle {
  resetView: () => void;
  zoom: (factor: number) => void;
  spin: () => void;
}

interface Props {
  names: [string, string, string];
  treeColour: TreeColourId;
  letterColour: LetterColourId;
  onNameLayout?: (index: number, layout: NameLayout) => void;
}

const TARGET = new THREE.Vector3(0, 8.8, 0);
const FRONT_DIR = new THREE.Vector3(0, 0.24, 1).normalize();
const MIN_DIST = 16;

// camera-controls ACTION flags (mirrors CameraControls.ACTION)
const ACTION = { NONE: 0, ROTATE: 1, DOLLY: 16, TOUCH_ROTATE: 64, TOUCH_DOLLY: 1024 } as const;
const MAX_DIST = 75;

/** Distance that frames the 18 cm product for the current viewport shape. */
function framingDistance(camera: THREE.PerspectiveCamera) {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const needH = 24.5; // tree + a little tabletop
  const needW = 21;
  const byH = needH / 2 / Math.tan(vFov / 2);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const byW = needW / 2 / Math.tan(hFov / 2);
  return THREE.MathUtils.clamp(Math.max(byH, byW), MIN_DIST + 4, MAX_DIST - 5);
}

const Controls = forwardRef<ViewerHandle>(function Controls(_, ref) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const frontPosition = () => {
    const d = framingDistance(camera);
    return TARGET.clone().addScaledVector(FRONT_DIR, d);
  };

  useImperativeHandle(ref, () => ({
    resetView() {
      const c = controls.current;
      if (!c) return;
      const p = frontPosition();
      // normalise accumulated spins so the reset takes the short way round
      c.normalizeRotations();
      c.setLookAt(p.x, p.y, p.z, TARGET.x, TARGET.y, TARGET.z, true);
    },
    zoom(factor) {
      const c = controls.current;
      if (!c) return;
      c.dollyTo(THREE.MathUtils.clamp(c.distance * factor, MIN_DIST, MAX_DIST), true);
    },
    spin() {
      controls.current?.rotate(Math.PI * 2, 0, true);
    },
  }));

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    // left drag / one finger rotates, wheel / pinch zooms, panning disabled
    c.mouseButtons.left = ACTION.ROTATE;
    c.mouseButtons.middle = ACTION.NONE;
    c.mouseButtons.right = ACTION.NONE;
    c.mouseButtons.wheel = ACTION.DOLLY;
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_DOLLY;
    c.touches.three = ACTION.NONE;
    const p = frontPosition();
    c.setLookAt(p.x, p.y, p.z, TARGET.x, TARGET.y, TARGET.z, false);
    // read-only camera state for automated tests
    window.__viewerDebug = {
      azimuth: () => c.azimuthAngle,
      polar: () => c.polarAngle,
      distance: () => c.distance,
      rotateTo: (azimuth: number, polar?: number) => c.rotateTo(azimuth, polar ?? c.polarAngle, false),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 - 0.06}
      smoothTime={0.35}
      draggingSmoothTime={0.12}
      azimuthRotateSpeed={0.9}
      polarRotateSpeed={0.7}
      dollySpeed={0.6}
    />
  );
});

function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff6ea', '#7a5a3c', 0.55]} />
      {/* soft window key light from front-left */}
      <directionalLight
        position={[-22, 34, 26]}
        intensity={2.3}
        color="#fff1df"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={6}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={26}
        shadow-camera-bottom={-14}
        shadow-camera-near={10}
        shadow-camera-far={110}
      />
      {/* cool fill from the right and a warm rim from behind */}
      <directionalLight position={[26, 14, 18]} intensity={0.55} color="#e6eefc" />
      <directionalLight position={[6, 22, -30]} intensity={1.1} color="#ffd9a8" />
    </>
  );
}

function StudioEnvironment() {
  // Built from light panels in-scene so no HDR file has to be downloaded.
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#3a332c']} />
      <Lightformer form="rect" intensity={2.4} color="#fff3e2" position={[-6, 6, 8]} scale={[10, 8, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.2} color="#f2f6ff" position={[8, 3, 4]} scale={[6, 10, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.6} color="#ffd8a6" position={[0, 6, -9]} scale={[12, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[0, 10, 0]} scale={4} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.6} color="#a0764c" position={[0, -5, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
    </Environment>
  );
}

export const Scene = forwardRef<ViewerHandle, Props>(function Scene(props, ref) {
  const lowPower = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.5, far: 1200, position: [0, 13.5, 52] }}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={({ camera }) => camera.lookAt(TARGET)}
      data-testid="tree-canvas"
    >
      <color attach="background" args={['#efe8de']} />
      <fog attach="fog" args={['#ebe3d7', 90, 240]} />
      <Lights />
      <Suspense fallback={null}>
        <StudioEnvironment />
      </Suspense>
      <ChristmasTree {...props} />
      <ContactShadows position={[0, 0.02, 0]} scale={30} blur={2.2} far={6} opacity={0.55} resolution={512} color="#2b1a0c" />
      <Tabletop reflections={!lowPower} />
      <Controls ref={ref} />
    </Canvas>
  );
});
