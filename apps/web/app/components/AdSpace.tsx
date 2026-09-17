import { Prompt } from "@/app/components/playchive";

/** Editorial prompts occupy unfilled ad placements until an ad source exists. */
export function AdSpace({ variant = "sidebar", className = "" }: { variant?: "sidebar" | "banner" | "inline"; className?: string }) {
  if (variant === "banner") {
    return <Prompt tone="gold" eyebrow="A little curiosity goes a long way" title="Find your next favorite." text="Trending, top rated and fresh releases, all in one place." href="/discover" cta="Explore games" className={className} />;
  }
  return <Prompt tone="orange" eyebrow="Beyond the credits" title="Every game has a story. Tell yours." href="/article/new" cta="Write a story" className={className} />;
}
