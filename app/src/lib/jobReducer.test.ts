import { describe, expect, it } from "vitest";
import { applyJobEvent } from "@/lib/jobReducer";
import type { JobSnapshot } from "@/lib/types";

const base: JobSnapshot = {
  account: "x",
  status: "running",
  mode: "full",
  tabs: ["reels"],
  media: ["video"],
  parallelism: 2,
  startedAt: 1,
  elapsedSeconds: 0,
  downloaded: 0,
  skipped: 0,
  errors: 0,
  discovered: 0,
  bytesTotal: 0,
  rateLimited: false,
  cookiesExpired: false,
  recentLog: [],
};

describe("applyJobEvent", () => {
  it("file_done baixado incrementa downloaded/discovered/bytes", () => {
    const s = applyJobEvent(base, {
      t: "file_done",
      tab: "reels",
      postId: "1",
      mediaType: "video",
      bytes: 100,
      elapsedMs: 10,
      skipped: false,
    })!;
    expect(s.downloaded).toBe(1);
    expect(s.discovered).toBe(1);
    expect(s.bytesTotal).toBe(100);
  });

  it("file_done skipped conta só skipped", () => {
    const s = applyJobEvent(base, {
      t: "file_done",
      tab: "reels",
      postId: "1",
      mediaType: "video",
      bytes: 0,
      elapsedMs: 0,
      skipped: true,
    })!;
    expect(s.skipped).toBe(1);
    expect(s.downloaded).toBe(0);
  });

  it("rate_limited e cookies_expired setam flags", () => {
    expect(applyJobEvent(base, { t: "rate_limited" })!.rateLimited).toBe(true);
    expect(applyJobEvent(base, { t: "cookies_expired" })!.cookiesExpired).toBe(true);
  });

  it("job_start cria um snapshot do zero", () => {
    const s = applyJobEvent(null, {
      t: "job_start",
      account: "y",
      tabs: ["reels"],
      media: ["video"],
      parallelism: 2,
      mode: "full",
    })!;
    expect(s.account).toBe("y");
    expect(s.status).toBe("running");
    expect(s.downloaded).toBe(0);
  });

  it("job_done aplica o status final", () => {
    const s = applyJobEvent(base, {
      t: "job_done",
      status: "completed",
      elapsedSeconds: 12,
      downloaded: 5,
      skipped: 1,
      errors: 0,
    })!;
    expect(s.status).toBe("completed");
    expect(s.downloaded).toBe(5);
    expect(s.startedAt).toBeNull();
  });
});
