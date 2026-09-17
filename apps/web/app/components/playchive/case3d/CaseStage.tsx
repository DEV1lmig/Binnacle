"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CASE } from "./caseArt";
import { GEO, PLACE } from "./caseMesh";
import { buildSkin, peekSkin, type CaseSkin } from "./caseSkins";
import { setDrawn, subscribeCases, visibleCases, type CaseSlot } from "./store";
import { focusStore, type FocusState } from "./focus";

/** Field of view chosen so that one world unit equals one CSS pixel at z = 0. */
const FOV = 40;
const cameraDistance = (height: number) => height / (2 * Math.tan((FOV * Math.PI) / 360));

const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(current, target, lambda, dt);

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

type Pose = { x: number; y: number; scale: number; open: number; tilt: number; lift: number };

/**
 * Where each game's case was last seen, keyed by the game rather than by the DOM
 * slot. A route change unmounts the grid's cover and mounts the detail page's, but
 * the case is the same object: it picks up its pose and keeps moving, so the reader
 * watches one case travel instead of two appearing.
 */
const lastPose = new Map<string, { pose: Pose; at: number }>();
const CONTINUITY_MS = 2000;

/** One case, positioned over its DOM cover and opened when it is the focused one. */
function Case({ slot, focus }: { slot: CaseSlot; focus: FocusState | null }) {
  const group = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const { gl, size, camera } = useThree();
  const [skin, setSkin] = useState<CaseSkin | null>(() => peekSkin(slot.gameId ?? slot.coverUrl ?? slot.id) ?? null);
  const key = slot.gameId ?? slot.coverUrl ?? slot.id;
  const pose = useRef<Pose | null>(null);
  /** True only while a case is flying in from the route it came from. */
  const gliding = useRef(false);

  // Hand this case's pose on, in case the same game reappears on the next route.
  useEffect(() => () => {
    if (pose.current) lastPose.set(key, { pose: { ...pose.current }, at: Date.now() });
  }, [key]);

  useEffect(() => {
    let alive = true;
    buildSkin(key, slot.coverUrl ?? undefined, slot.title, gl.capabilities.getMaxAnisotropy())
      .then(next => { if (alive) setSkin(next); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [key, slot.coverUrl, slot.title, gl]);

  // Only hide the flat artwork once the case is actually painted over it.
  useEffect(() => {
    if (!skin) return;
    setDrawn(slot.el, true);
    return () => setDrawn(slot.el, false);
  }, [skin, slot.el]);

  const mine = focus?.id === slot.id;
  const wasMine = useRef(false);

  useFrame((_, delta) => {
    if (!group.current || !hinge.current || !skin) return;
    const rect = slot.el.getBoundingClientRect();
    if (rect.width === 0) return;

    const widthPx = rect.width;
    const target: Pose = {
      x: rect.left + widthPx / 2 - size.width / 2,
      y: -(rect.top + rect.height / 2) + size.height / 2,
      scale: widthPx / CASE.w,
      open: 0,
      tilt: 0,
      lift: 0,
    };

    if (mine && focus) {
      // Three overlapping moves, all read straight from the driver's clock: the case
      // leaves its shelf, the lid swings off its hinge, and then the open tray rushes
      // the camera until there is nothing on screen but the inside of the case.
      const { rise, open, dive } = focus;
      const shelf = { x: target.x, y: target.y, scale: target.scale };
      const held = (Math.min(size.width, size.height) * 0.42) / CASE.w;
      // Big enough that the tray back covers the viewport before the dive ends.
      const swallow = Math.max(size.width / CASE.w, size.height / CASE.h) * 1.35;
      const reach = camera.position.z * 0.42;

      target.x = mix(shelf.x, 0, rise);
      target.y = mix(shelf.y, 0, rise);
      target.scale = mix(mix(shelf.scale, held, rise), swallow, dive);
      // The lid keeps travelling on the way in, so it never crosses the opening.
      target.open = open * -2.5 - dive * 0.6;
      // The case is held at an angle, then squares up as the camera goes inside.
      target.tilt = open * -0.34 * (1 - dive);
      target.lift = rise * 220 + dive * reach;
    }

    if (!pose.current) {
      // Resume mid-flight if this same game was on the previous route; otherwise
      // land exactly on the cover so a case never flies in from the origin.
      const carried = lastPose.get(key);
      const fresh = carried && Date.now() - carried.at < CONTINUITY_MS ? carried.pose : null;
      pose.current = fresh ? { ...fresh } : { ...target };
      gliding.current = Boolean(fresh);
      lastPose.delete(key);
    }

    // Letting go of a case that was centred and open: ease it back onto its cover
    // rather than snapping, so it reads as the case settling into the new page.
    if (wasMine.current && !mine) gliding.current = true;
    wasMine.current = mine;

    const p = pose.current;
    if (mine) {
      // The driver already eased every value. Damping on top of it would only make
      // the case trail the animation, so the pose is taken as given.
      p.x = target.x;
      p.y = target.y;
      p.scale = target.scale;
      p.open = target.open;
      p.tilt = target.tilt;
      p.lift = target.lift;
    } else if (gliding.current) {
      const lambda = 14;
      p.x = damp(p.x, target.x, lambda, delta);
      p.y = damp(p.y, target.y, lambda, delta);
      p.scale = damp(p.scale, target.scale, lambda, delta);
      p.open = damp(p.open, target.open, lambda, delta);
      p.tilt = damp(p.tilt, target.tilt, lambda, delta);
      p.lift = damp(p.lift, target.lift, lambda, delta);
      // Once it has caught up, stop easing and go back to being glued.
      if (Math.hypot(p.x - target.x, p.y - target.y) < 1 && Math.abs(p.scale - target.scale) < 0.5) {
        gliding.current = false;
      }
    } else {
      // Glued to its cover. Any easing here reads as the case lagging behind the
      // page while the reader scrolls, so the pose is taken from the rect outright.
      p.x = target.x;
      p.y = target.y;
      p.scale = target.scale;
      p.open = target.open;
      p.tilt = target.tilt;
      p.lift = target.lift;
    }

    group.current.position.set(p.x, p.y, p.lift);
    group.current.rotation.y = p.tilt;
    group.current.scale.setScalar(p.scale);
    group.current.renderOrder = mine ? 10 : 0;
    hinge.current.rotation.y = p.open;
  });

  if (!skin) return null;

  return (
    <group ref={group}>
      <mesh geometry={GEO.trayBack} material={skin.tray} position={PLACE.trayBack} />
      <mesh geometry={GEO.trayWallY} material={skin.tray} position={PLACE.wallLeft} />
      <mesh geometry={GEO.trayWallY} material={skin.tray} position={PLACE.wallRight} />
      <mesh geometry={GEO.trayWallX} material={skin.tray} position={PLACE.wallTop} />
      <mesh geometry={GEO.trayWallX} material={skin.tray} position={PLACE.wallBottom} />
      <group ref={hinge} position={PLACE.hinge}>
        <mesh geometry={GEO.lid} material={skin.lid} position={PLACE.lid} />
      </group>
    </group>
  );
}

function Shelf() {
  const [cases, setCases] = useState<CaseSlot[]>([]);
  const [focus, setFocus] = useState<FocusState | null>(focusStore.get());
  const { size, camera } = useThree();

  useEffect(() => {
    const sync = () => setCases(visibleCases());
    sync();
    return subscribeCases(sync);
  }, []);

  useEffect(() => focusStore.subscribe(setFocus), []);

  // Keep one world unit equal to one CSS pixel as the viewport changes.
  useEffect(() => {
    camera.position.set(0, 0, cameraDistance(size.height));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.height]);

  const focused = focus ? cases.find(slot => slot.id === focus.id) : undefined;

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[-260, 420, 620]} intensity={2.1} />
      <directionalLight position={[420, -180, 300]} intensity={0.7} />
      {cases.map(slot => (
        <Case key={slot.id} slot={slot} focus={focused?.id === slot.id ? focus : null} />
      ))}
    </>
  );
}

/**
 * The single WebGL surface for the whole app. It sits above the page but ignores the
 * pointer, so every link, menu and scroll still belongs to the DOM underneath.
 */
export default function CaseStage() {
  const dpr = useMemo<[number, number]>(() => [1, 2], []);
  const [awake, setAwake] = useState(false);

  // Pages with no covers on screen — settings, notifications, a scrolled-past feed —
  // stop the render loop entirely rather than burning a frame budget on nothing.
  useEffect(() => {
    const check = () => setAwake(visibleCases().length > 0);
    check();
    return subscribeCases(check);
  }, []);

  return (
    <div className="pk-stage" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: FOV, near: 10, far: 6000, position: [0, 0, 1200] }}
        frameloop={awake ? "always" : "never"}
      >
        <Shelf />
      </Canvas>
    </div>
  );
}
