import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  rmSync: vi.fn(),
  existsSync: vi.fn(() => true),
  statSync: vi.fn(() => ({ size: 100 })),
}));
vi.mock("@/server/paths", () => ({
  ROOT: "/root",
  MANIFESTS: "/root/manifests",
  assertSafeSegment: (s: string) => s,
}));
vi.mock("@/server/db/repository", () => ({
  getAccount: vi.fn(),
  getItem: vi.fn(),
  getCounts: vi.fn(),
  deleteItemRows: vi.fn(),
}));
vi.mock("@/server/db/sqlite", () => ({ closeDb: vi.fn() }));
vi.mock("@/server/engine/thumbnails", () => ({
  thumbPathFor: (dir: string, id: string) => `${dir}/.thumbs/${id}.jpg`,
}));
vi.mock("@/server/engine/jobManager", () => ({ jobManager: { stop: vi.fn() } }));

import { rmSync, existsSync, statSync } from "node:fs";
import * as repo from "@/server/db/repository";
import { closeDb } from "@/server/db/sqlite";
import { jobManager } from "@/server/engine/jobManager";
import { deleteAccount, deleteMediaItems } from "@/server/engine/deletion";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Normalize Windows `\` so assertions match regardless of the test host OS. */
const removed = () => vi.mocked(rmSync).mock.calls.map((c) => String(c[0]).replace(/\\/g, "/"));

describe("deleteMediaItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(statSync).mockReturnValue({ size: 100 } as any);
    vi.mocked(repo.getAccount).mockReturnValue({ savePath: "/data/downloads/acc" } as any);
  });

  it("removes the video, sidecars, thumb and note, drops the row, reports freed bytes", () => {
    vi.mocked(repo.getItem).mockReturnValue({ relPath: "downloads/acc/reels/1.mp4" } as any);
    const r = deleteMediaItems("acc", ["1"]);
    expect(r).toEqual({ deleted: 1, freedBytes: 100 });
    expect(repo.deleteItemRows).toHaveBeenCalledWith("acc", ["1"]);
    const paths = removed();
    expect(paths).toContain("/root/downloads/acc/reels/1.mp4"); // video = ROOT + relPath
    expect(paths.some((p) => p.endsWith("/1.vtt"))).toBe(true);
    expect(paths.some((p) => p.includes("transcripts/1.txt"))).toBe(true);
    expect(paths.some((p) => p.includes(".thumbs/1.jpg"))).toBe(true);
    expect(paths.some((p) => p.includes("notes/acc/videos/1.md"))).toBe(true);
  });

  it("skips ids not in the manifest but still issues the row delete", () => {
    vi.mocked(repo.getItem).mockReturnValue(null);
    const r = deleteMediaItems("acc", ["x"]);
    expect(r.deleted).toBe(0);
    expect(repo.deleteItemRows).toHaveBeenCalledWith("acc", ["x"]);
  });

  it("accumulates over a batch, ignoring ids not in the manifest", () => {
    vi.mocked(repo.getItem).mockImplementation((_a: string, id: string) =>
      id === "3" ? null : ({ relPath: `downloads/acc/reels/${id}.mp4` } as any),
    );
    const r = deleteMediaItems("acc", ["1", "2", "3"]);
    expect(r).toEqual({ deleted: 2, freedBytes: 200 }); // 1 + 2 found (100 each); 3 missing
    expect(repo.deleteItemRows).toHaveBeenCalledWith("acc", ["1", "2", "3"]);
  });

  it("does NOT count a locked primary file as freed, but still drops the row", () => {
    vi.mocked(repo.getItem).mockReturnValue({ relPath: "downloads/acc/reels/1.mp4" } as any);
    vi.mocked(rmSync).mockImplementationOnce(() => {
      throw new Error("EBUSY"); // the primary video is locked (Windows)
    });
    const r = deleteMediaItems("acc", ["1"]);
    expect(r.freedBytes).toBe(0); // not counted as freed
    expect(r.deleted).toBe(1); // row still dropped
    expect(repo.deleteItemRows).toHaveBeenCalledWith("acc", ["1"]);
  });
});

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repo.getAccount).mockReturnValue({ savePath: "/data/downloads/acc" } as any);
    vi.mocked(repo.getCounts).mockReturnValue({ bytesTotal: 5000 } as any);
    vi.mocked(existsSync).mockReturnValue(true);
  });

  it("stops the job, drops the manifest, KEEPS the files by default", () => {
    const r = deleteAccount("acc");
    expect(jobManager.stop).toHaveBeenCalledWith("acc");
    expect(closeDb).toHaveBeenCalledWith("acc");
    expect(r.freedBytes).toBe(0);
    const paths = removed();
    expect(paths.some((p) => p.endsWith("manifests/acc.db"))).toBe(true);
    expect(paths).not.toContain("/data/downloads/acc"); // savePath untouched
  });

  it("also deletes the files recursively + reports freed bytes when asked", () => {
    const r = deleteAccount("acc", { deleteFiles: true });
    expect(r.freedBytes).toBe(5000);
    const recursiveDir = vi
      .mocked(rmSync)
      .mock.calls.find((c) => String(c[0]).replace(/\\/g, "/") === "/data/downloads/acc");
    expect(recursiveDir).toBeTruthy();
    expect((recursiveDir?.[1] as any)?.recursive).toBe(true);
  });
});
