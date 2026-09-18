"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CASE } from "./caseArt";
import { GEO, PLACE } from "./caseMesh";
import { buildInsideArt, buildSkin, peekInsideArt, peekSkin, type CaseSkin } from "./caseSkins";
import { setDrawn, slotKey, subscribeCases, visibleCases, type CaseSlot } from "./store";
import { focusStore, type FocusState } from "./focus";

/** Field of view chosen so that one world unit equals one CSS pixel at z = 0. */
const FOV = 40;
const cameraDistance = (height: number) => height / (2 * Math.tan((FOV * Math.PI) / 360));

const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(current, target, lambda, dt);

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

/** How far the lid swings when a case is held open, and when it lies open in a page. */
const LID_HELD = -2.5;
const LID_FLAT = -2.95;
/** The lean of a case lying open in a page: far edge away, near edge close. */
const LEAN_FLAT = -0.19;

type Pose = {
  x: number;
  y: number;
  /** Uniform size, in pixels per case unit. The case always keeps its proportions. */
  scale: number;
  open: number;
  tilt: number;
  lean: number;
  lift: number;
};

const KEYS: (keyof Pose)[] = ["x", "y", "scale", "open", "tilt", "lean", "lift"];

/**
 * Where each game's case was last seen, keyed by the game rather than by the DOM
 * slot. A route change unmounts one page's slot and mounts the next page's, but the
 * case is the same object: it picks up its pose and keeps moving, so the reader
 * watches one case travel — into the page it opens, or back onto the shelf.
 */
const lastPose = new Map<string, { pose: Pose; at: number }>();
const CONTINUITY_MS = 6000;

type Rect = { left: number; top: number; width: number; height: number };

/**
 * Where the tray of an open page sits, from the same numbers as `.pk-case-open` in
 * the stylesheet: fitted to the page's width, keeping the case's own proportions,
 * so it runs on past the fold like a case seen from close up. Computed rather than
 * measured: while a page is arriving its DOM is being transformed to sit inside the
 * case, so measuring it would feed back.
 */
function trayRect(width: number, height: number): Rect {
  const top = Math.max(64, height * 0.11);
  const side = width * 0.016;
  const w = width - side * 2;
  return { left: side, top, width: w, height: (w * CASE.h) / CASE.w };
}

/** How much of that tray is on screen: what the inside art is painted for. */
function trayVisible(width: number, height: number) {
  const tray = trayRect(width, height);
  return Math.min(1, (height - tray.top) / tray.height);
}

/** The pose a case holds when nothing is happening to it: on its cover, or lying open in its page. */
function restPose(slot: CaseSlot, rect: Rect, width: number, height: number): Pose {
  const x = rect.left + rect.width / 2 - width / 2;
  const y = -(rect.top + rect.height / 2) + height / 2;
  if (slot.open) return { x, y, scale: rect.width / CASE.w, open: LID_FLAT, tilt: 0, lean: LEAN_FLAT, lift: 0 };
  return { x, y, scale: rect.width / CASE.w, open: 0, tilt: 0, lean: 0, lift: 0 };
}

/**
 * Puts the page inside the case. The page's wrapper gets the case's own transform —
 * same perspective, same centre, same lean, tilt and scale — through custom
 * properties the stylesheet reads, so the content is projected by the same camera
 * as the walls and lid drawn over it, and is clipped to the tray floor. The numbers
 * are laid out from the page's untransformed geometry (`offset*`), never measured,
 * because the page is the thing being moved.
 */
function carryPage(p: Pose, rest: Pose, tray: Rect, width: number, height: number, cameraZ: number) {
  const page = document.querySelector<HTMLElement>(".pk-inside");
  if (!page) return false;
  // The page arrives asynchronously; the first projected frame fades it in.
  page.dataset.caseIn = "1";
  const pageTop = page.offsetTop - window.scrollY;
  const pageLeft = page.offsetLeft;
  const fcx = tray.left + tray.width / 2;
  const fcy = tray.top + tray.height / 2;
  // The tray floor is inset from the case's edge by the wall thickness.
  const insetX = tray.width * (0.04 / CASE.w);
  const insetY = tray.height * (0.04 / CASE.h);
  const style = document.documentElement.style;
  style.setProperty("--case-p", `${cameraZ}px`);
  style.setProperty("--case-ox", `${fcx - pageLeft}px`);
  style.setProperty("--case-oy", `${fcy - pageTop}px`);
  style.setProperty("--case-vx", `${width / 2 - fcx}px`);
  style.setProperty("--case-vy", `${height / 2 - fcy}px`);
  style.setProperty("--case-tx", `${p.x + width / 2 - fcx}px`);
  style.setProperty("--case-ty", `${height / 2 - p.y - fcy}px`);
  style.setProperty("--case-tz", `${p.lift}px`);
  style.setProperty("--case-lean", `${-p.lean}rad`);
  style.setProperty("--case-tilt", `${p.tilt}rad`);
  style.setProperty("--case-sx", `${p.scale / rest.scale}`);
  style.setProperty("--case-sy", `${p.scale / rest.scale}`);
  style.setProperty("--case-clip", [
    `${tray.top - pageTop + insetY}px`,
    `${pageLeft + page.offsetWidth - (tray.left + tray.width) + insetX}px`,
    `${Math.max(0, pageTop + page.offsetHeight - (tray.top + tray.height) + insetY)}px`,
    `${tray.left - pageLeft + insetX}px`,
  ].join(" "));
  return true;
}

