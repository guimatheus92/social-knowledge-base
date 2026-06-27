import { describe, expect, it } from "vitest";
import { mediaFilterArgs, mediaTypeForFile } from "@/server/engine/mediaType";

describe("mediaTypeForFile", () => {
  it("classifies video and image by extension", () => {
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
  it("both media types → no filter", () => {
    expect(mediaFilterArgs(["image", "video"])).toEqual([]);
  });
  it("video only → filters video extensions", () => {
    const a = mediaFilterArgs(["video"]);
    expect(a[0]).toBe("--filter");
    expect(a[1]).toContain("mp4");
    expect(a[1]).not.toContain("jpg");
  });
  it("image only → filters image extensions", () => {
    const a = mediaFilterArgs(["image"]);
    expect(a[1]).toContain("jpg");
    expect(a[1]).not.toContain("mp4");
  });
});
