import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/repository", () => ({
  listAccountNames: vi.fn(),
  getAccount: vi.fn(),
  listItems: vi.fn(),
}));

import { listGallery } from "@/server/engine/gallery";
import * as repo from "@/server/db/repository";
import type { Item } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
function item(postId: string, over: Partial<Item> = {}): Item {
  return {
    postId,
    mediaType: "video",
    origin: "reel",
    relPath: `downloads/x/${postId}.mp4`,
    fileSize: 100,
    durationS: 10,
    width: null,
    height: null,
    caption: null,
    postedAt: null,
    thumbPath: null,
    status: "downloaded",
    retries: 0,
    downloadedAt: "2026-01-01T00:00:00Z",
    readAt: null,
    notePath: null,
    error: null,
    downloadMs: null,
    ...over,
  };
}

/** Two accounts, `a` (instagram) and `b` (tiktok), each with the given items. */
function seed(
  byAccount: Record<string, Item[]>,
  networks: Record<string, string>,
  categories: Record<string, string> = {},
) {
  vi.mocked(repo.listAccountNames).mockReturnValue(Object.keys(byAccount));
  vi.mocked(repo.getAccount).mockImplementation(
    (n: string) => ({ network: networks[n], category: categories[n] ?? null }) as any,
  );
  vi.mocked(repo.listItems).mockImplementation((n: string) => byAccount[n] ?? []);
}

describe("listGallery", () => {
  beforeEach(() => vi.resetAllMocks());

  it("merges items across accounts, tagged with account + network", () => {
    seed({ a: [item("2")], b: [item("1")] }, { a: "instagram", b: "tiktok" });
    const { items, total } = listGallery({ sort: "date", order: "asc" });
    expect(total).toBe(2);
    // same downloadedAt → tie-broken by numeric postId asc
    expect(items.map((i) => [i.account, i.network, i.postId])).toEqual([
      ["b", "tiktok", "1"],
      ["a", "instagram", "2"],
    ]);
  });

  it("filters by network", () => {
    seed({ a: [item("1")], b: [item("2")] }, { a: "instagram", b: "tiktok" });
    const { items, total } = listGallery({ network: "instagram" });
    expect(total).toBe(1);
    expect(items[0].account).toBe("a");
  });

  it("filters by category and tags each item with it", () => {
    seed(
      { a: [item("1")], b: [item("2")] },
      { a: "instagram", b: "instagram" },
      { a: "Travel", b: "Tech" },
    );
    const { items, total } = listGallery({ category: "Travel" });
    expect(total).toBe(1);
    expect(items[0].account).toBe("a");
    expect(items[0].category).toBe("Travel");
  });

  it("restricts to a single profile", () => {
    seed({ a: [item("1")], b: [item("2")] }, { a: "instagram", b: "instagram" });
    listGallery({ profile: "b" });
    expect(repo.listItems).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repo.listItems).mock.calls[0][0]).toBe("b");
  });

  it("sorts by size, both directions", () => {
    seed(
      { a: [item("1", { fileSize: 50 }), item("2", { fileSize: 300 }), item("3", { fileSize: 100 })] },
      { a: "instagram" },
    );
    expect(listGallery({ sort: "size", order: "desc" }).items.map((i) => i.fileSize)).toEqual([300, 100, 50]);
    expect(listGallery({ sort: "size", order: "asc" }).items.map((i) => i.fileSize)).toEqual([50, 100, 300]);
  });

  it("sorts by date added (downloadedAt) newest first by default", () => {
    seed(
      {
        a: [
          item("1", { downloadedAt: "2026-01-01T00:00:00Z" }),
          item("2", { downloadedAt: "2026-03-01T00:00:00Z" }),
          item("3", { downloadedAt: "2026-02-01T00:00:00Z" }),
        ],
      },
      { a: "instagram" },
    );
    expect(listGallery({ sort: "date", order: "desc" }).items.map((i) => i.postId)).toEqual(["2", "3", "1"]);
  });

  it("drops items with no file on disk (relPath null)", () => {
    seed({ a: [item("1"), item("2", { relPath: null })] }, { a: "instagram" });
    const { items, total } = listGallery({});
    expect(total).toBe(1);
    expect(items.map((i) => i.postId)).toEqual(["1"]);
  });

  it("paginates with offset/limit and reports the full filtered total", () => {
    seed(
      { a: Array.from({ length: 5 }, (_, i) => item(String(i), { fileSize: i })) },
      { a: "instagram" },
    );
    const { items, total } = listGallery({ sort: "size", order: "asc", offset: 2, limit: 2 });
    expect(total).toBe(5);
    expect(items.map((i) => i.fileSize)).toEqual([2, 3]);
  });

  it("clamps limit to [1, 200] and floors a negative offset", () => {
    seed({ a: Array.from({ length: 300 }, (_, i) => item(String(i))) }, { a: "instagram" });
    expect(listGallery({ limit: 0 }).items).toHaveLength(1);
    expect(listGallery({ limit: 1000 }).items).toHaveLength(200);
    expect(listGallery({ limit: 5, offset: -10 }).items).toHaveLength(5);
  });
});
