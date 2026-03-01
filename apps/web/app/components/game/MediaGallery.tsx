"use client";

import { useState } from "react";
import Image from "next/image";
import { C, FONT_HEADING, FONT_MONO } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MediaGalleryProps {
  artworks?: string;
  screenshots?: string;
  videos?: string;
  title: string;
}

export function MediaGallery({
  artworks,
  screenshots,
  videos,
  title,
}: MediaGalleryProps) {
  const [activeTab, setActiveTab] = useState<"artworks" | "screenshots" | "videos">(
    "screenshots"
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [hoveredThumb, setHoveredThumb] = useState<number | null>(null);
  const [hoveredNav, setHoveredNav] = useState<"prev" | "next" | null>(null);

  let artworkList: string[] = [];
  let screenshotList: string[] = [];
  let videoList: string[] = [];

  try {
    if (artworks) {
      const parsed = JSON.parse(artworks);
      artworkList = Array.isArray(parsed) ? parsed : [];
    }
    if (screenshots) {
      const parsed = JSON.parse(screenshots);
      screenshotList = Array.isArray(parsed) ? parsed : [];
    }
    if (videos) {
      const parsed = JSON.parse(videos);
      videoList = Array.isArray(parsed)
        ? parsed.map((v: { video_id?: string } | string) => typeof v === "string" ? v : v.video_id).filter((id): id is string => Boolean(id))
        : [];
    }
  } catch (e) {
    console.warn("Failed to parse media data:", e);
  }

  const hasMedia =
    artworkList.length > 0 || screenshotList.length > 0 || videoList.length > 0;

  if (!hasMedia) return null;

  const currentImages =
    activeTab === "artworks"
      ? artworkList
      : activeTab === "screenshots"
        ? screenshotList
        : [];

  const currentImage = currentImages[selectedImageIndex];

  const tabStyle = (key: string, isActive: boolean) => ({
    background: "none" as const,
    border: "none" as const,
    cursor: "pointer" as const,
    padding: "8px 16px",
    fontFamily: FONT_MONO,
    fontSize: 11,
    fontWeight: 400 as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    transition: "color 0.15s",
    color: isActive ? C.text : hoveredTab === key ? C.text : C.textMuted,
    borderBottom: isActive ? `2px solid ${C.gold}` : "2px solid transparent",
    marginBottom: -1,
  });

  return (
    <section
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: 24,
      }}
    >
      <CornerMarkers size={8} />

      <h2 style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 20, color: C.text, margin: 0 }}>
        Media
      </h2>

      <div className="flex gap-2" style={{ borderBottom: `1px solid ${C.border}` }}>
        {artworkList.length > 0 && (
          <button
            onClick={() => { setActiveTab("artworks"); setSelectedImageIndex(0); }}
            onMouseEnter={() => setHoveredTab("artworks")}
            onMouseLeave={() => setHoveredTab(null)}
            style={tabStyle("artworks", activeTab === "artworks")}
          >
            Artworks ({artworkList.length})
          </button>
        )}
        {screenshotList.length > 0 && (
          <button
            onClick={() => { setActiveTab("screenshots"); setSelectedImageIndex(0); }}
            onMouseEnter={() => setHoveredTab("screenshots")}
            onMouseLeave={() => setHoveredTab(null)}
            style={tabStyle("screenshots", activeTab === "screenshots")}
          >
            Screenshots ({screenshotList.length})
          </button>
        )}
        {videoList.length > 0 && (
          <button
            onClick={() => setActiveTab("videos")}
            onMouseEnter={() => setHoveredTab("videos")}
            onMouseLeave={() => setHoveredTab(null)}
            style={tabStyle("videos", activeTab === "videos")}
          >
            Videos ({videoList.length})
          </button>
        )}
      </div>

      {activeTab === "videos" ? (
        <div className="flex flex-col gap-4">
          {videoList.map((videoId) => (
            <div
              key={videoId}
              className="relative w-full overflow-hidden"
              style={{ paddingBottom: "56.25%", background: C.bg, borderRadius: 2 }}
            >
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ))}
        </div>
      ) : currentImage ? (
        <>
          <div
            className="relative h-96 w-full overflow-hidden"
            style={{ background: C.bgAlt, borderRadius: 2 }}
          >
            <Image
              src={currentImage}
              alt={`${title} - ${activeTab}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
              priority
            />
          </div>

          {currentImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {currentImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  onMouseEnter={() => setHoveredThumb(idx)}
                  onMouseLeave={() => setHoveredThumb(null)}
                  className="relative h-20 w-20 flex-shrink-0 overflow-hidden"
                  style={{
                    background: "none",
                    padding: 0,
                    cursor: "pointer",
                    borderRadius: 1,
                    transition: "border-color 0.15s",
                    border: idx === selectedImageIndex
                      ? `2px solid ${C.gold}`
                      : hoveredThumb === idx
                        ? `2px solid ${C.textDim}`
                        : `2px solid ${C.border}`,
                  }}
                >
                  <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}

          {currentImages.length > 1 && (
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>
                {selectedImageIndex + 1} of {currentImages.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setSelectedImageIndex(
                      (idx) => (idx - 1 + currentImages.length) % currentImages.length
                    )
                  }
                  onMouseEnter={() => setHoveredNav("prev")}
                  onMouseLeave={() => setHoveredNav(null)}
                  className="flex items-center gap-1"
                  style={{
                    background: "none",
                    cursor: "pointer",
                    padding: "4px 12px",
                    borderRadius: 2,
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    fontWeight: 400,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    transition: "border-color 0.15s, color 0.15s",
                    border: hoveredNav === "prev" ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                    color: hoveredNav === "prev" ? C.text : C.textMuted,
                  }}
                >
                  <ChevronLeft className="w-3 h-3" />
                  Prev
                </button>
                <button
                  onClick={() =>
                    setSelectedImageIndex((idx) => (idx + 1) % currentImages.length)
                  }
                  onMouseEnter={() => setHoveredNav("next")}
                  onMouseLeave={() => setHoveredNav(null)}
                  className="flex items-center gap-1"
                  style={{
                    background: "none",
                    cursor: "pointer",
                    padding: "4px 12px",
                    borderRadius: 2,
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    fontWeight: 400,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    transition: "border-color 0.15s, color 0.15s",
                    border: hoveredNav === "next" ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                    color: hoveredNav === "next" ? C.text : C.textMuted,
                  }}
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
