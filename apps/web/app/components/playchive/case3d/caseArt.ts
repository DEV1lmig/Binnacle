/**
 * Canvas painting for the Playchive game case.
 *
 * These are the same routines the landing shelf uses, lifted out so the app's cases
 * are drawn by one implementation rather than a lookalike. `PlaychiveScene` keeps its
 * own richer variants for the story chapters (booklet inserts, discs, cartridges);
 * what is shared here is the part every cover needs: the front face and the spine.
 */
import * as THREE from "three";

/** Case proportions, in the landing's world units. */
export const CASE = { w: 1.2, h: 1.7, tray: 0.12, lid: 0.03 } as const;

/** Front face pixels. Grid cases show at ~150 CSS px, so 256 is already generous. */
const FRONT_W = 256;
const FRONT_H = 363;
const BAND = FRONT_H * 0.094;
const SPINE_W = 32;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Same-origin URL for a cover, routed through Next's image optimiser. Loading the
 * IGDB URL directly would either fail CORS or taint the canvas we sample colour from,
 * and this is the copy the DOM has already fetched.
 */
export function textureUrl(src: string | null | undefined, width = 256) {
  if (!src) return undefined;
  if (src.startsWith("/")) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function paper(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext("2d")!] as const;
}

/** Cover-fit the artwork, biased to `focus` horizontally. */
export function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number, focus = 0.5) {
  const scale = Math.max(width / img.width, height / img.height);
  const sw = width / scale;
  const sh = height / scale;
  const sx = clamp(img.width * focus - sw / 2, 0, img.width - sw);
  ctx.drawImage(img, sx, (img.height - sh) / 2, sw, sh, 0, 0, width, height);
}

export function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/** The front of a case: artwork under the branded band, exactly as on the shelf. */
export function frontCanvas(art: HTMLImageElement | null, symbol: HTMLImageElement | null, tone: string, ink: string, fonts: { body: string }) {
  const [canvas, ctx] = paper(FRONT_W, FRONT_H);
  ctx.fillStyle = "#14213B";
  ctx.fillRect(0, 0, FRONT_W, FRONT_H);
  if (art) {
    ctx.save();
    ctx.translate(0, BAND);
    drawCover(ctx, art, FRONT_W, FRONT_H - BAND);
    ctx.restore();
  }
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, FRONT_W, BAND);
  ctx.fillStyle = "#08101f22";
  ctx.fillRect(0, BAND - 2, FRONT_W, 2);
  if (symbol) ctx.drawImage(symbol, 9, 6, 21, 21);
  ctx.fillStyle = ink;
  ctx.font = `600 13px ${fonts.body}`;
  ctx.textBaseline = "middle";
  ctx.fillText("playchive", 34, BAND / 2 + 1);
  return canvas;
}

/** The spine: tone, symbol and the title running bottom to top. */
export function spineCanvas(symbol: HTMLImageElement | null, tone: string, ink: string, title: string, fonts: { display: string }) {
  const [canvas, ctx] = paper(SPINE_W, FRONT_H);
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, SPINE_W, FRONT_H);
  if (symbol) ctx.drawImage(symbol, 5, 7, 22, 22);
  ctx.save();
  ctx.translate(SPINE_W / 2 + 1, FRONT_H - 12);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";
  ctx.font = `800 13px ${fonts.display}`;
  ctx.fillText(fit(ctx, title, FRONT_H - 56), 0, 0);
  ctx.restore();
  return canvas;
}

export function canvasTexture(canvas: HTMLCanvasElement, anisotropy: number) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * The moulded inside of the tray, as one greyscale texture shared by every case: the
 * colour comes from the material, so a single 128×181 canvas dresses the whole app.
 * Mostly white, because it multiplies the tone — the ribs and grain only darken it.
 */
let insideMap: THREE.CanvasTexture | null = null;

export function insideTexture() {
  if (insideMap) return insideMap;
  const W = 128;
  const H = 181;
  const [canvas, ctx] = paper(W, H);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Mould lines running the height of the tray, doubled up near the walls.
  ctx.strokeStyle = "#00000024";
  ctx.lineWidth = 1;
  for (const x of [10, 12, W - 12, W - 10, W * 0.5]) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 6);
    ctx.lineTo(x + 0.5, H - 6);
    ctx.stroke();
  }

  // The gloss sweep, the part that reads as plastic rather than card.
  const sheen = ctx.createLinearGradient(0, H, W, 0);
  sheen.addColorStop(0, "#FFFFFF00");
  sheen.addColorStop(0.42, "#FFFFFF00");
  sheen.addColorStop(0.55, "#FFFFFF66");
  sheen.addColorStop(0.68, "#FFFFFF00");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // Grain, so large faces do not band when the case fills the screen.
  const grain = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    grain.data[i] = clamp(grain.data[i] + n, 0, 255);
    grain.data[i + 1] = clamp(grain.data[i + 1] + n, 0, 255);
    grain.data[i + 2] = clamp(grain.data[i + 2] + n, 0, 255);
  }
  ctx.putImageData(grain, 0, 0);

  insideMap = new THREE.CanvasTexture(canvas);
  insideMap.colorSpace = THREE.SRGBColorSpace;
  return insideMap;
}
