export const runtime = "nodejs";

import * as React from "react";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "@binnacle/convex-generated/dataModel";
import { api } from "@binnacle/convex-generated/api";
import {
  parseShareOptions,
  getShareImageDimensions,
  getShareCardAccentColor,
  ratingToFiveStar,
  type ShareCardOptions,
} from "@binnacle/shared-types";
import { colors } from "@binnacle/design-tokens";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Font names must match the family names passed to ImageResponse fonts.
const FONT_HEADING_NAME = "Outfit";
const FONT_BODY_NAME = "DM Sans";
const FONT_MONO_NAME = "JetBrains Mono";

type FontOption = {
  name: string;
  data: ArrayBuffer | Buffer;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: "normal" | "italic";
  lang?: string;
};

type FontDef = {
  name: string;
  weight: number;
  family: string;
};

const FONT_DEFS: FontDef[] = [
  { name: FONT_HEADING_NAME, weight: 600, family: "Outfit" },
  { name: FONT_BODY_NAME, weight: 400, family: "DM Sans" },
  { name: FONT_BODY_NAME, weight: 500, family: "DM Sans" },
  { name: FONT_MONO_NAME, weight: 400, family: "JetBrains Mono" },
];

async function loadFontData(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family
    )}:wght@${weight}&display=swap`;
    const cssRes = await fetch(cssUrl, { cache: "force-cache" });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();

    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?(\w+)['"]?\)/);
    if (!match) return null;

    const url = match[1].replace(/['"]/g, "");
    const fontRes = await fetch(url, { cache: "force-cache" });
    if (!fontRes.ok) return null;
    return fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

async function loadFonts(): Promise<FontOption[]> {
  const loaded = await Promise.all(
    FONT_DEFS.map(async (def) => {
      const data = await loadFontData(def.family, def.weight);
      if (!data) return null;
      return {
        name: def.name,
        data,
        weight: def.weight as FontOption["weight"],
        style: "normal" as const,
      };
    })
  );
  return loaded.filter(Boolean) as FontOption[];
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function clampText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + "…";
}

function getIgdbHighResCover(url: string | undefined) {
  if (!url) return undefined;
  if (!url.includes("images.igdb.com")) return url;
  return url.replace(/\/t_[^/]+\//, "/t_720p/");
}

function StarIcon({ fill, size }: { fill: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      style={{ flexShrink: 0 }}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function renderStars(fiveStar: number, accent: string, starSize: number) {
  const full = Math.floor(fiveStar);
  const half = fiveStar - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  const stars: React.ReactNode[] = [];
  for (let i = 0; i < full; i++) {
    stars.push(<StarIcon key={`f${i}`} fill={accent} size={starSize} />);
  }
  if (half) {
    stars.push(
      <div
        key="h"
        style={{
          position: "relative",
          width: starSize,
          height: starSize,
        }}
      >
        <StarIcon fill={colors.borderLight} size={starSize} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: starSize / 2,
            height: starSize,
            overflow: "hidden",
          }}
        >
          <StarIcon fill={accent} size={starSize} />
        </div>
      </div>
    );
  }
  for (let i = 0; i < empty; i++) {
    stars.push(<StarIcon key={`e${i}`} fill={colors.borderLight} size={starSize} />);
  }
  return stars;
}

type ReviewData = {
  _id: string;
  _creationTime: number;
  rating: number;
  text?: string;
  platform?: string;
  playtimeHours?: number;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  game: {
    title: string;
    coverUrl?: string;
    releaseYear?: number;
  };
  likeCount: number;
  commentCount: number;
};

function HudBadge({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        paddingTop: 6,
        paddingRight: 12,
        paddingBottom: 6,
        paddingLeft: 12,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: `${accent}33`,
        borderRadius: 4,
        backgroundColor: `${accent}10`,
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO_NAME,
          fontSize: 11,
          fontWeight: 500,
          color: accent,
          textTransform: "uppercase",
        }}
      >
        {children}
      </span>
    </div>
  );
}

function CornerMarkers({ size, color }: { size: number; color: string }) {
  const thickness = Math.max(2, Math.round(size * 0.08));
  const offset = Math.round(size * 0.45);
  const arm = Math.round(size * 0.55);

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: offset,
          top: offset,
          width: arm,
          height: thickness,
          backgroundColor: color,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: offset,
          top: offset,
          width: thickness,
          height: arm,
          backgroundColor: color,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: offset,
          top: offset,
          width: arm,
          height: thickness,
          backgroundColor: color,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: offset,
          bottom: offset,
          width: thickness,
          height: arm,
          backgroundColor: color,
        }}
      />
    </>
  );
}

function PlaceholderCard({
  width,
  height,
  message,
}: {
  width: number;
  height: number;
  message: string;
}) {
  const pad = Math.round(width * 0.08);
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.bg,
        color: colors.textMuted,
        fontFamily: FONT_BODY_NAME,
        paddingTop: pad,
        paddingRight: pad,
        paddingBottom: pad,
        paddingLeft: pad,
        borderWidth: Math.round(pad * 0.15),
        borderStyle: "solid",
        borderColor: colors.border,
      }}
    >
      <span
        style={{
          fontFamily: FONT_HEADING_NAME,
          fontSize: Math.round(width * 0.05),
          color: colors.text,
          marginBottom: pad * 0.5,
        }}
      >
        Binnacle
      </span>
      <span style={{ fontSize: Math.round(width * 0.03) }}>{message}</span>
    </div>
  );
}

function ReviewShareCard({
  review,
  opts,
  width,
  height,
}: {
  review: ReviewData;
  opts: ShareCardOptions;
  width: number;
  height: number;
}) {
  const accent = getShareCardAccentColor(opts.accent);
  const fiveStar = ratingToFiveStar(review.rating);
  const showPoster = opts.showPoster && review.game.coverUrl;
  const showText = opts.showText && review.text && review.text.trim().length > 0;

  const isWide = opts.format === "wide";
  const isStory = opts.format === "story";

  const pad = Math.round(width * 0.055);
  const gap = Math.round(width * 0.025);
  const fontBase = Math.round(width * 0.028);

  const coverUrl = getIgdbHighResCover(review.game.coverUrl);

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.bg,
        color: colors.text,
        fontFamily: FONT_BODY_NAME,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Bloom overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          background:
            "radial-gradient(circle at 80% 20%, rgba(96, 165, 250, 0.12), transparent 40%), radial-gradient(circle at 20% 80%, rgba(34, 211, 238, 0.06), transparent 35%)",
        }}
      />

      {/* Border frame */}
      <div
        style={{
          position: "absolute",
          top: Math.round(pad * 0.6),
          left: Math.round(pad * 0.6),
          width: width - Math.round(pad * 1.2),
          height: height - Math.round(pad * 1.2),
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: colors.border,
        }}
      />

      <CornerMarkers size={pad * 0.9} color={accent} />

      {/* Content */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          paddingTop: pad,
          paddingRight: pad,
          paddingBottom: pad,
          paddingLeft: pad,
          width,
          height,
          gap,
        }}
      >
        {/* Top HUD badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <HudBadge accent={accent}>REVIEW</HudBadge>
          <span
            style={{
              fontFamily: FONT_MONO_NAME,
              fontSize: Math.round(fontBase * 0.85),
              color: colors.textMuted,
              textTransform: "uppercase",
            }}
          >
            Binnacle
          </span>
        </div>

        {/* Main body */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: isWide ? "row" : "column",
            gap: isWide ? pad : Math.round(gap * 1.5),
            minHeight: 0,
          }}
        >
          {/* Poster */}
          {showPoster ? (
            <div
              style={{
                display: "flex",
                flexShrink: 0,
                width: isWide ? Math.round(height * 0.35) : width - pad * 2,
                height: isWide ? height : isStory ? Math.round(width * 0.72) : Math.round(width * 0.55),
                borderRadius: 8,
                overflow: "hidden",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: colors.border,
              }}
            >
              <img
                src={coverUrl}
                alt={review.game.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          ) : null}

          {/* Text content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              gap: Math.round(gap * 0.9),
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: Math.round(gap * 0.3) }}>
              <h1
                style={{
                  fontFamily: FONT_HEADING_NAME,
                  fontSize: isWide ? Math.round(fontBase * 2.2) : isStory ? Math.round(fontBase * 2.6) : Math.round(fontBase * 2.2),
                  fontWeight: 600,
                  lineHeight: 1.15,
                  color: colors.text,
                  margin: 0,
                }}
              >
                {review.game.title}
              </h1>
              {review.game.releaseYear ? (
                <span
                  style={{
                    fontFamily: FONT_MONO_NAME,
                    fontSize: fontBase,
                    color: colors.textMuted,
                  }}
                >
                  {review.game.releaseYear}
                </span>
              ) : null}
            </div>

            {/* Rating row */}
            <div style={{ display: "flex", alignItems: "center", gap: Math.round(gap * 0.7) }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                {renderStars(
                  fiveStar,
                  accent,
                  isStory ? Math.round(fontBase * 1.6) : Math.round(fontBase * 1.4)
                )}
              </span>
              <span
                style={{
                  fontFamily: FONT_MONO_NAME,
                  fontSize: Math.round(fontBase * 1.1),
                  color: colors.textMuted,
                }}
              >
                {review.rating.toFixed(1)}/10
              </span>
            </div>

            {showText ? (
              <p
                style={{
                  fontFamily: FONT_BODY_NAME,
                  fontSize: isStory ? Math.round(fontBase * 1.15) : fontBase,
                  lineHeight: 1.55,
                  color: colors.textMuted,
                  margin: 0,
                  maxHeight: isStory
                    ? Math.round(fontBase * 1.15 * 1.55 * 9)
                    : opts.format === "square"
                    ? Math.round(fontBase * 1.55 * 5)
                    : Math.round(fontBase * 1.55 * 4),
                  overflow: "hidden",
                }}
              >
                {clampText(review.text!, isStory ? 420 : 280)}
              </p>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: colors.border,
            paddingTop: gap,
            gap,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: Math.round(gap * 0.8) }}>
            {review.author.avatarUrl ? (
              <img
                src={review.author.avatarUrl}
                alt={review.author.name}
                style={{
                  width: Math.round(fontBase * 2.4),
                  height: Math.round(fontBase * 2.4),
                  borderRadius: Math.round(fontBase * 1.2),
                  borderWidth: 1.5,
                  borderStyle: "solid",
                  borderColor: accent,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: Math.round(fontBase * 2.4),
                  height: Math.round(fontBase * 2.4),
                  borderRadius: Math.round(fontBase * 1.2),
                  borderWidth: 1.5,
                  borderStyle: "solid",
                  borderColor: accent,
                  backgroundColor: colors.surface,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT_HEADING_NAME,
                  fontSize: fontBase,
                  color: colors.textMuted,
                }}
              >
                {review.author.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontFamily: FONT_HEADING_NAME,
                  fontSize: Math.round(fontBase * 1.05),
                  fontWeight: 500,
                  color: colors.text,
                }}
              >
                {review.author.name}
              </span>
              <span
                style={{
                  fontFamily: FONT_MONO_NAME,
                  fontSize: Math.round(fontBase * 0.85),
                  color: colors.textMuted,
                }}
              >
                @{review.author.username}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: FONT_MONO_NAME,
                fontSize: Math.round(fontBase * 0.8),
                color: colors.textDim,
                textTransform: "uppercase",
              }}
            >
              {formatDate(review._creationTime)}
            </span>
            <span
              style={{
                fontFamily: FONT_MONO_NAME,
                fontSize: Math.round(fontBase * 0.75),
                color: colors.textDim,
              }}
            >
              ♥ {review.likeCount} · {review.commentCount} comments
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const params = await context.params;
  const reviewId = params.id;

  const opts = parseShareOptions(request.nextUrl.searchParams);
  const { width, height } = getShareImageDimensions(opts.format);

  if (!convexUrl) {
    return new ImageResponse(
      <PlaceholderCard width={width} height={height} message="Service unavailable" />,
      { width, height }
    );
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const review = (await convex.query(api.reviews.get, {
      reviewId: reviewId as Id<"reviews">,
    })) as ReviewData | null;

    if (!review) {
      return new ImageResponse(
        <PlaceholderCard width={width} height={height} message="Review not found" />,
        { width, height }
      );
    }

    const fonts = await loadFonts();

    return new ImageResponse(
      <ReviewShareCard review={review} opts={opts} width={width} height={height} />,
      {
        width,
        height,
        fonts,
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("[og/review] failed to render share card:", error);
    return new ImageResponse(
      <PlaceholderCard width={width} height={height} message="Could not load review" />,
      { width, height }
    );
  }
}
