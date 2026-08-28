"use client";

import { ReactNode } from "react";
import { AuthOrbitalCarousel } from "./AuthOrbitalCarousel";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#020812] font-sans">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(65% 55% at 22% 36%, rgba(96,165,250,0.22) 0%, rgba(96,165,250,0) 70%), radial-gradient(45% 40% at 78% 28%, rgba(56,189,248,0.1) 0%, rgba(56,189,248,0) 75%), linear-gradient(180deg, #020812 0%, #06132a 52%, #051127 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(148,163,184,0.02) 0px, rgba(148,163,184,0.02) 1px, transparent 1px, transparent 56px)",
        }}
      />

      <div className="relative z-10 grid min-h-[100dvh] lg:grid-cols-2">
        <aside className="relative flex min-h-[20rem] items-center overflow-hidden border-b border-white/10 px-4 py-5 sm:min-h-[25rem] sm:px-8 sm:py-7 lg:sticky lg:top-0 lg:min-h-[100dvh] lg:self-start lg:border-r lg:border-b-0 lg:px-[clamp(2.5rem,5vw,10rem)] lg:py-10">
          <div className="mx-auto w-full max-w-[62rem]">
            <p className="mb-1 font-mono text-[0.625rem] font-medium uppercase tracking-[0.24em] text-sky-200/60 sm:mb-3 sm:text-xs">
              Binnacle archive
            </p>
            <AuthOrbitalCarousel />
          </div>
        </aside>

        <section className="flex min-h-[calc(100dvh-20rem)] items-start bg-white px-5 py-10 sm:min-h-[calc(100dvh-25rem)] sm:px-8 sm:py-14 lg:min-h-[100dvh] lg:items-center lg:px-[clamp(3rem,8vw,16rem)] lg:py-16">
          <div className="w-full max-w-[30rem] lg:mx-auto">{children}</div>
        </section>
      </div>
    </main>
  );
}
