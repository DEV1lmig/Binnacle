"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

export type SceneStore = { progress: number; pointerX: number; pointerY: number };
export type SceneFonts = { display: string; body: string };
export type LandingGame = { title: string; cover: string };

type Layout = { mobile: boolean; w: number; h: number };
type Target = { p: THREE.Vector3; q: THREE.Quaternion; s: number; open: number; reach: number };
type Media = "disc" | "cartridge";

const LAST_CHAPTER = 6;
const CASE = { w: 1.2, h: 1.7, tray: 0.12, lid: 0.03 };
const CASE_T = CASE.tray + CASE.lid + 0.001;
const BOOK_T = 0.235;
const BOOK_H = 1.8;
const GAP = 0.014;
// Slide distance: the whole case width plus clearance, so it is fully free of its neighbours before it turns.
const OUT = CASE.w + 0.7;

const TONES = [
  { tone: "#ffc400", edge: "#e0ab00", ink: "#101827" },
  { tone: "#1649e8", edge: "#0f36b3", ink: "#ffffff" },
  { tone: "#d24d00", edge: "#a83c00", ink: "#ffffff" },
] as const;
const ART = ["/landing/collection.webp", "/landing/pixel.webp", "/landing/space.webp", "/landing/worlds.webp"];

// Cases 0–2 star in chapters 1–3; the rest fill the shelf. Fallback art is original Playchive illustration.
const CASES: { label: string; art: string; focus: number; media?: Media; tone: string; edge: string; ink: string }[] = [
  { label: "Next up", art: "/landing/pixel.webp", focus: 0.5, media: "disc", ...TONES[0] },
  { label: "Now playing", art: "/landing/worlds.webp", focus: 0.42, media: "disc", ...TONES[1] },
  { label: "Played & loved", art: "/landing/space.webp", focus: 0.5, media: "cartridge", ...TONES[2] },
  ...Array.from({ length: 8 }, (_, i) => ({ label: "", art: ART[i % ART.length], focus: (0.1 + i * 0.13) % 1, ...TONES[(i + 1) % 3] })),
];

// Shelf order, left to right. BOOK marks the journal.
const BOOK = -1;
const SLOTS = [3, 4, 0, 5, 1, 6, BOOK, 7, 2, 8, 9, 10];
const FOCUS_SLOT: Record<number, number> = { 1: 2, 2: 4, 3: 8, 4: 6 };
const FINALE_SLOT = 2;

const ROW = (() => {
  const sizes = SLOTS.map(slot => (slot === BOOK ? { t: BOOK_T, h: BOOK_H, shift: 0 } : { t: CASE_T, h: CASE.h, shift: (CASE.lid - 0.001) / 2 + 0.0005 }));
  const length = sizes.reduce((sum, size) => sum + size.t, 0) + GAP * (sizes.length - 1);
  let cursor = -length / 2;
  return {
    length,
    slots: sizes.map(size => {
      const x = cursor + size.t / 2;
      cursor += size.t + GAP;
      return { ...size, x };
    }),
  };
})();

const clamp = (v: number, min = 0, max = 1) => Math.min(Math.max(v, min), max);
const smoothstep = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const SPINE_OUT = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI / 2);

function layoutFor(w: number, h: number, pixelWidth: number): Layout {
  return { mobile: w / h < 1 || pixelWidth < 560, w, h };
}

function shelfPose(chapter: number, L: Layout) {
  if (L.mobile) return { p: new THREE.Vector3(0.02, L.h * 0.3 - 0.8, -1.2), ry: -0.5, s: 0.72 };
  if (chapter === 5) return { p: new THREE.Vector3(-L.w * 0.25, -1.15, -0.3), ry: -0.3, s: 1.15 };
  if (chapter === 6) return { p: new THREE.Vector3(0, 0, -0.5), ry: -0.42, s: 0.85 };
  return { p: new THREE.Vector3(-L.w * 0.29, -1.05, -0.4), ry: -0.5, s: 1 };
}

function focusPose(book: boolean, open: number, L: Layout) {
  const [x, y, z, ry, s] = L.mobile
    ? book ? [0.25 * open, L.h * 0.18, 1.7, -0.5 + 0.5 * open, 0.42] : [0.12 * open, L.h * 0.16, 1.7, -0.35 + 0.45 * open, 0.6]
    : book ? [-L.w * 0.15 - 0.3 * (1 - open), 0.3, 2.0, -0.5 + 0.5 * open, 0.52] : [-L.w * 0.13 + 0.3 * open, 0.25, 1.9, -0.3 + 0.45 * open, 0.85];
  return { p: new THREE.Vector3(x, y, z), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.05, ry, 0.02 * (1 - open))), s };
}

