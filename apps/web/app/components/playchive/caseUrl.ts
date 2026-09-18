/**
 * Same-origin URL for a cover, routed through Next's image optimiser: the copy the
 * DOM has already fetched, so the flying case never waits on a second download.
 */
export function textureUrl(src: string | null | undefined, width = 256) {
  if (!src) return undefined;
  if (src.startsWith("/")) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}
