"use client";

import { ReactNode } from "react";
import { AuthOrbitalCarousel } from "./AuthOrbitalCarousel";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden font-sans bg-[#020812]">
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

      <div className="relative z-10 px-2 pt-2 sm:px-4 sm:pt-6">
        <AuthOrbitalCarousel />
      </div>

      <div className="relative z-20 mt-1 flex flex-1 flex-col items-center w-full">
        <div className="absolute top-[-1px] left-0 w-full -translate-y-full overflow-hidden leading-none z-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="relative block h-[56px] w-full md:h-[112px]">
            <path
              fill="#ffffff"
              fillOpacity="1"
              d="M0,192L48,186.7C96,181,192,171,288,181.3C384,192,480,224,576,213.3C672,203,768,149,864,133.3C960,117,1056,139,1152,165.3C1248,192,1344,224,1392,240L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>

        <div className="z-10 flex w-full flex-1 flex-col items-center bg-white px-6 pt-4 pb-12 md:px-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
