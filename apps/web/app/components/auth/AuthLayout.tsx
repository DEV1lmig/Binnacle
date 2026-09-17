"use client";

import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AuthOrbitalCarousel } from './AuthOrbitalCarousel';
import './auth.css';

export function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="pc-auth">
    <aside className="pc-auth-world">
      <Link href="/" aria-label="Playchive home"><Image src="/brand/playchive-logo-dark.svg" alt="Playchive" width={170} height={46} priority /></Link>
      <div className="pc-auth-intro"><span>Your next chapter</span><h2>Good games.<br />Great memories.</h2><p>A home for what you play, what you love, and what comes next.</p></div>
      <AuthOrbitalCarousel />
      <p className="pc-auth-footnote">Your games. Your story.</p>
    </aside>
    <section className="pc-auth-form">
      <Link href="/" className="pc-auth-back">← Back to Playchive</Link>
      <div className="pc-auth-fields">{children}</div>
      <p className="pc-auth-footer">Make room for your next favorite.</p>
    </section>
  </main>;
}
