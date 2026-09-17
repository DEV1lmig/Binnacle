"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const CaseStage = dynamic(() => import("./CaseStage"), { ssr: false });

function canRun() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const probe = document.createElement("canvas");
    return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Mounts the one WebGL surface, after the page has painted and only where it can
 * actually run. Without WebGL, or when the reader asks for reduced motion, nothing
 * loads and the flat covers in the DOM remain exactly as they are.
 */
export function CaseStageRoot() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canRun()) return;
    // Let the route paint its covers first; three.js arrives as an enhancement.
    const idle = window.requestIdleCallback?.(() => setReady(true), { timeout: 1200 })
      ?? window.setTimeout(() => setReady(true), 400);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
    };
  }, []);

  if (!ready) return null;
  return <CaseStage />;
}
