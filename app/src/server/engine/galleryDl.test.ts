import { describe, expect, it } from "vitest";
import { buildArgs, parseMediaLine } from "@/server/engine/galleryDl";

const base = {
  account: "foo",
  saveDir: "C:/dl/foo",
  cookiesPath: "C:/c.txt",
  tab: "reels" as const,
  mediaTypes: ["video" as const],
  signal: new AbortController().signal,
  emit: () => {},
};

describe("buildArgs", () => {
  it("builds the gallery-dl command", () => {
    const a = buildArgs(base);
    expect(a).toContain("gallery_dl");
    expect(a).toContain("--cookies");
    expect(a).toContain("C:/c.txt");
    expect(a.join(" ")).toContain("include=reels");
    expect(a.join(" ")).toContain("extension in"); // video filter
    expect(a[a.length - 1]).toBe("https://www.instagram.com/foo/");
  });

  it("incremental mode adds skip=abort", () => {
    expect(buildArgs({ ...base, incremental: true }).join(" ")).toContain("skip=abort:1");
  });

  it("both media types → no --filter", () => {
    const a = buildArgs({ ...base, mediaTypes: ["image", "video"] });
    expect(a.join(" ")).not.toContain("--filter");
  });
});

describe("parseMediaLine", () => {
  it("detects a downloaded file from the tab", () => {
    const r = parseMediaLine("C:\\dl\\foo\\reels\\123.mp4", "reels");
    expect(r?.postId).toBe("123");
    expect(r?.skipped).toBe(false);
    expect(r?.mediaType).toBe("video");
  });

  it("detects skip with '# ' prefix", () => {
    expect(parseMediaLine("# C:\\dl\\foo\\reels\\123.mp4", "reels")?.skipped).toBe(true);
  });

  it("also matches a posix path", () => {
    expect(parseMediaLine("/dl/foo/reels/9.mp4", "reels")?.postId).toBe("9");
  });

  it("ignores yt-dlp .f… fragment", () => {
    expect(parseMediaLine("C:\\dl\\foo\\reels\\123.fdash-9v.mp4", "reels")).toBeNull();
  });

  it("ignores lines that aren't media or are from another tab", () => {
    expect(parseMediaLine("downloading something...", "reels")).toBeNull();
    expect(parseMediaLine("C:\\dl\\foo\\stories\\1.mp4", "reels")).toBeNull();
  });
});
