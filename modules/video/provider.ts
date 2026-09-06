export type VideoProviderKind = "HTML5" | "YOUTUBE" | "BUNNY";

export type ResolvedVideoSource =
  | { provider: "YOUTUBE"; videoId: string; embedUrl: string }
  | { provider: "BUNNY"; libraryId: string; videoId: string; embedUrl: string }
  | { provider: "HTML5"; srcUrl: string }
  | null;

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const BUNNY_REGEX =
  /iframe\.mediadelivery\.net\/(?:embed|play)\/([0-9]+)\/([a-zA-Z0-9_-]+)/;

/**
 * Resolves a video URL to a normalized provider contract.
 * Supports HTML5 direct video (mp4, webm, HLS), YouTube, and Bunny Stream CDN.
 */
export function resolveVideoSource(rawUrl: string | null | undefined): ResolvedVideoSource {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!url) return null;

  // 1. YouTube
  const ytMatch = url.match(YOUTUBE_REGEX);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      provider: "YOUTUBE",
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    };
  }

  // 2. Bunny Stream
  const bunnyMatch = url.match(BUNNY_REGEX);
  if (bunnyMatch && bunnyMatch[1] && bunnyMatch[2]) {
    const libraryId = bunnyMatch[1];
    const videoId = bunnyMatch[2];
    return {
      provider: "BUNNY",
      libraryId,
      videoId,
      embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`,
    };
  }

  // 3. HTML5 Direct Video
  if (/^https?:\/\//i.test(url) || /^\/api\//i.test(url)) {
    return {
      provider: "HTML5",
      srcUrl: url,
    };
  }

  return null;
}
