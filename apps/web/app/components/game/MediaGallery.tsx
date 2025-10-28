"use client";

import { useState } from "react";
import Image from "next/image";

interface MediaGalleryProps {
  artworks?: string;
  screenshots?: string;
  videos?: string;
  title: string;
}

/**
 * Media Gallery component for displaying game artworks, screenshots, and video links.
 * Artworks and screenshots are stored as JSON arrays of CDN URLs.
 * Videos are stored as JSON array of video IDs.
 */
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
      // Videos are stored as {id, video_id, name} objects, extract video_id
      videoList = Array.isArray(parsed) 
        ? parsed.map((v: any) => typeof v === "string" ? v : v.video_id).filter(Boolean)
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

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
      <h2 className="text-2xl font-semibold">Media</h2>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {artworkList.length > 0 && (
          <button
            onClick={() => {
              setActiveTab("artworks");
              setSelectedImageIndex(0);
            }}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "artworks"
                ? "border-b-2 border-blue-500 text-white"
                : "text-stone-400 hover:text-white"
            }`}
          >
            Artworks ({artworkList.length})
          </button>
        )}
        {screenshotList.length > 0 && (
          <button
            onClick={() => {
              setActiveTab("screenshots");
              setSelectedImageIndex(0);
            }}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "screenshots"
                ? "border-b-2 border-blue-500 text-white"
                : "text-stone-400 hover:text-white"
            }`}
          >
            Screenshots ({screenshotList.length})
          </button>
        )}
        {videoList.length > 0 && (
          <button
            onClick={() => setActiveTab("videos")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "videos"
                ? "border-b-2 border-blue-500 text-white"
                : "text-stone-400 hover:text-white"
            }`}
          >
            Videos ({videoList.length})
          </button>
        )}
      </div>

      {/* Image/Video Viewer */}
      {activeTab === "videos" ? (
        <div className="flex flex-col gap-4">
          {videoList.map((videoId) => (
            <div
              key={videoId}
              className="relative w-full overflow-hidden rounded-xl bg-black"
              style={{ paddingBottom: "56.25%" }}
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
          <div className="relative h-96 w-full overflow-hidden rounded-xl bg-stone-800">
            <Image
              src={currentImage}
              alt={`${title} - ${activeTab}`}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Thumbnail Navigation */}
          {currentImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {currentImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    idx === selectedImageIndex
                      ? "border-blue-500"
                      : "border-white/20 hover:border-white/40"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Image Counter */}
          {currentImages.length > 1 && (
            <div className="flex items-center justify-between text-sm text-stone-400">
              <span>
                {selectedImageIndex + 1} of {currentImages.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setSelectedImageIndex(
                      (idx) => (idx - 1 + currentImages.length) % currentImages.length
                    )
                  }
                  className="rounded-lg border border-white/20 px-3 py-1 transition hover:border-white/40 hover:text-white"
                >
                  ← Prev
                </button>
                <button
                  onClick={() =>
                    setSelectedImageIndex((idx) => (idx + 1) % currentImages.length)
                  }
                  className="rounded-lg border border-white/20 px-3 py-1 transition hover:border-white/40 hover:text-white"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
