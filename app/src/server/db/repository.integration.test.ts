import { describe, it, expect, vi, afterAll } from "vitest";

// Point the repository at a throwaway repo root BEFORE it is imported, so this
// exercises the REAL node:sqlite path (no mocks) against a temp manifest.
// vi.hoisted runs before imports; build the path from globals only (no fs/require).
const ROOT = vi.hoisted(() => {
  const base = (process.env.TEMP || process.env.TMP || process.env.TMPDIR || "/tmp").replace(/\\/g, "/");
  const dir = `${base}/skb-itest-${process.pid}`;
  process.env.SKB_ROOT = dir; // findRepoRoot() honors this; openDb mkdirs manifests/ under it
  return dir;
});

import {
  upsertAccount,
  upsertItem,
  markRead,
  getCounts,
  getItem,
  listItemIds,
} from "@/server/db/repository";
import { deleteMediaItems } from "@/server/engine/deletion";
import { closeAll } from "@/server/db/sqlite";

const ACC = "itest";

afterAll(() => closeAll()); // release the sqlite handle (Windows would lock the .db)

describe("repository + deletion (real sqlite, no mocks)", () => {
  it("counts reflect the real items — bytes are summed and notes counted", () => {
    upsertAccount({ account: ACC, savePath: `${ROOT}/downloads/${ACC}` });
    upsertItem(ACC, {
      postId: "100",
      mediaType: "video",
      origin: "reel",
      relPath: `downloads/${ACC}/reels/100.mp4`,
      fileSize: 31_654_564,
      status: "downloaded",
    });
    upsertItem(ACC, {
      postId: "200",
      mediaType: "video",
      origin: "reel",
      relPath: `downloads/${ACC}/reels/200.mp4`,
      fileSize: 1_000,
      status: "downloaded",
    });
    markRead(ACC, "200", "2026-06-28T00:00:00Z", `notes/${ACC}/videos/200.md`);

    const c = getCounts(ACC);
    expect(c.total).toBe(2);
    expect(c.byMedia.video).toBe(2);
    expect(c.bytesTotal).toBe(31_654_564 + 1_000); // the "0 B" guard: bytes really get summed
    expect(c.notedVideos).toBe(1); // 200 is read
    expect(c.unnotedVideos).toBe(1); // 100 still downloaded
  });

  it("free-space keeps a noted item readable (note-only row) and drops an un-noted one", () => {
    const r = deleteMediaItems(ACC, ["100", "200"], { keepNotes: true });
    expect(r.deleted).toBe(2);

    // noted 200: row kept, media nulled, note path intact → still readable in the library
    const kept = getItem(ACC, "200");
    expect(kept).not.toBeNull();
    expect(kept!.relPath).toBeNull();
    expect(kept!.notePath).toBe(`notes/${ACC}/videos/200.md`);

    // un-noted 100: nothing to keep → row gone
    expect(getItem(ACC, "100")).toBeNull();

    // only the freed-but-noted item remains listed (its note stays reachable)
    expect(listItemIds(ACC)).toEqual(["200"]);
  });
});
