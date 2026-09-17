/**
 * Geometry for the Playchive case, matching the landing shelf's construction: a
 * hollow tray with four walls and a lid hinged on the left edge.
 *
 * The geometries are created once at module scope and shared by every case on
 * screen; only the materials differ per game.
 */
import * as THREE from "three";
import { CASE } from "./caseArt";

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

export const GEO = {
  trayBack: box(CASE.w - 0.08, CASE.h - 0.08, 0.02),
  trayWallY: box(0.04, CASE.h, CASE.tray),
  trayWallX: box(CASE.w - 0.08, 0.04, CASE.tray),
  lid: box(CASE.w, CASE.h, CASE.lid),
} as const;

/** Where each mesh sits, so the stage can lay a case out without repeating numbers. */
export const PLACE = {
  trayBack: [0, 0, -CASE.tray / 2 + 0.01] as const,
  wallLeft: [-CASE.w / 2 + 0.02, 0, 0] as const,
  wallRight: [CASE.w / 2 - 0.02, 0, 0] as const,
  wallTop: [0, CASE.h / 2 - 0.02, 0] as const,
  wallBottom: [0, -CASE.h / 2 + 0.02, 0] as const,
  /** The lid pivots on the left edge, like a real case. */
  hinge: [-CASE.w / 2, 0, CASE.tray / 2 + 0.001] as const,
  lid: [CASE.w / 2, 0, CASE.lid / 2] as const,
} as const;

export function disposeGeometries() {
  for (const geometry of Object.values(GEO)) geometry.dispose();
}
