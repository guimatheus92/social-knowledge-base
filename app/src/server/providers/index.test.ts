import { describe, expect, it } from "vitest";
import { getProvider, listProviders, providerForUrl } from "./index";

describe("providers (multi-network)", () => {
  it("routes a standalone URL to the owning provider", () => {
    expect(providerForUrl("https://www.instagram.com/reel/ABC123/")?.id).toBe("instagram");
    expect(providerForUrl("https://www.tiktok.com/@user/video/123")?.id).toBe("tiktok");
    expect(providerForUrl("https://example.com/x")).toBeNull();
  });

  it("getProvider: default = instagram, unknown falls back to default", () => {
    expect(getProvider().id).toBe("instagram");
    expect(getProvider("tiktok").id).toBe("tiktok");
    expect(getProvider("unknown").id).toBe("instagram");
    expect(getProvider(null).id).toBe("instagram");
  });

  it("profileUrl, kindArgs and kindFromUrl vary per network", () => {
    const ig = getProvider("instagram");
    expect(ig.profileUrl("milhasaovivo")).toBe("https://www.instagram.com/milhasaovivo/");
    expect(ig.kindArgs("reels")).toEqual(["-o", "include=reels"]);
    expect(ig.kindFromUrl("https://www.instagram.com/reel/ABC/")).toBe("reels");
    expect(ig.kindFromUrl("https://www.instagram.com/p/ABC/")).toBe("posts");

    const tk = getProvider("tiktok");
    expect(tk.profileUrl("@user")).toBe("https://www.tiktok.com/@user");
    expect(tk.kindArgs("videos")).toEqual([]); // no "tabs"
    expect(tk.kindFromUrl("https://www.tiktok.com/@user/video/1")).toBe("videos");
  });

  it("exposes the list of supported networks", () => {
    const ids = listProviders().map((p) => p.id);
    expect(ids).toContain("instagram");
    expect(ids).toContain("tiktok");
  });
});
