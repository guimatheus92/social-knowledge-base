import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture what listItemIds prepares/binds. vi.hoisted so the spies exist when
// the (hoisted) vi.mock factory runs.
const { prepare, all } = vi.hoisted(() => {
  const all = vi.fn((..._args: unknown[]) => [{ post_id: "10" }, { post_id: "20" }]);
  const prepare = vi.fn((..._args: unknown[]) => ({ all }));
  return { prepare, all };
});

vi.mock("@/server/db/sqlite", () => ({
  openDb: () => ({ prepare }),
  isDeleting: () => false,
}));

import { listItemIds } from "@/server/db/repository";

/** The SQL passed to prepare() / the params passed to all() for the one call. */
const sql = () => String(prepare.mock.calls[0][0]);
const params = () => all.mock.calls[0];

describe("listItemIds", () => {
  beforeEach(() => {
    prepare.mockClear();
    all.mockClear();
  });

  it("no filters → no WHERE clause, maps rows to post_ids", () => {
    const ids = listItemIds("acc");
    expect(ids).toEqual(["10", "20"]);
    expect(sql()).toContain("SELECT post_id FROM item");
    expect(sql()).not.toContain("WHERE");
    expect(params()).toEqual([]);
  });

  it("status filter binds status = ?", () => {
    listItemIds("acc", { status: "read" });
    expect(sql()).toContain("WHERE status = ?");
    expect(params()).toEqual(["read"]);
  });

  it("media + origin filters AND-join in clause order", () => {
    listItemIds("acc", { media: "video", origin: "reel" });
    expect(sql()).toContain("WHERE media_type = ? AND origin = ?");
    expect(params()).toEqual(["video", "reel"]);
  });

  it("q filter binds caption/post_id LIKE with %q% twice", () => {
    listItemIds("acc", { q: "doha" });
    expect(sql()).toContain("caption LIKE ? OR post_id LIKE ?");
    expect(params()).toEqual(["%doha%", "%doha%"]);
  });

  it("combined filters: clauses AND-joined, params in clause order", () => {
    listItemIds("acc", { status: "downloaded", media: "video", origin: "reel", q: "x" });
    expect(sql()).toContain(
      "WHERE status = ? AND media_type = ? AND origin = ? AND (caption LIKE ? OR post_id LIKE ?)",
    );
    expect(params()).toEqual(["downloaded", "video", "reel", "%x%", "%x%"]);
  });
});
