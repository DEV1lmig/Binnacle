"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeading, Segmented } from "@/app/components/playchive";

type Tab = "screenshots" | "artworks" | "videos";
type Video = { id: string; name?: string };

function parseList<T>(raw: string | undefined, map: (item: unknown) => T | null): T[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.flatMap((item) => map(item) ?? []) : [];
  } catch {
    return [];
  }
}

const toImage = (item: unknown) => (typeof item === "string" && item.startsWith("https://images.igdb.com/") ? item : null);
const toVideo = (item: unknown): Video | null => {
  if (typeof item === "string") return { id: item };
  const video = item as { video_id?: string; name?: string } | null;
  return video?.video_id ? { id: video.video_id, name: video.name } : null;
};

/**
 * Screenshots, artworks and trailers of a game. Each prop is the JSON string
 * stored on the game; the section renders nothing when there is no media.
 */
export function MediaGallery({ artworks, screenshots, videos, title }: {
  artworks?: string; screenshots?: string; videos?: string; title: string;
}) {
  const media = {
    screenshots: parseList(screenshots, toImage),
    artworks: parseList(artworks, toImage),
    videos: parseList(videos, toVideo),
  };
  const tabs = (["screenshots", "artworks", "videos"] as const).filter((tab) => media[tab].length > 0);

  const [picked, setPicked] = useState<Tab | null>(null);
  const [index, setIndex] = useState(0);

  if (tabs.length === 0) return null;
  const tab = picked && tabs.includes(picked) ? picked : tabs[0];
  const count = media[tab].length;
  const current = Math.min(index, count - 1);
  const step = (delta: number) => setIndex((current + delta + count) % count);

  return (
    <section>
      <SectionHeading eyebrow="Media" title="See it in motion.">
        {tabs.length > 1 && (
          <Segmented
            label="Media type"
            value={tab}
            onChange={(next) => { setPicked(next); setIndex(0); }}
            options={tabs.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1), count: media[value].length }))}
          />
        )}
      </SectionHeading>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#2D3E59] bg-[#0B1426]">
        {tab === "videos" ? (
          <iframe
            key={media.videos[current].id}
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(media.videos[current].id)}`}
            title={media.videos[current].name ?? `${title} video`}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <Image
              key={media[tab][current]}
              src={media[tab][current]}
              alt={`${title}, ${tab === "artworks" ? "artwork" : "screenshot"} ${current + 1} of ${count}`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1000px"
            />
            {count > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous image" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-[#0B1426]/80 text-white backdrop-blur transition-colors hover:bg-[#0B1426]">
                  <ChevronLeft size={20} />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next image" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-[#0B1426]/80 text-white backdrop-blur transition-colors hover:bg-[#0B1426]">
                  <ChevronRight size={20} />
                </button>
                <span className="absolute bottom-3 right-3 rounded-full bg-[#0B1426]/80 px-2.5 py-1 text-xs tabular-nums text-white backdrop-blur">{current + 1} / {count}</span>
              </>
            )}
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {tab === "videos"
            ? media.videos.map((video, i) => (
                <button key={video.id} type="button" onClick={() => setIndex(i)} aria-pressed={i === current} className="pk-tag shrink-0" data-tone={i === current ? "gold" : undefined}>
                  {video.name ?? `Video ${i + 1}`}
                </button>
              ))
            : media[tab].map((src, i) => (
                <button key={src} type="button" onClick={() => setIndex(i)} aria-label={`Show image ${i + 1}`} aria-pressed={i === current}
                  className={`relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${i === current ? "border-[#FFC400]" : "border-transparent opacity-70 hover:opacity-100"}`}>
                  <Image src={src.replace("/t_1080p/", "/t_screenshot_med/")} alt="" fill className="object-cover" sizes="112px" />
                </button>
              ))}
        </div>
      )}
    </section>
  );
}
