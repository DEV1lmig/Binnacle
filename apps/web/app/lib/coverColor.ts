/**
 * Dominant colour of a game cover, used to tint the case band and to paint the
 * "inside the case" background on detail pages.
 *
 * Sampling runs on a tiny canvas from the already-decoded <img>. Covers are served
 * through /_next/image (same origin) so the canvas stays untainted; remote or
 * unoptimised images throw on getImageData and we fall back to the brand cobalt.
 */
import type { CSSProperties } from "react";

export type CoverTone = {
  /** Vivid mid tone for the case band and accents. */
  tint: string;
  /** Text colour that stays readable on `tint`. */
  ink: string;
  /** Near-black version of the tint: the page background inside the case. */
  deep: string;
  /** One step lighter than `deep`, for panels sitting on that background. */
  shade: string;
};

export const DEFAULT_TONE: CoverTone = { tint: "#245CF2", ink: "#FFFFFF", deep: "#0A1024", shade: "#141C36" };

const rgbOf = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const hexOf = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");

/** Mixes `from` towards `to`. */
function blend(from: string, to: string, amount: number) {
  const a = rgbOf(from);
  const b = rgbOf(to);
  return `#${a.map((value, i) => hexOf(value + (b[i] - value) * amount)).join("")}`;
}

function alpha(hex: string, amount: number) {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r}, ${g}, ${b}, ${amount})`;
}

/**
 * Every colour a page inside the case needs, as custom properties.
 *
 * These are blended here rather than with `color-mix()` in the stylesheet on purpose.
 * The build lowers `color-mix()` for its browser targets, and a mix whose arguments
 * are `var()` cannot be computed ahead of time, so it collapses to the bare variable:
 * a wash meant to be ten per cent opaque arrives fully solid. Blending in JS, where
 * the tone is already a concrete colour, is exact and survives the pipeline.
 *
 * Set them on the page's own wrapper so the backdrop, its panels and its accents all
 * read the same tone.
 */
export function toneVars(tone: CoverTone): CSSProperties {
  return {
    "--case-tint": tone.tint,
    "--case-ink": tone.ink,
    "--case-deep": tone.deep,
    "--case-shade": tone.shade,
    /** Light falling in through the opening. */
    "--case-glow": alpha(tone.tint, 0.32),
    /** The lit and shadowed ends of the moulded plastic. */
    "--case-lit": blend(tone.deep, "#FFFFFF", 0.22),
    "--case-dim": blend(tone.deep, "#000000", 0.4),
    /** Panels resting in the tray. */
    "--case-panel": blend(tone.shade, "#0B1020", 0.18),
  } as CSSProperties;
}

const cache = new Map<string, CoverTone>();
const STORE_PREFIX = "pk-tone:";

function hsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * v).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function toHsl(r: number, g: number, b: number) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 220, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? ((gn - bn) / d + (gn < bn ? 6 : 0)) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

/** Relative luminance, for picking readable text on the tint. */
function luminance(r: number, g: number, b: number) {
  const f = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function toneFrom(h: number, s: number): CoverTone {
  // Clamp so any cover yields a band that reads as a brand surface, not mud or neon.
  const sat = Math.min(0.82, Math.max(0.34, s));
  const tint = hsl(h, sat, 0.52);
  const rgb = [1, 3, 5].map(i => parseInt(tint.slice(i, i + 2), 16)) as [number, number, number];
  return {
    tint,
    ink: luminance(rgb[0], rgb[1], rgb[2]) > 0.4 ? "#101827" : "#FFFFFF",
    deep: hsl(h, Math.min(0.55, sat), 0.085),
    shade: hsl(h, Math.min(0.42, sat), 0.155),
  };
}

/**
 * Samples the image and returns its tone. Returns the default tone when the
 * canvas is tainted, the image is empty, or the cover has no usable colour.
 */
export function readCoverTone(img: HTMLImageElement, key?: string): CoverTone {
  const id = key ?? img.currentSrc ?? img.src;
  const hit = cache.get(id);
  if (hit) return hit;
  let tone = DEFAULT_TONE;
  try {
    const w = 24;
    const h = 36;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !img.naturalWidth) return tone;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    // Weight each pixel by saturation so a dominant grey background never wins.
    const bins = new Array(24).fill(0);
    const sums = new Array(24).fill(0);
    let weighted = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      const { h: hue, s, l } = toHsl(data[i], data[i + 1], data[i + 2]);
      if (l < 0.08 || l > 0.95) continue;
      const weight = s * s;
      if (weight < 0.02) continue;
      const bin = Math.floor(hue / 15) % 24;
      bins[bin] += weight;
      sums[bin] += s * weight;
      weighted += weight;
    }
    if (weighted > 0) {
      let best = 0;
      for (let i = 1; i < bins.length; i++) if (bins[i] > bins[best]) best = i;
      tone = toneFrom(best * 15 + 7.5, sums[best] / bins[best]);
    }
  } catch {
    // Tainted canvas or no 2D context: keep the brand default.
  }
  cache.set(id, tone);
  return tone;
}

/** Remembers a tone so the destination page can paint before its own cover decodes. */
export function rememberTone(key: string, tone: CoverTone) {
  cache.set(`id:${key}`, tone);
  try {
    sessionStorage.setItem(STORE_PREFIX + key, JSON.stringify(tone));
  } catch {
    // Private mode or a full quota: the page just falls back to the default tone.
  }
}

/** Reads a remembered tone synchronously, so the first paint is already tinted. */
export function recallTone(key: string | undefined): CoverTone | null {
  if (!key || typeof window === "undefined") return null;
  const hit = cache.get(`id:${key}`);
  if (hit) return hit;
  try {
    const raw = sessionStorage.getItem(STORE_PREFIX + key);
    if (!raw) return null;
    const tone = JSON.parse(raw) as CoverTone;
    return typeof tone?.tint === "string" ? tone : null;
  } catch {
    return null;
  }
}
