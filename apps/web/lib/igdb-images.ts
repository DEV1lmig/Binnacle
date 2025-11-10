/**
 * IGDB Image URL utilities
 * Convert IGDB image URLs to different sizes
 */

export type IGDBImageSize = 
  | 'thumb'           // 90x128 - Thumbnail
  | 'cover_small'     // 90x128 - Small cover
  | 'cover_big'       // 264x374 - Big cover
  | 'logo_med'        // 284x160 - Medium logo
  | 'screenshot_med'  // 569x320 - Medium screenshot
  | 'screenshot_big'  // 889x500 - Big screenshot
  | 'screenshot_huge' // 1280x720 - Huge screenshot (recommended for screenshots)
  | '720p'            // 1280x720 - 720p (fit, for covers)
  | '1080p';          // 1920x1080 - 1080p (fit, for covers)

/**
 * Convert an IGDB image URL to a different size
 * @param url - Original IGDB image URL
 * @param size - Desired image size
 * @returns Updated URL with new size, or original URL if not an IGDB URL
 */
export function getIgdbImageUrl(url: string | null | undefined, size: IGDBImageSize): string | undefined {
  if (!url || typeof url !== 'string') {
    return url ?? undefined;
  }

  // Check if it's an IGDB URL
  if (!url.includes('images.igdb.com')) {
    return url;
  }

  // Extract the image ID and extension
  // URL format: https://images.igdb.com/igdb/image/upload/t_XXXX/image_id.jpg
  // Replace the size token (t_XXXX) with the new size
  const sizeToken = `t_${size}`;
  const newUrl = url.replace(/\/t_[^/]+\//, `/${sizeToken}/`);
  
  return newUrl;
}

/**
 * Get high resolution version of an IGDB cover image
 * Uses 720p for better quality on detail pages
 */
export function getHighResCoverUrl(url: string | null | undefined): string | undefined {
  return getIgdbImageUrl(url, '720p');
}

/**
 * Get high resolution version of an IGDB screenshot
 * Uses 1080p (1920x1080) for maximum quality
 */
export function getHighResScreenshotUrl(url: string | null | undefined): string | undefined {
  return getIgdbImageUrl(url, '1080p');
}

/**
 * Get standard resolution for list/grid views
 * Uses cover_big which is the default
 */
export function getStandardCoverUrl(url: string | null | undefined): string | undefined {
  return getIgdbImageUrl(url, 'cover_big');
}
