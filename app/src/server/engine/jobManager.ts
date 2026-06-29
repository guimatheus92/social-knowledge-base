/**
 * Orchestrates the downloads. One job per target account; accounts are
 * independent. Tabs run in parallel (up to `parallelism`). Jobs that share the
 * SAME cookies.txt are serialized (parallel on the same IG session = ban risk).
 * Singleton on globalThis to survive Next's HMR in dev.
 */
import { join } from "node:path";
import { resolveOwner, runTab, type TabRunResult } from "@/server/engine/galleryDl";
import { getProvider } from "@/server/providers";
import * as repo from "@/server/db/repository";
import { DOWNLOADS } from "@/server/paths";
import type { JobEvent, JobMode, JobSnapshot, JobStatus, MediaType, Tab } from "@/lib/types";

const DEFAULT_TABS: Tab[] = ["highlights", "reels", "stories"];
const MAX_PARALLELISM = 4;

export interface StartJobOptions {
  account: string;
  cookiesPath: string;
  tabs?: Tab[];
  media?: MediaType[];
  parallelism?: number;
  range?: string;
  mode?: JobMode;
  /** "single" mode: URL of the single media item to download. */
  url?: string;
  /** Social network of the account (default: instagram). */
  providerId?: string;
  /** Force re-download (ignore the archive) — used to restore a freed video. */
  force?: boolean;
}

interface JobState extends JobSnapshot {
  cookiesPath: string;
  range?: string;
  url?: string;
  providerId?: string;
  force?: boolean;
  abort: AbortController;
}

function clampParallelism(p: number | undefined): number {
  return Math.max(1, Math.min(MAX_PARALLELISM, p ?? 2));
}