/** One case, positioned over its DOM slot, or moving between poses when it is the focused one. */
function Case({ slot, focus }: { slot: CaseSlot; focus: FocusState | null }) {
  const group = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const { gl, size, camera } = useThree();
  const key = slotKey(slot);
  const [skin, setSkin] = useState<CaseSkin | null>(() => peekSkin(key) ?? null);
  const [inside, setInside] = useState<THREE.Material | null>(() => (slot.open ? peekInsideArt(key) ?? null : null));
  const pose = useRef<Pose | null>(null);
  /** True while the case is easing towards its rest pose rather than glued to it. */
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

  // The page-sized inside, for the case a page rests in.
  useEffect(() => {
    if (!slot.open) return;
    let alive = true;
    buildInsideArt(key, slot.coverUrl ?? undefined, CASE.w / CASE.h, gl.capabilities.getMaxAnisotropy(), trayVisible(size.width, size.height))
      .then(next => { if (alive) setInside(next); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [slot.open, key, slot.coverUrl, gl, size.width, size.height]);

  const mine = focus?.key === key;
  const wasMine = useRef(false);
  /** While the case carries its page, the page's own tray is the floor the content sits on. */
  const carrying = mine && Boolean(slot.open);
  /** The page has been projected at least once: only then does the 3D floor step aside. */
  const [pageIn, setPageIn] = useState(false);

  // Only hide the flat artwork once the case is actually painted over it.
  useEffect(() => {
    if (!skin || (carrying && pageIn)) return;
    setDrawn(slot.el, true);
    return () => setDrawn(slot.el, false);
  }, [skin, slot.el, carrying, pageIn]);

  const tray = useMemo(() => {
    if (!skin) return null;
    if (!slot.open || !inside) return skin.tray;
    const faces = [...skin.tray];
    faces[4] = inside;
    return faces;
  }, [skin, inside, slot.open]);

  useFrame((_, delta) => {
    if (!group.current || !hinge.current || !skin) return;
    const rect = slot.el.getBoundingClientRect();
    if (rect.width === 0) return;

    // A page being carried is transformed to sit inside the case, so its tray is
    // computed rather than measured.
    const trayBox = slot.open && mine ? trayRect(size.width, size.height) : rect;
    const rest = restPose(slot, trayBox, size.width, size.height);
    const target: Pose = { ...rest };

    if (mine && focus) {
      // Between poses, all read straight from the driver's clock: `rise` takes the
      // case from where it rests to being held at the centre, `open` swings the lid,
      // and `dive` brings the open case to where the page will rest in it. The same
      // three run backwards to put a case away.
      const { rise, open, dive } = focus;
      const heldScale = (Math.min(size.width, size.height) * 0.42) / CASE.w;
      const landing = restPose({ ...slot, open: true }, trayRect(size.width, size.height), size.width, size.height);

      const lidHeld = open * mix(slot.open ? LID_FLAT : LID_HELD, LID_HELD, rise);
      target.x = mix(mix(rest.x, 0, rise), landing.x, dive);
      target.y = mix(mix(rest.y, 0, rise), landing.y, dive);
      target.scale = mix(mix(rest.scale, heldScale, rise), landing.scale, dive);
      target.lift = mix(mix(rest.lift, 220, rise), 0, dive);
      target.open = mix(lidHeld, LID_FLAT, dive);
      target.tilt = mix(rest.tilt, -0.34 * open, rise) * (1 - dive);
      target.lean = mix(mix(rest.lean, 0, rise), LEAN_FLAT, dive);
    }

    if (!pose.current) {
      // Resume mid-flight if this same game was on the previous route; otherwise
      // land exactly where it rests so a case never flies in from the origin.
      const carried = lastPose.get(key);
      const fresh = carried && Date.now() - carried.at < CONTINUITY_MS ? carried.pose : null;
      pose.current = fresh ? { ...fresh } : { ...target };
      gliding.current = Boolean(fresh);
      lastPose.delete(key);
    }

    // Letting go of a case that was held: ease it home rather than snapping.
    if (wasMine.current && !mine) gliding.current = true;
    wasMine.current = mine;

    const p = pose.current;
    if (mine) {
      // The driver already eased every value; damping on top would only make the
      // case trail its own animation.
      for (const k of KEYS) p[k] = target[k];
    } else if (gliding.current) {
      // Settling into a page, or back onto the shelf, at a pace the reader can follow.
      for (const k of KEYS) p[k] = damp(p[k], target[k], 9, delta);
      if (Math.hypot(p.x - target.x, p.y - target.y) < 1 && Math.abs(p.scale - target.scale) < 0.5 && Math.abs(p.open - target.open) < 0.01) {
        gliding.current = false;
      }
    } else {
      // Glued. Any easing here reads as the case lagging behind the page while the
      // reader scrolls, so the pose is taken from the rect outright.
      for (const k of KEYS) p[k] = target[k];
    }

    group.current.position.set(p.x, p.y, p.lift);
    group.current.rotation.set(p.lean, p.tilt, 0);
    group.current.scale.setScalar(p.scale);
    group.current.renderOrder = mine ? 10 : 0;
    hinge.current.rotation.y = p.open;

    if (carrying) {
      if (carryPage(p, rest, trayBox, size.width, size.height, camera.position.z) && !pageIn) setPageIn(true);
    } else if (pageIn) {
      setPageIn(false);
    }
  });

  if (!skin || !tray) return null;

  return (
    <group ref={group}>
      {!(carrying && pageIn) && <mesh geometry={GEO.trayBack} material={tray} position={PLACE.trayBack} />}
      {/* The spine is the left wall's outer face; every other wall is plain plastic. */}
      <mesh geometry={GEO.trayWallY} material={skin.tray} position={PLACE.wallLeft} />
      <mesh geometry={GEO.trayWallY} material={skin.walls} position={PLACE.wallRight} />
      <mesh geometry={GEO.trayWallX} material={skin.walls} position={PLACE.wallTop} />
      <mesh geometry={GEO.trayWallX} material={skin.walls} position={PLACE.wallBottom} />
      <group ref={hinge} position={PLACE.hinge}>
        <mesh geometry={GEO.lid} material={skin.lid} position={PLACE.lid} />
      </group>
    </group>
  );
}

/**
 * A case with nowhere to stand yet: the route has changed but the page that will
 * hold this game's cover is still loading. It is drawn where it was last seen,
 * shut, until a slot claims it — so a loading list never makes the case vanish.
 */
function LooseCase({ caseKey }: { caseKey: string }) {
  const group = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const skin = peekSkin(caseKey);
  useFrame(() => {
    const carried = lastPose.get(caseKey);
    if (!group.current || !hinge.current || !carried) return;
    const p = carried.pose;
    group.current.position.set(p.x, p.y, p.lift);
    group.current.rotation.set(p.lean, p.tilt, 0);
    group.current.scale.setScalar(p.scale);
    hinge.current.rotation.y = p.open;
    // Keep it fresh so the slot that finally appears still picks it up.
    carried.at = Date.now();
  });
  if (!skin || !lastPose.has(caseKey)) return null;
  return (
    <group ref={group} renderOrder={10}>
      <mesh geometry={GEO.trayBack} material={skin.tray} position={PLACE.trayBack} />
      <mesh geometry={GEO.trayWallY} material={skin.tray} position={PLACE.wallLeft} />
      <mesh geometry={GEO.trayWallY} material={skin.walls} position={PLACE.wallRight} />
      <mesh geometry={GEO.trayWallX} material={skin.walls} position={PLACE.wallTop} />
      <mesh geometry={GEO.trayWallX} material={skin.walls} position={PLACE.wallBottom} />
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

  // A page resting in an open case draws only that case: the stage is behind the
  // content there, so any other cover on the page keeps its flat artwork.
  const inside = cases.some(slot => slot.open);
  const drawn = inside ? cases.filter(slot => slot.open) : cases;
  const focused = focus ? drawn.find(slot => slotKey(slot) === focus.key) : undefined;

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[-260, 420, 620]} intensity={2.1} />
      <directionalLight position={[420, -180, 300]} intensity={0.7} />
      {drawn.map(slot => (
        <Case key={slot.id} slot={slot} focus={focused?.id === slot.id ? focus : null} />
      ))}
      {focus && !focused && <LooseCase caseKey={focus.key} />}
    </>
  );
}

/**
 * The single WebGL surface for the whole app. Over the page while cases sit on
 * their covers; behind it while the page rests inside an open case. Either way it
 * ignores the pointer, so every link, menu and scroll belongs to the DOM.
 */
export default function CaseStage() {
  const dpr = useMemo<[number, number]>(() => [1, 2], []);
  const [awake, setAwake] = useState(false);
  const [behind, setBehind] = useState(false);

  // Pages with no covers on screen — settings, notifications, a scrolled-past feed —
  // stop the render loop entirely rather than burning a frame budget on nothing.
  // The stage drops behind the content while a page rests in its open case, and
  // comes back over it the moment that case is picked up again.
  useEffect(() => {
    const check = () => {
      const visible = visibleCases();
      setAwake(visible.length > 0);
      setBehind(visible.some(slot => slot.open) && !focusStore.get());
    };
    check();
    const offCases = subscribeCases(check);
    const offFocus = focusStore.subscribe(check);
    return () => { offCases(); offFocus(); };
  }, []);

  return (
    <div className="pk-stage" aria-hidden="true" data-behind={behind || undefined}>
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
