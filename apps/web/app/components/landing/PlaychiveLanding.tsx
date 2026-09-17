"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowRight, Menu, Monitor, Moon, Sun, X } from "lucide-react";
import type { LandingGame, SceneFonts, SceneStore } from "./PlaychiveScene";
import styles from "./landing.module.css";

const PlaychiveScene = dynamic(() => import("./PlaychiveScene").then(m => m.PlaychiveScene), { ssr: false });

type Theme = "system" | "light" | "dark";
type Tone = "base" | "gold" | "cobalt" | "orange" | "night" | "surface" | "finale";

const chapters: { id: string; rail: string; tone: Tone; art?: string }[] = [
  { id: "top", rail: "Start", tone: "base" },
  { id: "collection", rail: "Next up", tone: "gold", art: "/landing/pixel.webp" },
  { id: "playing", rail: "Now playing", tone: "cobalt", art: "/landing/worlds.webp" },
  { id: "played", rail: "Played & loved", tone: "orange", art: "/landing/space.webp" },
  { id: "stories", rail: "Your stories", tone: "night", art: "/landing/worlds.webp" },
  { id: "whats-next", rail: "What’s next", tone: "surface", art: "/landing/collection.webp" },
  { id: "start", rail: "Your turn", tone: "finale" },
];

const clamp = (v: number) => Math.min(Math.max(v, 0), 1);

