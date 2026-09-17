import {
  useEffect,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

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
    subscribeMotion,
    getPrefersReducedMotion,
    getServerPrefersReducedMotion,
  );
  const [visible, setVisible] = useState(false);

  // Check after each commit: data-driven pages may attach the ref after loading.
  useEffect(() => {
    if (reducedMotion || visible) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const timer = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timer);
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
  });

  if (reducedMotion) return prefix;
  return `${prefix} ${visible ? "visible" : ""}`;
}

export function useRevealVisible(
  ref: RefObject<HTMLDivElement | null>,
  threshold = 0.15,
): boolean {
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getPrefersReducedMotion,
    getServerPrefersReducedMotion,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion || visible) return;
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
  });

  return reducedMotion || visible;
}
