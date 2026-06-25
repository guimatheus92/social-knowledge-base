import { describe, expect, it } from "vitest";
import { mediaFilterArgs, mediaTypeForFile } from "@/server/engine/mediaType";

describe("mediaTypeForFile", () => {
  it("classifica vídeo e imagem por extensão", () => {
    expect(mediaTypeForFile("a.mp4")).toBe("video");
    expect(mediaTypeForFile("A.MP4")).toBe("video");
    expect(mediaTypeForFile("x/y/a.webm")).toBe("video");
    expect(mediaTypeForFile("a.jpg")).toBe("image");
    expect(mediaTypeForFile("a.webp")).toBe("image");
    expect(mediaTypeForFile("a.txt")).toBeNull();
    expect(mediaTypeForFile("noext")).toBeNull();
  });
});

describe("mediaFilterArgs", () => {
  it("ambas as mídias → sem filtro", () => {
    expect(mediaFilterArgs(["image", "video"])).toEqual([]);
  });
  it("só vídeo → filtra extensões de vídeo", () => {
    const a = mediaFilterArgs(["video"]);
    expect(a[0]).toBe("--filter");
    expect(a[1]).toContain("mp4");
    expect(a[1]).not.toContain("jpg");
  });
  it("só imagem → filtra extensões de imagem", () => {
    const a = mediaFilterArgs(["image"]);
    expect(a[1]).toContain("jpg");
    expect(a[1]).not.toContain("mp4");
  });
});
