import {
  useEffect,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

const emptySubscribe = () => () => {};

function getPrefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerPrefersReducedMotion(): boolean {
  return false;
}

export function useScrollReveal(
  ref: RefObject<HTMLDivElement | null>,
  prefix: string,
): string {
  const reducedMotion = useSyncExternalStore(
    emptySubscribe,
    getPrefersReducedMotion,
    getServerPrefersReducedMotion,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      requestAnimationFrame(() => setVisible(true));
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, reducedMotion]);

  if (reducedMotion) return prefix;
  return `${prefix} ${visible ? "visible" : ""}`;
}

export function useRevealVisible(
  ref: RefObject<HTMLDivElement | null>,
  threshold = 0.15,
): boolean {
  const reducedMotion = useSyncExternalStore(
    emptySubscribe,
    getPrefersReducedMotion,
    getServerPrefersReducedMotion,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold, reducedMotion]);

  return reducedMotion || visible;
}