export function PlaychiveLanding({ fontClassName = "", games = [] }: { fontClassName?: string; games?: LandingGame[] }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [fonts, setFonts] = useState<SceneFonts | null>(null);
  const page = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const store = useRef<SceneStore>({ progress: 0, pointerX: 0, pointerY: 0 });

  // Scroll so chapter `index` sits at the point where its item is held open (local progress 0.5).
  const snapTo = (index: number) => {
    const section = sections.current[index];
    if (!section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = section.offsetTop - window.innerHeight * 0.55 + section.offsetHeight * (index === 0 ? 0.05 : 0.42);
    window.scrollTo({ top: Math.max(top, 0), behavior: reduce ? "auto" : "smooth" });
  };

  useEffect(() => {
    const measure = () => {
      const mid = window.innerHeight * 0.55;
      let progress = 0;
      let current = 0;
      sections.current.forEach((section, i) => {
        if (!section) return;
        const bounds = section.getBoundingClientRect();
        if (bounds.top > mid) return;
        progress = i + Math.min((mid - bounds.top) / bounds.height, 1);
        current = bounds.bottom > mid ? i : i + 1;
      });
      store.current.progress = progress;
      setActive(current);
      const finale = sections.current[chapters.length - 1]?.getBoundingClientRect();
      if (finale && scene.current) scene.current.style.opacity = String(clamp((finale.bottom - window.innerHeight * 0.3) / (window.innerHeight * 0.5)));
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      page.current?.style.setProperty("--progress", String(scrollable > 0 ? clamp(window.scrollY / scrollable) : 0));
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      store.current.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      store.current.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const init = window.setTimeout(() => {
      const probe = document.createElement("canvas");
      setWebgl(Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl")));
      if (page.current) {
        const style = getComputedStyle(page.current);
        setFonts({ display: style.getPropertyValue("--playchive-display").trim() || "sans-serif", body: style.getPropertyValue("--playchive-body").trim() || "sans-serif" });
      }
      measure();
    }, 0);
    // Desktop wheel: one gesture = one chapter, landing where the chapter's item is held open.
    let busy = 0;
    const wheel = (event: WheelEvent) => {
      if (window.matchMedia("(pointer: coarse)").matches || Math.abs(event.deltaY) < 4) return;
      const last = sections.current[chapters.length - 1];
      if (!last) return;
      const beyond = window.scrollY > last.offsetTop + last.offsetHeight - window.innerHeight * 1.2;
      if (beyond && (event.deltaY > 0 || window.scrollY > last.offsetTop + last.offsetHeight)) return;
      // While an item is open (its chapter's middle stretch), let the wheel scroll natively so the reader drives the opening.
      const local = store.current.progress % 1;
      const index = Math.floor(store.current.progress);
      if (index > 0 && index < chapters.length - 1 && local >= 0.4 && local < 0.8) return;
      event.preventDefault();
      if (Date.now() < busy) return;
      busy = Date.now() + 900;
      const dir = event.deltaY > 0 ? 1 : -1;
      const next = Math.min(Math.max(Math.round(store.current.progress - 0.5) + dir, 0), chapters.length - 1);
      if (dir > 0 && Math.round(store.current.progress - 0.5) >= chapters.length - 1) { window.scrollTo({ top: last.offsetTop + last.offsetHeight, behavior: "smooth" }); return; }
      snapTo(next);
    };
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("pointermove", pointer, { passive: true });
    return () => {
      window.clearTimeout(init);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", pointer);
    };
  }, []);

  function goTo(index: number) {
    snapTo(index);
  }

  const tone = active >= chapters.length ? "base" : chapters[Math.max(active, 0)].tone;
  const chapter = (index: number, className: string, children: ReactNode) => {
    const item = chapters[index];
    return (
      <section
        id={item.id}
        ref={el => { sections.current[index] = el; }}
        className={`${styles.chapter} ${className}`}
        data-tone={item.tone}
        data-active={active === index}
        aria-labelledby={`${item.id}-title`}
      >
        <div className={styles.stick}>
          {webgl === false && item.art && <div className={styles.fallbackArt}><Image src={item.art} alt="" fill sizes="(max-width: 767px) 60vw, 34vw" /></div>}
          <div className={styles.copy}>{children}</div>
        </div>
      </section>
    );
  };

  return (
    <div ref={page} className={`${styles.page} ${fontClassName}`} data-theme={theme} data-tone={tone} data-menu={menuOpen}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <div className={styles.flood} aria-hidden="true">
        {chapters.map((item, i) => <div key={item.id} className={styles.floodLayer} data-tone={item.tone} data-on={i === 0 || i <= active} />)}
      </div>
      <div ref={scene} className={styles.scene} aria-hidden="true">
        {webgl && fonts && <PlaychiveScene store={store} fonts={fonts} games={games} />}
      </div>
      <div className={styles.progress} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/" aria-label="Playchive home" className={styles.logo}>
          <Image className={styles.logoLight} src="/brand/playchive-logo-light.svg" alt="" width={840} height={256} priority />
          <Image className={styles.logoDark} src="/brand/playchive-logo-dark.svg" alt="" width={840} height={256} priority />
        </Link>
        <div className={styles.headerActions}>
          <label className={styles.themeControl}>
            {theme === "system" ? <Monitor size={16} aria-hidden="true" /> : theme === "dark" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
            <select aria-label="Color theme" value={theme} onChange={e => setTheme(e.target.value as Theme)}>
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </label>
          <Link href="/sign-in" className={styles.signIn}>Sign in</Link>
          <Link href="/sign-up" className={`${styles.button} ${styles.headerCta}`}>Start your collection</Link>
          <button className={styles.menuButton} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="landing-menu" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav id="landing-menu" aria-label="Chapters" className={styles.mobileNav} onKeyDown={e => { if (e.key === "Escape") setMenuOpen(false); }}>
          {chapters.slice(1).map((item, i) => (
            <a key={item.id} href={`#${item.id}`} onClick={() => setMenuOpen(false)} style={{ ["--i" as string]: i }}>
              <span>{String(i + 1).padStart(2, "0")}</span>{item.rail}
            </a>
          ))}
          <div className={styles.mobileNavActions}>
            <Link href="/sign-in">Sign in</Link>
            <Link href="/sign-up" className={styles.button}>Start your collection <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </nav>
      )}

      <nav className={styles.rail} aria-label="Chapters">
        {chapters.map((item, i) => (
          <button key={item.id} onClick={() => goTo(i)} aria-current={active === i ? "step" : undefined}>
            <span className={styles.tick} aria-hidden="true" />
            <span className={styles.railLabel}>{item.rail}</span>
          </button>
        ))}
      </nav>

      <main id="main">
        {chapter(0, styles.intro, <>
          <p className={styles.eyebrow}>A home for your gaming life</p>
          <h1 id="top-title">
            <span className={styles.line}><span>Your games.</span></span>
            <span className={styles.line}><span className={styles.accent}>Your story.</span></span>
          </h1>
          <p className={styles.lede}>Organize your backlog, remember what you play, and share the games that stay with you.</p>
          <div className={styles.actions}>
            <Link href="/sign-up" className={styles.button}>Start your collection <ArrowRight size={18} aria-hidden="true" /></Link>
            <button className={styles.textLink} onClick={() => goTo(1)}>Open the collection <ArrowDown size={17} aria-hidden="true" /></button>
          </div>
          <p className={styles.scrollCue} aria-hidden="true"><span />Scroll</p>
        </>)}

        {chapter(1, "", <>
          <p className={styles.eyebrow}><span>01</span>Next up</p>
          <h2 id="collection-title">So many worlds. Where next?</h2>
          <p className={styles.lede}>Keep the games you want to play in one collection. Your backlog is a shelf of possibilities, ready whenever you are.</p>
          <Link href="/discover" className={styles.textLink}>Explore games <ArrowRight size={18} aria-hidden="true" /></Link>
        </>)}

        {chapter(2, "", <>
          <p className={styles.eyebrow}><span>02</span>Now playing</p>
          <h2 id="playing-title">Make this chapter yours.</h2>
          <p className={styles.lede}>Keep track of what you’re playing, record your impressions, and build a history that feels like you.</p>
          <Link href="/sign-up" className={styles.textLink}>Start your collection <ArrowRight size={18} aria-hidden="true" /></Link>
        </>)}

        {chapter(3, "", <>
          <p className={styles.eyebrow}><span>03</span>Played & loved</p>
          <h2 id="played-title">The credits aren’t the end.</h2>
          <p className={styles.lede}>Remember what made a game matter. Leave a review, find another perspective, and meet players who see things your way.</p>
          <Link href="/discover/people" className={styles.textLink}>Find your people <ArrowRight size={18} aria-hidden="true" /></Link>
        </>)}

        {chapter(4, "", <>
          <p className={styles.eyebrow}><span>04</span>Your stories</p>
          <h2 id="stories-title">Some games end. The stories don’t.</h2>
          <p className={styles.lede}>For the worlds you still think about, the endings you debate, and the discoveries worth sharing.</p>
          <p className={styles.note}><strong>Room for a longer story.</strong> Premium article publishing is part of what’s next for Playchive.</p>
        </>)}

        {chapter(5, "", <>
          <p className={styles.eyebrow}><span>05</span>What’s next</p>
          <h2 id="whats-next-title">Your gaming life, a little closer together.</h2>
          <p className={styles.lede}>We’re planning connections with game stores and streaming services, including Twitch. These integrations aren’t available yet.</p>
          <ul className={styles.plans}>
            <li><span>Planned</span>Game-store connections</li>
            <li><span>Planned</span>Streaming connections</li>
            <li><span>Planned</span>Premium publishing</li>
          </ul>
        </>)}

        {chapter(6, styles.finale, <>
          <h2 id="start-title">Your next chapter starts with a game.</h2>
          <div className={styles.actions}>
            <Link href="/sign-up" className={styles.button}>Start your collection <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/sign-in" className={styles.textLink}>I already have an account</Link>
          </div>
        </>)}

        <div className={styles.after}>
          <section className={styles.questions} aria-labelledby="questions-title">
            <h2 id="questions-title">Before your next game.</h2>
            <div>
              <details><summary>Do I need to write or stream?<span aria-hidden="true" /></summary><p>No. Start with your collection and your backlog. Reviews and stories are there when you have something to share.</p></details>
              <details><summary>Can I connect my game-store accounts?<span aria-hidden="true" /></summary><p>Not yet. Store and streaming integrations are planned. You can organize games in Playchive without connecting those accounts.</p></details>
              <details><summary>Is Playchive a game store?<span aria-hidden="true" /></summary><p>No. Playchive is a place to organize and talk about your games, not to buy or launch them.</p></details>
            </div>
          </section>
          <footer className={styles.footer}>
            <Link href="/" aria-label="Playchive home" className={styles.logo}>
              <Image className={styles.logoLight} src="/brand/playchive-logo-light.svg" alt="" width={840} height={256} />
              <Image className={styles.logoDark} src="/brand/playchive-logo-dark.svg" alt="" width={840} height={256} />
            </Link>
            <p>Your games. Your story.</p>
            <nav aria-label="Footer navigation"><Link href="/discover">Explore games</Link><Link href="/discover/people">Find your people</Link><Link href="/sign-in">Sign in</Link></nav>
            <small>© {new Date().getFullYear()} Playchive</small>
          </footer>
        </div>
      </main>
    </div>
  );
}
