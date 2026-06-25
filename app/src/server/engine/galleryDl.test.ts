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
  it("monta o comando do gallery-dl", () => {
    const a = buildArgs(base);
    expect(a).toContain("gallery_dl");
    expect(a).toContain("--cookies");
    expect(a).toContain("C:/c.txt");
    expect(a.join(" ")).toContain("include=reels");
    expect(a.join(" ")).toContain("extension in"); // video filter
    expect(a[a.length - 1]).toBe("https://www.instagram.com/foo/");
  });

  it("modo incremental adiciona skip=abort", () => {
    expect(buildArgs({ ...base, incremental: true }).join(" ")).toContain("skip=abort:1");
  });

  it("ambas as mídias → sem --filter", () => {
    const a = buildArgs({ ...base, mediaTypes: ["image", "video"] });
    expect(a.join(" ")).not.toContain("--filter");
  });
});

describe("parseMediaLine", () => {
  it("detecta arquivo baixado da aba", () => {
    const r = parseMediaLine("C:\\dl\\foo\\reels\\123.mp4", "reels");
    expect(r?.postId).toBe("123");
    expect(r?.skipped).toBe(false);
    expect(r?.mediaType).toBe("video");
  });

  it("detecta skip com prefixo '# '", () => {
    expect(parseMediaLine("# C:\\dl\\foo\\reels\\123.mp4", "reels")?.skipped).toBe(true);
  });

  it("também casa caminho posix", () => {
    expect(parseMediaLine("/dl/foo/reels/9.mp4", "reels")?.postId).toBe("9");
  });

  it("ignora fragmento .f… do yt-dlp", () => {
    expect(parseMediaLine("C:\\dl\\foo\\reels\\123.fdash-9v.mp4", "reels")).toBeNull();
  });

  it("ignora linhas que não são mídia ou são de outra aba", () => {
    expect(parseMediaLine("baixando algo...", "reels")).toBeNull();
    expect(parseMediaLine("C:\\dl\\foo\\stories\\1.mp4", "reels")).toBeNull();
  });
});
