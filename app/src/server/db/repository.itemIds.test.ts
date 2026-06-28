import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture the SQL prepared + params bound by listItemIds. vi.hoisted so `calls`
// exists when the (hoisted) vi.mock factory runs; the closure uses sql/params,
// so there are no unused bindings and no fixed-length-tuple typing.
const { calls } = vi.hoisted(() => ({
  calls: [] as { sql: string; params: unknown[] }[],
}));

vi.mock("@/server/db/sqlite", () => ({
  openDb: () => ({
    prepare: (sql: string) => ({
      all: (...params: unknown[]) => {
        calls.push({ sql, params });
        return [{ post_id: "10" }, { post_id: "20" }];
      },
    }),
  }),
  isDeleting: () => false,
}));

import { listItemIds } from "@/server/db/repository";

describe("listItemIds", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("no filters → no WHERE clause, maps rows to post_ids", () => {
    const ids = listItemIds("acc");
    expect(ids).toEqual(["10", "20"]);
    expect(calls[0].sql).toContain("SELECT post_id FROM item");
    expect(calls[0].sql).not.toContain("WHERE");
    expect(calls[0].params).toEqual([]);
  });

  it("status filter binds status = ?", () => {
    listItemIds("acc", { status: "read" });
    expect(calls[0].sql).toContain("WHERE status = ?");
    expect(calls[0].params).toEqual(["read"]);
  });

  it("media + origin filters AND-join in clause order", () => {
    listItemIds("acc", { media: "video", origin: "reel" });
    expect(calls[0].sql).toContain("WHERE media_type = ? AND origin = ?");
    expect(calls[0].params).toEqual(["video", "reel"]);
  });

  it("q filter binds caption/post_id LIKE with %q% twice", () => {
    listItemIds("acc", { q: "doha" });
    expect(calls[0].sql).toContain("caption LIKE ? OR post_id LIKE ?");
    expect(calls[0].params).toEqual(["%doha%", "%doha%"]);
  });

  it("combined filters: clauses AND-joined, params in clause order", () => {
    listItemIds("acc", { status: "downloaded", media: "video", origin: "reel", q: "x" });
    expect(calls[0].sql).toContain(
      "WHERE status = ? AND media_type = ? AND origin = ? AND (caption LIKE ? OR post_id LIKE ?)",
    );
    expect(calls[0].params).toEqual(["downloaded", "video", "reel", "%x%", "%x%"]);
  });
});
