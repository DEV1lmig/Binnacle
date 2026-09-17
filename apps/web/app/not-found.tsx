import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return <main className="min-h-[75dvh] flex flex-col items-center justify-center px-6 py-20 text-center">
    <Image src="/brand/playchive-symbol.svg" alt="Playchive" width={80} height={80} />
    <p className="mt-8 text-gold text-sm font-semibold">404 · A missing chapter</p>
    <h1 className="mt-3 text-4xl md:text-6xl font-extrabold">This page isn’t on the shelf.</h1>
    <p className="mt-5 max-w-md text-textMuted">The link may have changed. There are still plenty of games to discover.</p>
    <Link href="/discover" className="pc-primary mt-8">Explore games</Link>
  </main>;
}
