/**
 * Shared types between the server (engine/DB) and the UI.
 * Mirror the SQLite columns (snake_case in the database → camelCase here).
 */

export type MediaType = "image" | "video";

export type Origin = "highlight" | "reel" | "story" | "post";

/** Profile tabs that gallery-dl knows how to download. */
export type Tab = "highlights" | "reels" | "stories" | "posts";

export const TAB_ORIGIN: Record<Tab, Origin> = {
  highlights: "highlight",
  reels: "reel",
  stories: "story",
  posts: "post",
};

export type ItemStatus =
  | "pending"
  | "downloading"
  | "downloaded"
  | "reading"
  | "read"
  | "error";

/** A target account (downloaded profile). One row per `manifests/<conta>.db` database. */
export interface Account {
  account: string;
  savePath: string;
  cookiesPath: string | null;
  mediaTypes: MediaType[];
  tabs: Tab[];
  parallelism: number;
  /** Source network provider id (instagram, tiktok, …). */
  network: string;
  elapsedSeconds: number;
  lastSyncedAt: string | null;
  /** Estimated total of items in the profile (via "Count" / gallery-dl --simulate). */
  estimatedTotal: number | null;
  createdAt: string;
  updatedAt: string;
}

/** A downloaded post (video or image). Key = post_id (= file stem). */
export interface Item {
  postId: string;
  mediaType: MediaType;
  origin: Origin;
  relPath: string | null;
  fileSize: number | null;
  durationS: number | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  postedAt: string | null;
  thumbPath: string | null;
  status: ItemStatus;
  retries: number;
  downloadedAt: string | null;
  readAt: string | null;
  notePath: string | null;
  error: string | null;
  downloadMs: number | null;
}

/** Derived counts (never denormalized in the database). */
export interface Counts {
  total: number;
  byMedia: Record<MediaType, number>;
  byStatus: Record<string, number>;
  byOrigin: Record<string, number>;
  bytesTotal: number;
  downloaded: number;
}

/* ---- Job types (shared server↔UI; no runtime) ---- */

export type JobStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "stopped"
  | "error";

export type JobMode = "full" | "incremental" | "count" | "single";

export type JobEvent =
  | { t: "job_start"; account: string; tabs: Tab[]; media: MediaType[]; parallelism: number; mode: JobMode }
  | { t: "tab_start"; tab: Tab }
  | { t: "file_done"; tab: Tab; postId: string; mediaType: MediaType; bytes: number; elapsedMs: number; skipped: boolean }
  | { t: "file_error"; tab: Tab; postId: string; error: string }
  | { t: "tab_done"; tab: Tab; downloaded: number; skipped: number; errors: number }
  | { t: "counts"; downloaded: number; discovered: number; bytesTotal: number }
  | { t: "rate_limited"; tab?: Tab }
  | { t: "cookies_expired"; tab?: Tab }
  | { t: "log"; level: "info" | "warn" | "error"; msg: string }
  | { t: "job_done"; status: JobStatus; elapsedSeconds: number; downloaded: number; skipped: number; errors: number };

/** State of a job at a given moment (returned by the API and via SSE). */
export interface JobSnapshot {
  account: string;
  status: JobStatus;
  mode: JobMode;
  tabs: Tab[];
  media: MediaType[];
  parallelism: number;
  startedAt: number | null;
  elapsedSeconds: number;
  downloaded: number;
  skipped: number;
  errors: number;
  discovered: number;
  bytesTotal: number;
  rateLimited: boolean;
  cookiesExpired: boolean;
  recentLog: string[];
}

/** Per-account summary returned by GET /api/accounts. */
export interface AccountSummary extends Account {
  counts: Counts;
  job: JobSnapshot | null;
}

/** SSE message: either an initial snapshot or a progress event. */
export type StreamMessage = { t: "snapshot"; snapshot: JobSnapshot | null } | JobEvent;

/** LLM reading config (Whisper + the MCP's analyze_video options). */
export interface AnalysisConfig {
  whisperModel: string;
  whisperLanguage: string;
  detail: "brief" | "standard" | "detailed";
  maxFrames: number;
  threshold: number;
  ocrLanguage: string;
}
