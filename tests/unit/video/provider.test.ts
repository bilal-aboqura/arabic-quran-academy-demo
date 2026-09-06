import { describe, expect, it } from "vitest";
import { resolveVideoSource } from "@/modules/video/provider";

describe("video provider abstraction", () => {
  it("resolves standard and short YouTube URLs", () => {
    const res1 = resolveVideoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(res1).toEqual({
      provider: "YOUTUBE",
      videoId: "dQw4w9WgXcQ",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });

    const res2 = resolveVideoSource("https://youtu.be/dQw4w9WgXcQ?t=10");
    expect(res2).toEqual({
      provider: "YOUTUBE",
      videoId: "dQw4w9WgXcQ",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });

    const res3 = resolveVideoSource("https://www.youtube.com/shorts/dQw4w9WgXcQ");
    expect(res3).toEqual({
      provider: "YOUTUBE",
      videoId: "dQw4w9WgXcQ",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
  });

  it("resolves Bunny Stream CDN embed URLs", () => {
    const res = resolveVideoSource("https://iframe.mediadelivery.net/embed/12345/abcdef-6789-ghijk");
    expect(res).toEqual({
      provider: "BUNNY",
      libraryId: "12345",
      videoId: "abcdef-6789-ghijk",
      embedUrl: "https://iframe.mediadelivery.net/embed/12345/abcdef-6789-ghijk",
    });
  });

  it("resolves HTML5 direct video URLs", () => {
    const res = resolveVideoSource("https://cdn.example.com/videos/lesson1.mp4");
    expect(res).toEqual({
      provider: "HTML5",
      srcUrl: "https://cdn.example.com/videos/lesson1.mp4",
    });
  });

  it("handles null, empty, and invalid inputs gracefully", () => {
    expect(resolveVideoSource(null)).toBeNull();
    expect(resolveVideoSource("")).toBeNull();
    expect(resolveVideoSource("   ")).toBeNull();
    expect(resolveVideoSource("not-a-url")).toBeNull();
  });
});