// A standing item at rest, optionally leaning into an empty neighbouring slot around its bottom edge.
function restingPose(i: number, lean: number) {
  const { x, t, h, shift } = ROW.slots[i];
  const q = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, lean).multiply(SPINE_OUT);
  const pivot = new THREE.Vector3(lean > 0 ? x - t / 2 : x + t / 2, 0, 0);
  const center = new THREE.Vector3(lean > 0 ? t / 2 : -t / 2, h / 2, 0).applyAxisAngle(Z_AXIS, lean);
  const p = lean ? pivot.add(center) : new THREE.Vector3(x, h / 2, 0);
  p.x -= shift;
  return { p, q };
}

function targets(progress: number, L: Layout): Target[] {
  const p = clamp(progress, 0, LAST_CHAPTER);
  const chapter = Math.min(Math.floor(p), LAST_CHAPTER);
  const local = p - chapter;
  const a = shelfPose(chapter, L);
  const b = shelfPose(Math.min(chapter + 1, LAST_CHAPTER), L);
  const k = smoothstep(0.8, 1, local);
  const shelf = { p: a.p.lerp(b.p, k), q: new THREE.Quaternion().setFromAxisAngle(Y_AXIS, a.ry + (b.ry - a.ry) * k), s: a.s + (b.s - a.s) * k };

  // One item at a time: slide out, lift toward the reader, open, then close and return before the next chapter.
  const focus = chapter === LAST_CHAPTER ? FINALE_SLOT : FOCUS_SLOT[chapter] ?? -1;
  const pull = chapter === LAST_CHAPTER ? 0.42 * smoothstep(0.1, 0.5, local) : smoothstep(0, 0.18, local) * (1 - smoothstep(0.82, 0.98, local));
  const reach = chapter === LAST_CHAPTER ? 0 : smoothstep(0.2, 0.4, local) * (1 - smoothstep(0.64, 0.8, local));
  const open = chapter === LAST_CHAPTER ? 0 : smoothstep(0.42, 0.58, local) * (1 - smoothstep(0.66, 0.76, local));
  const neighbour = focus < 0 ? -1 : focus < SLOTS.length - 1 ? focus + 1 : focus - 1;
  const gap = focus < 0 ? 0 : ROW.slots[focus].t + GAP;
  const lean = neighbour < 0 ? 0 : Math.asin(Math.min(gap / ROW.slots[neighbour].h, 0.3)) * smoothstep(0.6, 1, pull) * (neighbour > focus ? 1 : -1);

  return SLOTS.map((slot, i) => {
    const rest = restingPose(i, i === neighbour ? lean : 0);
    const mine = i === focus;
    if (mine) {
      rest.p.z += pull * OUT;
      rest.p.y += pull * 0.03;
    }
    const world = {
      p: rest.p.multiplyScalar(shelf.s).applyQuaternion(shelf.q).add(shelf.p),
      q: shelf.q.clone().multiply(rest.q),
      s: shelf.s,
      open: mine ? open : 0,
      reach: mine ? reach : 0,
    };
    if (mine && reach > 0) {
      const held = focusPose(slot === BOOK, open, L);
      world.p.lerp(held.p, reach);
      world.q.slerp(held.q, reach);
      world.s += (held.s - world.s) * reach;
    }
    return world;
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function paper(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext("2d")!] as const;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number, focus: number) {
  const scale = Math.max(width / img.width, height / img.height);
  const sw = width / scale;
  const sh = height / scale;
  const sx = clamp(img.width * focus - sw / 2, 0, img.width - sw);
  ctx.drawImage(img, sx, (img.height - sh) / 2, sw, sh, 0, 0, width, height);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const line = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
    if (lines.length && ctx.measureText(line).width <= maxWidth) lines[lines.length - 1] = line;
    else lines.push(word);
  }
  return lines;
}

function shade(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(8,15,31,.8)");
  gradient.addColorStop(0.38, "rgba(8,15,31,0)");
  gradient.addColorStop(0.68, "rgba(8,15,31,0)");
  gradient.addColorStop(1, "rgba(8,15,31,.85)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function headline(ctx: CanvasRenderingContext2D, text: string, font: string, x: number, y: number, size: number, maxWidth: number) {
  ctx.font = `800 ${size}px ${font}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${-size * 0.04}px`;
  wrap(ctx, text, maxWidth).forEach((line, i) => ctx.fillText(line, x, y + i * size * 0.98));
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function circle(ctx: CanvasRenderingContext2D, radius: number, color: string, center = 256) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();
}

function spineCanvas(symbol: HTMLImageElement, tone: string, ink: string, text: string, font: string) {
  const [spine, ctx] = paper(64, 725);
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, 64, 725);
  ctx.drawImage(symbol, 10, 14, 44, 44);
  ctx.save();
  ctx.translate(33, 700);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";
  ctx.font = `800 24px ${font}`;
  ctx.fillText(fit(ctx, text, 610), 0, 0);
  ctx.restore();
  return spine;
}

async function buildMaterials(fonts: SceneFonts, games: LandingGame[], anisotropy: number) {
  await Promise.all([
    document.fonts.load(`800 80px ${fonts.display}`),
    document.fonts.load(`400 28px ${fonts.body}`),
    document.fonts.load(`600 28px ${fonts.body}`),
  ]).catch(() => undefined);
  const cache = new Map<string, Promise<HTMLImageElement>>();
  const image = (src: string) => {
    if (!cache.has(src)) cache.set(src, loadImage(src));
    return cache.get(src)!;
  };
  const [symbol, worlds, ...images] = await Promise.all([
    image("/brand/playchive-symbol.svg"),
    image("/landing/worlds.webp"),
    ...CASES.map((c, i) => (games[i] ? loadImage(games[i].cover).catch(() => image(c.art)) : image(c.art))),
  ]);
  const all: THREE.MeshStandardMaterial[] = [];
  const texture = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
  };
  const surface = (options: THREE.MeshStandardMaterialParameters) => {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0, ...options });
    all.push(material);
    return material;
  };
  const hollow = surface({ color: "#0b1324", roughness: 0.8 });

  const cases = CASES.map((item, i) => {
    const title = games[i]?.title ?? (item.label || "playchive");
    const art = images[i];
    const focus = games[i] ? 0.5 : item.focus;
    const band = 68;
    const [front, fctx] = paper(512, 725);
    fctx.save();
    fctx.translate(0, band);
    drawCover(fctx, art, 512, 725 - band, focus);
    fctx.restore();
    fctx.fillStyle = item.tone;
    fctx.fillRect(0, 0, 512, band);
    fctx.fillStyle = "#08101f22";
    fctx.fillRect(0, band - 4, 512, 4);
    fctx.drawImage(symbol, 18, 13, 42, 42);
    fctx.fillStyle = item.ink;
    fctx.font = `600 26px ${fonts.body}`;
    fctx.fillText("playchive", 68, 44);
    if (item.label) {
      fctx.textAlign = "right";
      fctx.font = `800 23px ${fonts.display}`;
      fctx.fillText(item.label.toUpperCase(), 494, 44);
      fctx.textAlign = "left";
    }

    const edge = surface({ color: item.edge });
    const cover = surface({ map: texture(front), roughness: 0.3 });
    const spine = surface({ map: texture(spineCanvas(symbol, item.tone, item.ink, title, fonts.display)) });
    if (!item.media) {
      return { media: undefined, tray: [edge, spine, edge, edge, hollow, edge], lid: [edge, edge, edge, edge, cover, surface({ color: item.tone })] };
    }

    const disc = item.media === "disc";
    const [inner, nctx] = paper(512, 725);
    nctx.fillStyle = "#0b1324";
    nctx.fillRect(0, 0, 512, 725);
    nctx.strokeStyle = "#ffffff24";
    nctx.lineWidth = 4;
    nctx.beginPath();
    if (disc) nctx.arc(256, 362, 200, 0, Math.PI * 2);
    else nctx.roundRect(60, 200, 392, 400, 22);
    nctx.stroke();

    // Inside of the lid: molded plastic with the manual's front page held under a clear frame.
    const [insert, ictx] = paper(512, 725);
    ictx.fillStyle = item.edge;
    ictx.fillRect(0, 0, 512, 725);
    ictx.fillStyle = "#00000022";
    for (let r = 0; r < 12; r++) ictx.fillRect(0, 40 + r * 56, 512, 3);
    ictx.save();
    ictx.translate(46, 44);
    ictx.fillStyle = "#f7f4ea";
    ictx.fillRect(0, 0, 420, 637);
    ictx.save();
    ictx.beginPath();
    ictx.rect(20, 20, 380, 300);
    ictx.clip();
    ictx.translate(20, 20);
    drawCover(ictx, art, 380, 300, focus);
    ictx.restore();
    ictx.fillStyle = "#101827";
    ictx.font = `800 30px ${fonts.display}`;
    wrap(ictx, title, 380).slice(0, 2).forEach((line, k) => ictx.fillText(line, 20, 372 + k * 34));
    ictx.fillStyle = "#526078";
    ictx.font = `600 15px ${fonts.body}`;
    ictx.fillText("INSTRUCTION BOOKLET", 20, 438);
    ictx.fillStyle = "#c9cfdb";
    for (let r = 0; r < 7; r++) ictx.fillRect(20, 462 + r * 18, r % 3 === 2 ? 240 : 380, 8);
    ictx.drawImage(symbol, 20, 585, 34, 34);
    ictx.fillStyle = "#101827";
    ictx.font = `600 16px ${fonts.body}`;
    ictx.fillText("playchive", 62, 608);
    ictx.restore();
    ictx.fillStyle = "#ffffff26";
    ictx.fillRect(46, 44, 420, 10);

    let label: HTMLCanvasElement;
    if (disc) {
      const [canvas, dctx] = paper(512, 512);
      const shine = dctx.createConicGradient(0, 256, 256);
      [["#dfe6f2", 0], ["#b7f3ff", 0.16], ["#eadbff", 0.32], ["#fff3c4", 0.48], ["#cfe0ff", 0.64], ["#bfffe8", 0.8], ["#dfe6f2", 1]].forEach(([color, stop]) => shine.addColorStop(stop as number, color as string));
      dctx.fillStyle = shine;
      dctx.beginPath();
      dctx.arc(256, 256, 256, 0, Math.PI * 2);
      dctx.fill();
      dctx.save();
      dctx.beginPath();
      dctx.arc(256, 256, 204, 0, Math.PI * 2);
      dctx.clip();
      drawCover(dctx, art, 512, 512, focus);
      dctx.restore();
      dctx.strokeStyle = item.tone;
      dctx.lineWidth = 12;
      dctx.beginPath();
      dctx.arc(256, 256, 204, 0, Math.PI * 2);
      dctx.stroke();
      circle(dctx, 60, "#e9eef6");
      circle(dctx, 24, "#0b1324");
      label = canvas;
    } else {
      // Super Nintendo style: grey shell, label up top, connector flap below.
      const [canvas, kctx] = paper(512, 543);
      kctx.fillStyle = "#9294a2";
      kctx.fillRect(0, 0, 512, 543);
      kctx.save();
      kctx.beginPath();
      kctx.roundRect(40, 26, 432, 262, 10);
      kctx.clip();
      kctx.translate(40, 26);
      drawCover(kctx, art, 432, 262, focus);
      kctx.restore();
      kctx.fillStyle = item.tone;
      kctx.fillRect(40, 250, 432, 38);
      kctx.drawImage(symbol, 50, 254, 30, 30);
      kctx.fillStyle = item.ink;
      kctx.font = `700 22px ${fonts.body}`;
      kctx.fillText("playchive", 88, 277);
      kctx.textAlign = "right";
      kctx.font = `800 18px ${fonts.display}`;
      kctx.fillText(fit(kctx, title.toUpperCase(), 240), 460, 276);
      kctx.textAlign = "left";
      kctx.fillStyle = "#858795";
      kctx.fillRect(66, 330, 380, 213);
      kctx.fillStyle = "#a4a6b3";
      kctx.fillRect(66, 330, 380, 4);
      kctx.fillStyle = "#777987";
      kctx.fillRect(190, 350, 3, 193);
      kctx.fillRect(320, 350, 3, 193);
      label = canvas;
    }

    const plastic = surface({ color: disc ? "#dfe4ee" : "#9294a2", roughness: disc ? 0.25 : 0.55 });
    return {
      media: item.media,
      tray: [edge, spine, edge, edge, surface({ map: texture(inner), roughness: 0.7 }), edge],
      lid: [edge, edge, edge, edge, cover, surface({ map: texture(insert), roughness: 0.6 })],
      shell: disc
        ? [plastic, surface({ map: texture(label), roughness: 0.22 }), plastic]
        : [plastic, plastic, plastic, plastic, surface({ map: texture(label), roughness: 0.5 }), plastic],
      wing: surface({ color: "#8a8c9a", roughness: 0.6 }),
      mold: surface({ color: "#2b3552", roughness: 0.75 }),
      clip: surface({ color: "#dfe4ee", roughness: 0.2, transparent: true, opacity: 0.55 }),
    };
  });

  const [cover, cctx] = paper(640, 886);
  drawCover(cctx, worlds, 640, 886, 0.28);
  shade(cctx, 640, 886);
  cctx.fillStyle = "#ffffff";
  headline(cctx, "The worlds we keep.", fonts.display, 52, 132, 88, 500);
  cctx.font = `600 30px ${fonts.body}`;
  cctx.fillText("playchive / stories", 52, 836);

  const [inside, ictx] = paper(640, 886);
  ictx.fillStyle = "#ffc400";
  ictx.fillRect(0, 0, 640, 886);
  ictx.fillStyle = "#101827";
  headline(ictx, "Every game leaves a story.", fonts.display, 60, 380, 74, 500);

  const [page, pctx] = paper(640, 898);
  pctx.fillStyle = "#fbf8ef";
  pctx.fillRect(0, 0, 640, 898);
  pctx.fillStyle = "#1649e8";
  pctx.fillRect(56, 64, 72, 6);
  pctx.fillStyle = "#101827";
  pctx.font = `600 22px ${fonts.body}`;
  if ("letterSpacing" in pctx) pctx.letterSpacing = "4px";
  pctx.fillText("YOUR NEXT STORY", 56, 126);
  if ("letterSpacing" in pctx) pctx.letterSpacing = "0px";
  headline(pctx, "What stays after the game?", fonts.display, 56, 230, 66, 520);
  pctx.fillStyle = "#33415c";
  pctx.font = `400 29px ${fonts.body}`;
  let y = 470;
  for (const paragraph of ["The place you got lost. The character you understood. The ending you still think about.", "Give those moments more than a score."]) {
    for (const line of wrap(pctx, paragraph, 520)) { pctx.fillText(line, 56, y); y += 44; }
    y += 30;
  }

  const bookEdge = surface({ color: "#0f36b3" });
  const bookSpine = surface({ map: texture(spineCanvas(symbol, "#0f36b3", "#ffffff", "Stories", fonts.display)) });
  const pages = surface({ color: "#efe8d6", roughness: 0.9 });
  const plank = surface({ color: "#101827", roughness: 0.75 });
  return {
    all,
    cases,
    shelf: [plank, plank, surface({ color: "#1c2640", roughness: 0.7 }), plank, surface({ color: "#2a3654", roughness: 0.6 }), plank],
    book: {
      edge: bookEdge,
      spine: [bookEdge, bookSpine, bookEdge, bookEdge, bookEdge, bookEdge],
      cover: [bookEdge, bookEdge, bookEdge, bookEdge, surface({ map: texture(cover), roughness: 0.55 }), surface({ map: texture(inside), roughness: 0.7 })],
      pages: [pages, pages, pages, pages, surface({ map: texture(page), roughness: 0.9 }), pages],
    },
  };
}

