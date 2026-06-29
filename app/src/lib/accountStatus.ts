import type { JobSnapshot, JobStatus } from "@/lib/types";

/**
 * The status shown on an account card. A live job wins — the SSE snapshot first,
 * then the in-memory job from the accounts query. With neither (e.g. right after
 * a server restart, when the in-memory job state is gone), fall back to persisted
 * data: an account that has synced at least once reads "completed" rather than
 * being downgraded to idle ("Parado"); a never-synced one is "idle".
 */
export function accountStatus(
  snapshot: JobSnapshot | null,
  summary: { job: JobSnapshot | null; lastSyncedAt: string | null },
): JobStatus | "idle" {
  return snapshot?.status ?? summary.job?.status ?? (summary.lastSyncedAt ? "completed" : "idle");
}
