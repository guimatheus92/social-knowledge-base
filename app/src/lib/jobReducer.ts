/** Applies a progress event to a client-side snapshot (mirrors the server). */
import type { JobEvent, JobSnapshot } from "@/lib/types";

export function applyJobEvent(snap: JobSnapshot | null, e: JobEvent): JobSnapshot | null {
  if (e.t === "job_start") {
    return {
      account: e.account,
      status: "running",
      mode: e.mode,
      tabs: e.tabs,
      media: e.media,
      parallelism: e.parallelism,
      startedAt: Date.now(),
      elapsedSeconds: snap?.elapsedSeconds ?? 0,
      downloaded: 0,
      skipped: 0,
      errors: 0,
      discovered: 0,
      bytesTotal: 0,
      rateLimited: false,
      cookiesExpired: false,
      recentLog: [],
    };
  }
  if (!snap) return snap;
  const s: JobSnapshot = { ...snap };
  switch (e.t) {
    case "file_done":
      s.discovered += 1;
      if (e.skipped) s.skipped += 1;
      else {
        s.downloaded += 1;
        s.bytesTotal += e.bytes;
      }
      break;
    case "file_error":
      s.errors += 1;
      break;
    case "rate_limited":
      s.rateLimited = true;
      break;
    case "cookies_expired":
      s.cookiesExpired = true;
      break;
    case "log":
      s.recentLog = [...s.recentLog.slice(-199), e.msg];
      break;
    case "job_done":
      s.status = e.status;
      s.elapsedSeconds = e.elapsedSeconds;
      s.startedAt = null;
      s.downloaded = e.downloaded;
      s.skipped = e.skipped;
      s.errors = e.errors;
      break;
  }
  return s;
}
