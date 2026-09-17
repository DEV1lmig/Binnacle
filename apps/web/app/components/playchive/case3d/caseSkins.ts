/**
 * Per-game materials for the 3D case, built once per cover and cached.
 *
 * Each skin is a front texture and a spine texture painted with the landing's own
 * routines, plus solid plastic for the shell. The cache is bounded: covers that
 * scroll away are disposed so texture memory stays in the low megabytes even when a
 * reader scrolls through hundreds of games.
 */
import * as THREE from "three";
import { canvasTexture, frontCanvas, insideTexture, loadImage, spineCanvas } from "./caseArt";
import { DEFAULT_TONE, readCoverTone, type CoverTone } from "@/app/lib/coverColor";

export type CaseSkin = {
  /** Six-face material arrays, in the order three.js expects for a box. */
  tray: THREE.Material[];
  lid: THREE.Material[];
  tone: CoverTone;
  dispose: () => void;
};

const FONTS = { display: 'var(--playchive-display), Outfit, sans-serif', body: 'var(--playchive-body), "DM Sans", sans-serif' };
const LIMIT = 24;
const cache = new Map<string, CaseSkin>();
const pending = new Map<string, Promise<CaseSkin>>();
let symbol: HTMLImageElement | null = null;
let symbolTried = false;

async function brandSymbol() {
  if (symbol || symbolTried) return symbol;
  symbolTried = true;
  symbol = await loadImage("/brand/playchive-symbol.svg").catch(() => null);
  return symbol;
}

/** Drops the least recently used skins once the cache grows past its ceiling. */
function trim() {
  while (cache.size > LIMIT) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.get(oldest)?.dispose();
    cache.delete(oldest);
  }
}

function touch(key: string) {
  const skin = cache.get(key);
  if (!skin) return undefined;
  // Re-insert so the map's insertion order doubles as recency.
  cache.delete(key);
  cache.set(key, skin);
  return skin;
}

export function peekSkin(key: string) {
  return touch(key);
}

export async function buildSkin(key: string, coverUrl: string | undefined | null, title: string, anisotropy: number): Promise<CaseSkin> {
  const hit = touch(key);
  if (hit) return hit;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const work = (async () => {
    const [mark, art] = await Promise.all([
      brandSymbol(),
      coverUrl ? loadImage(coverUrl).catch(() => null) : Promise.resolve(null),
    ]);
    const tone = art ? readCoverTone(art, key) : DEFAULT_TONE;

    const front = canvasTexture(frontCanvas(art, mark, tone.tint, tone.ink, FONTS), anisotropy);
    const spine = canvasTexture(spineCanvas(mark, tone.tint, tone.ink, title, FONTS), anisotropy);
    const owned: (THREE.Texture | THREE.Material)[] = [front, spine];

    const make = (options: THREE.MeshStandardMaterialParameters) => {
      const material = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0, ...options });
      owned.push(material);
      return material;
    };

    const edge = make({ color: tone.shade });
    // Shared greyscale mouldings, tinted by the tone. Low roughness on purpose: the
    // dive ends with this face filling the screen, and matte paint would give it away.
    const inside = make({ color: tone.deep, map: insideTexture(), roughness: 0.34 });
    const cover = make({ map: front, roughness: 0.3 });
    const spineMat = make({ map: spine });
    const back = make({ color: tone.tint, roughness: 0.55 });

    const skin: CaseSkin = {
      // Box faces: +x, -x, +y, -y, +z, -z.
      tray: [edge, spineMat, edge, edge, inside, edge],
      lid: [edge, edge, edge, edge, cover, back],
      tone,
      dispose: () => owned.forEach(item => item.dispose()),
    };
    cache.set(key, skin);
    pending.delete(key);
    trim();
    return skin;
  })();

  pending.set(key, work);
  return work;
}

export function disposeSkins() {
  for (const skin of cache.values()) skin.dispose();
  cache.clear();
  pending.clear();
}
