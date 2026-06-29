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

/** A target account (downloaded profile). One row per `manifests/<account>.db` database. */
export interface Account {
  account: string;
  savePath: string;
  cookiesPath: string | null;
  mediaTypes: MediaType[];
  tabs: Tab[];
  parallelism: number;
  /** Source network provider id (instagram, tiktok, …). */
  network: string;
  /** Per-account override for the note language (null = follow the global default). */
  noteLanguage: string | null;
  /** User-chosen topic (Travel, Tech, Milhas…) for grouping/filtering. */
  category: string | null;
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
  /** Bytes on disk per media type (for the disk breakdown). */
  bytesByMedia: Record<MediaType, number>;
  byStatus: Record<string, number>;
  byOrigin: Record<string, number>;
  bytesTotal: number;
  downloaded: number;
  /** Downloaded videos that don't have a curated note yet (note candidates). */
  unnotedVideos: number;
  /** Videos that already have a curated note (status 'read'). */
  notedVideos: number;
  /** Note-only videos: noted but their media was freed (read + no file on disk). */
  notesOnly: number;
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

/** Generation metadata for a curated note (Claude Code token usage). */
export interface NoteMeta {
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  generatedAt: string;
}

/** Progress of a per-account note-generation batch (Claude Code). */
export interface NotesJobStatus {
  account: string;
  status: "idle" | "running" | "done" | "stopped" | "error";
  total: number;
  done: number;
  errors: number;
  current: string | null;
  recentLog: string[];
  /** Epoch ms when the run started (drives a live elapsed timer); null when idle. */
  startedAt: number | null;
}

/** Progress of a cross-account bulk note-generation run (accounts processed sequentially). */
export interface BulkNotesStatus {
  status: "idle" | "running" | "done" | "stopped" | "error";
  /** Accounts in the run (only those that had unnoted videos at start). */
  accounts: string[];
  /** The account currently being processed, or null. */
  currentAccount: string | null;
  accountsDone: number;
  totalAccounts: number;
  /** Videos noted / to note, summed across all accounts in the run. */
  done: number;
  total: number;
  errors: number;
}

/** A downloaded item tagged with its owning profile + network (the global Gallery). */
export interface GalleryItem extends Item {
  account: string;
  network: string;
  category: string | null;
}

/** Result of deleting media. File removal is best-effort, so `freedBytes` is a
 *  lower bound (a locked file is dropped from the manifest but not counted). */
export interface DeleteMediaResult {
  deleted: number;
  freedBytes: number;
}

/** Result of deleting an account. `freedBytes` is disk reclaimed — 0 unless
 *  `deleteFiles` was set AND the removal actually succeeded. */
export interface DeleteAccountResult {
  freedBytes: number;
}

/** Filters + sort for the global Gallery — one shape shared by the client hook
 *  and the server aggregator so `media`/`origin`/`sort`/`order` stay typed. */
export interface GalleryQuery {
  q?: string;
  /** A single profile (account name). */
  profile?: string;
  network?: string;
  category?: string;
  media?: MediaType;
  origin?: Origin;
  sort?: "date" | "size" | "duration";
  order?: "asc" | "desc";
}

/** A RAG search result (transcript or note chunk) mapped back to its source. */
export interface SearchHit {
  path: string;
  score: number;
  excerpt: string;
  account: string | null;
  postId: string | null;
  kind: "note" | "transcript" | "other";
}

/** LLM reading config (Whisper + the MCP's analyze_video options + note language). */
export interface AnalysisConfig {
  whisperModel: string;
  whisperLanguage: string;
  detail: "brief" | "standard" | "detailed";
  maxFrames: number;
  threshold: number;
  ocrLanguage: string;
  /** Default language the LLM writes notes in (per-account/per-video can override). */
  noteLanguage: string;
}
