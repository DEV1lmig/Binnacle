"use client";

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const CHAPTERS = [
  { title: 'The next adventure', category: 'Want to play', cover: '/landing/worlds.webp', text: 'Keep your next adventure within reach.' },
  { title: 'One more level', category: 'Now playing', cover: '/landing/pixel.webp', text: 'A little progress. A new story to tell.' },
  { title: 'Worth remembering', category: 'Played & loved', cover: '/landing/space.webp', text: 'Some worlds stay with you after the credits.' },
];

/** A keyboard-operable CSS 3D shelf; illustrations are original brand artwork. */
export function AuthOrbitalCarousel() {
  const [selected, setSelected] = useState(1);
  const current = CHAPTERS[selected];
  return <div className="pc-auth-collection">
    <div className="pc-auth-shelf" aria-label="Explore your gaming chapters">
      {CHAPTERS.map((chapter, index) => <button key={chapter.title} className="pc-auth-case" aria-label={chapter.category} aria-pressed={index === selected} data-selected={index === selected} onClick={() => setSelected(index)}>
        <Image src={chapter.cover} alt={chapter.title} width={240} height={320} />
        <span>{chapter.category}</span>
      </button>)}
    </div>
    <div className="pc-auth-caption">
      <button onClick={() => setSelected((selected + 2) % 3)} aria-label="Previous chapter"><ArrowLeft size={18} /></button>
      <div aria-live="polite"><strong>{current.category}</strong><p>{current.text}</p></div>
      <button onClick={() => setSelected((selected + 1) % 3)} aria-label="Next chapter"><ArrowRight size={18} /></button>
    </div>
  </div>;
}