async function runWithLimit<T>(items: T[], limit: number, signal: AbortSignal, fn: (t: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const worker = async (): Promise<void> => {
    for (;;) {
      if (signal.aborted) return;
      const item = queue.shift();
      if (item === undefined) return;
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker));
}

class JobManager {
  private jobs = new Map<string, JobState>();
  /** Wait queue per cookie session (serialization). */
  private waiting = new Map<string, StartJobOptions[]>();
  /** Listeners per account (persist across jobs — the UI subscribes before Play). */
  private listeners = new Map<string, Set<(e: JobEvent) => void>>();

  list(): JobSnapshot[] {
    return [...this.jobs.values()].map((j) => this.toSnapshot(j));
  }

  get(account: string): JobSnapshot | null {
    const j = this.jobs.get(account);
    return j ? this.toSnapshot(j) : null;
  }

  isRunning(account: string): boolean {
    const j = this.jobs.get(account);
    return !!j && (j.status === "running" || j.status === "queued");
  }

  private toSnapshot(j: JobState): JobSnapshot {
    const elapsed =
      j.status === "running" && j.startedAt
        ? j.elapsedSeconds + (Date.now() - j.startedAt) / 1000
        : j.elapsedSeconds;
    return {
      account: j.account,
      status: j.status,
      mode: j.mode,
      tabs: j.tabs,
      media: j.media,
      parallelism: j.parallelism,
      startedAt: j.startedAt,
      elapsedSeconds: elapsed,
      downloaded: j.downloaded,
      skipped: j.skipped,
      errors: j.errors,
      discovered: j.discovered,
      bytesTotal: j.bytesTotal,
      rateLimited: j.rateLimited,
      cookiesExpired: j.cookiesExpired,
      recentLog: j.recentLog,
    };
  }

  subscribe(account: string, listener: (e: JobEvent) => void): () => void {
    let set = this.listeners.get(account);
    if (!set) {
      set = new Set();
      this.listeners.set(account, set);
    }
    set.add(listener);
    return () => set!.delete(listener);
  }

  private dispatch(j: JobState, e: JobEvent): void {
    switch (e.t) {
      case "file_done":
        j.discovered += 1;
        if (e.skipped) j.skipped += 1;
        else {
          j.downloaded += 1;
          j.bytesTotal += e.bytes;
        }
        break;
      case "file_error":
        j.errors += 1;
        break;
      case "rate_limited":
        j.rateLimited = true;
        break;
      case "cookies_expired":
        j.cookiesExpired = true;
        break;
      case "log":
        j.recentLog.push(e.msg);
        if (j.recentLog.length > 200) j.recentLog.shift();
        break;
    }
    const set = this.listeners.get(j.account);
    if (set) {
      for (const l of set) {
        try {
          l(e);
        } catch {
          /* dead listener; ignore */
        }
      }
    }
  }

  /** Starts (or queues) a job. Returns the initial state. */
  start(opts: StartJobOptions): JobSnapshot {
    const { account } = opts;
    if (this.isRunning(account)) return this.get(account)!;

    // Serialization per cookie session.
    const busy = [...this.jobs.values()].find(
      (j) => j.status === "running" && j.cookiesPath === opts.cookiesPath,
    );
    if (busy) {
      const q = this.waiting.get(opts.cookiesPath) ?? [];
      q.push(opts);
      this.waiting.set(opts.cookiesPath, q);
      const queued = this.makeState(opts, "queued");
      this.jobs.set(account, queued);
      return this.toSnapshot(queued);
    }

    const state = this.makeState(opts, "running");
    this.jobs.set(account, state);
    void this.runJob(state);
    return this.toSnapshot(state);
  }

  /**
   * Downloads a SINGLE video from the link. Resolves the owner from the URL,
   * creates the account (if it doesn't exist) and fires a job in "single" mode —
   * the same account creation/download pattern. Returns the snapshot (includes `account`).
   */
  async startSingle(opts: {
    url: string;
    cookiesPath: string;
    media?: MediaType[];
    force?: boolean;
  }): Promise<JobSnapshot> {
    const { account, tab, providerId } = await resolveOwner(opts.url, opts.cookiesPath);
    if (!repo.getAccount(account)) {
      repo.upsertAccount({
        account,
        savePath: join(DOWNLOADS, account),
        cookiesPath: opts.cookiesPath,
        mediaTypes: opts.media ?? ["video"],
        tabs: [tab],
        network: providerId,
      });
    }
    return this.start({
      account,
      cookiesPath: opts.cookiesPath,
      media: opts.media ?? ["video"],
      tabs: [tab],
      mode: "single",
      url: opts.url,
      providerId,
      force: opts.force,
    });
  }

  private makeState(opts: StartJobOptions, status: JobStatus): JobState {
    return {
      account: opts.account,
      cookiesPath: opts.cookiesPath,
      status,
      mode: opts.mode ?? "full",
      tabs: opts.tabs?.length ? opts.tabs : DEFAULT_TABS,
      media: opts.media?.length ? opts.media : ["video"],
      parallelism: clampParallelism(opts.parallelism),
      range: opts.range,
      url: opts.url,
      providerId: opts.providerId,
      force: opts.force,
      startedAt: status === "running" ? Date.now() : null,
      elapsedSeconds: 0,
      downloaded: 0,
      skipped: 0,
      errors: 0,
      discovered: 0,
      bytesTotal: 0,
      rateLimited: false,
      cookiesExpired: false,
      recentLog: [],
      abort: new AbortController(),
    };
  }

  private async runJob(j: JobState): Promise<void> {
    j.startedAt = Date.now();
    j.status = "running";
    this.dispatch(j, {
      t: "job_start",
      account: j.account,
      tabs: j.tabs,
      media: j.media,
      parallelism: j.parallelism,
      mode: j.mode,
    });

    const acc = repo.getAccount(j.account);
    const saveDir = acc?.savePath ?? join(DOWNLOADS, j.account);

    const results: TabRunResult[] = [];
    try {
      await runWithLimit(j.tabs, j.parallelism, j.abort.signal, async (tab) => {
        const r = await runTab({
          account: j.account,
          saveDir,
          cookiesPath: j.cookiesPath,
          tab,
          mediaTypes: j.media,
          range: j.range,
          incremental: j.mode === "incremental",
          simulate: j.mode === "count",
          singleUrl: j.mode === "single" ? j.url : undefined,
          force: j.force,
          provider: getProvider(j.providerId),
          signal: j.abort.signal,
          emit: (e) => this.dispatch(j, e),
        });
        results.push(r);
      });
    } catch (e) {
      this.dispatch(j, { t: "log", level: "error", msg: `job failed: ${(e as Error).message}` });
    }

    const elapsedSeconds = j.startedAt ? (Date.now() - j.startedAt) / 1000 : 0;
    j.elapsedSeconds += elapsedSeconds;
    j.startedAt = null;
    j.status = j.abort.signal.aborted ? "stopped" : j.errors > 0 ? "error" : "completed";

    try {
      if (j.mode === "count") {
        // "Count": stores the estimated total (items discovered in --simulate).
        repo.setEstimatedTotal(j.account, j.discovered);
      } else {
        repo.addElapsed(j.account, elapsedSeconds);
        repo.setLastSynced(j.account);
        repo.exportJson(j.account);
      }
    } catch (e) {
      this.dispatch(j, { t: "log", level: "warn", msg: `post-process: ${(e as Error).message}` });
    }

    this.dispatch(j, {
      t: "job_done",
      status: j.status,
      elapsedSeconds: j.elapsedSeconds,
      downloaded: j.downloaded,
      skipped: j.skipped,
      errors: j.errors,
    });

    this.dequeueNext(j.cookiesPath);
  }

  private dequeueNext(cookiesPath: string): void {
    const q = this.waiting.get(cookiesPath);
    if (!q || q.length === 0) return;
    const next = q.shift()!;
    if (q.length === 0) this.waiting.delete(cookiesPath);
    // Reuses the already-created state (status=queued) or creates a new one.
    const existing = this.jobs.get(next.account);
    const state = existing ?? this.makeState(next, "running");
    state.status = "running";
    state.abort = new AbortController();
    this.jobs.set(next.account, state);
    void this.runJob(state);
  }

  stop(account: string): JobSnapshot | null {
    const j = this.jobs.get(account);
    if (!j) return null;
    j.abort.abort();
    // If it was only queued, mark it stopped right away.
    if (j.status === "queued") {
      j.status = "stopped";
      const q = this.waiting.get(j.cookiesPath);
      if (q) this.waiting.set(j.cookiesPath, q.filter((o) => o.account !== account));
    }
    return this.toSnapshot(j);
  }
}

// Singleton resilient to Next's HMR (dev).
const globalRef = globalThis as unknown as { __igkbJobManager?: JobManager };
export const jobManager: JobManager = globalRef.__igkbJobManager ?? (globalRef.__igkbJobManager = new JobManager());