type Materials = Awaited<ReturnType<typeof buildMaterials>>;

function Collection({ store, fonts, games, reduce }: { store: RefObject<SceneStore>; fonts: SceneFonts; games: LandingGame[]; reduce: boolean }) {
  const gl = useThree(state => state.gl);
  const [materials, setMaterials] = useState<Materials | null>(null);
  const root = useRef<THREE.Group>(null);
  const shelf = useRef<THREE.Group>(null);
  const items = useRef<(THREE.Group | null)[]>([]);
  const lids = useRef<(THREE.Group | null)[]>([]);
  const media = useRef<(THREE.Group | null)[]>([]);
  const current = useRef<Target[] | null>(null);
  const born = useRef(0);

  useEffect(() => {
    let alive = true;
    let built: Materials | null = null;
    buildMaterials(fonts, games, gl.capabilities.getMaxAnisotropy()).then(result => {
      built = result;
      if (alive) setMaterials(result);
    });
    return () => {
      alive = false;
      for (const material of built?.all ?? []) {
        material.map?.dispose();
        material.dispose();
      }
    };
  }, [fonts, games, gl]);

  useFrame((state, delta) => {
    if (!materials) return;
    const L = layoutFor(state.viewport.width, state.viewport.height, state.size.width);
    const time = state.clock.elapsedTime;
    const { progress, pointerX, pointerY } = store.current;
    const goals = targets(progress, L);
    if (!current.current) {
      born.current = time;
      // Items drop onto the shelf one after another.
      current.current = goals.map(goal => ({ ...goal, p: goal.p.clone().setY(goal.p.y + (reduce ? 0 : L.h * 1.2)), q: goal.q.clone() }));
    }
    const step = Math.min(delta, 0.05);
    const ease = 1 - Math.exp(-5 * step);

    const p = clamp(progress, 0, LAST_CHAPTER);
    const chapter = Math.min(Math.floor(p), LAST_CHAPTER);
    const a = shelfPose(chapter, L);
    const b = shelfPose(Math.min(chapter + 1, LAST_CHAPTER), L);
    const k = smoothstep(0.8, 1, p - chapter);
    if (shelf.current) {
      // Same easing as the items so the plank and the cases travel together.
      const target = a.p.lerp(b.p, k);
      const ry = a.ry + (b.ry - a.ry) * k;
      const sc = a.s + (b.s - a.s) * k;
      if (reduce || time - born.current < 0.02) {
        shelf.current.position.copy(target);
        shelf.current.rotation.set(0, ry, 0);
        shelf.current.scale.setScalar(sc);
      } else {
        shelf.current.position.lerp(target, ease);
        shelf.current.rotation.y += (ry - shelf.current.rotation.y) * ease;
        shelf.current.scale.setScalar(shelf.current.scale.x + (sc - shelf.current.scale.x) * ease);
      }
    }

    goals.forEach((goal, i) => {
      const now = current.current![i];
      if (reduce) {
        now.p.copy(goal.p);
        now.q.copy(goal.q);
        Object.assign(now, { s: goal.s, open: goal.open, reach: goal.reach });
      } else if (time - born.current > 0.25 + i * 0.07) {
        now.p.lerp(goal.p, ease);
        now.q.slerp(goal.q, ease);
        now.s += (goal.s - now.s) * ease;
        now.open += (goal.open - now.open) * ease;
        now.reach += (goal.reach - now.reach) * ease;
      }
      const group = items.current[i];
      if (!group) return;
      const bob = reduce ? 0 : Math.sin(time * 0.9 + i) * 0.03 * now.reach;
      group.position.set(now.p.x, now.p.y + bob, now.p.z);
      group.quaternion.copy(now.q);
      group.scale.setScalar(now.s);
      const lid = lids.current[i];
      if (lid) lid.rotation.y = -now.open * (SLOTS[i] === BOOK ? 2.8 : 2.05);
      const inside = media.current[i];
      if (inside) {
        const disc = materials.cases[SLOTS[i]]?.media === "disc";
        const lift = smoothstep(0.3, 1, now.open);
        inside.visible = now.open > 0.01;
        inside.position.set(0, disc ? 0 : 0.12 * lift, CASE.tray / 2 - (disc ? 0.02 : 0.055) + lift * (disc ? 0.2 : 0.28));
        inside.rotation.set(-0.12 * lift, 0, disc && !reduce ? time * 0.9 : 0);
      }
    });

    if (root.current && !reduce) {
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, pointerX * 0.08, 3, step);
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, pointerY * 0.04, 3, step);
    }
  });

  if (!materials) return null;
  return (
    <group ref={root}>
      <group ref={shelf}>
        <mesh position={[0, -0.04, 0]} material={materials.shelf}>
          <boxGeometry args={[ROW.length + 0.5, 0.08, 1.3]} />
        </mesh>
      </group>
      {SLOTS.map((slot, i) => {
        if (slot === BOOK) {
          return (
            <group key={i} ref={el => { items.current[i] = el; }}>
              <mesh position={[0, 0, -0.1]} material={materials.book.edge}>
                <boxGeometry args={[1.3, BOOK_H, 0.035]} />
              </mesh>
              <mesh position={[-0.66, 0, 0]} material={materials.book.spine}>
                <boxGeometry args={[0.035, BOOK_H, BOOK_T]} />
              </mesh>
              <mesh position={[0.02, 0, 0]} material={materials.book.pages}>
                <boxGeometry args={[1.24, 1.74, 0.16]} />
              </mesh>
              <group ref={el => { lids.current[i] = el; }} position={[-0.65, 0, 0.1]}>
                <mesh position={[0.65, 0, 0]} material={materials.book.cover}>
                  <boxGeometry args={[1.3, BOOK_H, 0.035]} />
                </mesh>
              </group>
            </group>
          );
        }
        const item = materials.cases[slot];
        return (
          <group key={i} ref={el => { items.current[i] = el; }}>
            {/* Hollow tray: thin back panel, four walls, molded holder inside. */}
            <mesh position={[0, 0, -CASE.tray / 2 + 0.01]} material={item.tray}>
              <boxGeometry args={[CASE.w - 0.08, CASE.h - 0.08, 0.02]} />
            </mesh>
            <mesh position={[-CASE.w / 2 + 0.02, 0, 0]} material={item.tray}>
              <boxGeometry args={[0.04, CASE.h, CASE.tray]} />
            </mesh>
            <mesh position={[CASE.w / 2 - 0.02, 0, 0]} material={item.tray}>
              <boxGeometry args={[0.04, CASE.h, CASE.tray]} />
            </mesh>
            <mesh position={[0, CASE.h / 2 - 0.02, 0]} material={item.tray}>
              <boxGeometry args={[CASE.w - 0.08, 0.04, CASE.tray]} />
            </mesh>
            <mesh position={[0, -CASE.h / 2 + 0.02, 0]} material={item.tray}>
              <boxGeometry args={[CASE.w - 0.08, 0.04, CASE.tray]} />
            </mesh>
            {item.media === "disc" && (
              <group position={[0, 0, -CASE.tray / 2 + 0.02]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={item.mold}>
                  <cylinderGeometry args={[0.5, 0.5, 0.02, 48]} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.03]} material={item.mold}>
                  <cylinderGeometry args={[0.07, 0.07, 0.06, 24]} />
                </mesh>
              </group>
            )}
            {item.media === "cartridge" && (
              <mesh position={[0, -0.05, -CASE.tray / 2 + 0.03]} material={item.mold}>
                <boxGeometry args={[0.94, 1.1, 0.04]} />
              </mesh>
            )}
            {item.media && (
              <group ref={el => { media.current[i] = el; }} visible={false}>
                {item.media === "disc" ? (
                  <mesh rotation={[Math.PI / 2, 0, 0]} material={item.shell}>
                    <cylinderGeometry args={[0.46, 0.46, 0.014, 64]} />
                  </mesh>
                ) : (
                  <group>
                    <mesh material={item.shell}>
                      <boxGeometry args={[0.66, 0.7, 0.1]} />
                    </mesh>
                    {[-1, 1].flatMap(side => Array.from({ length: 6 }, (_, r) => (
                      <mesh key={`${side}-${r}`} material={item.wing} position={[side * 0.42, 0.26 - r * 0.106, 0]}>
                        <boxGeometry args={[0.18, 0.094, 0.086]} />
                      </mesh>
                    )))}
                  </group>
                )}
              </group>
            )}
            <group ref={el => { lids.current[i] = el; }} position={[-CASE.w / 2, 0, CASE.tray / 2 + 0.001]}>
              <mesh position={[CASE.w / 2, 0, CASE.lid / 2]} material={item.lid}>
                <boxGeometry args={[CASE.w, CASE.h, CASE.lid]} />
              </mesh>
              {item.media && [-0.62, 0.62].map(y => (
                <mesh key={y} position={[CASE.w / 2, y, -0.012]} material={item.clip}>
                  <boxGeometry args={[0.36, 0.05, 0.024]} />
                </mesh>
              ))}
              {item.media && [0.06, CASE.w - 0.06].map(x => (
                <mesh key={x} position={[x, 0, -0.01]} material={item.mold}>
                  <boxGeometry args={[0.03, CASE.h - 0.1, 0.02]} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
}

export function PlaychiveScene({ store, fonts, games }: { store: RefObject<SceneStore>; fonts: SceneFonts; games: LandingGame[] }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return (
    <Canvas flat dpr={[1, 1.75]} camera={{ position: [0, 0, 6], fov: 35 }} gl={{ antialias: true, alpha: true }} aria-hidden="true">
      <ambientLight intensity={1.7} />
      <directionalLight position={[3, 4, 6]} intensity={2.1} />
      <directionalLight position={[-5, -2, 3]} intensity={0.7} color="#8daeff" />
      <Collection store={store} fonts={fonts} games={games} reduce={reduce} />
    </Canvas>
  );
}
