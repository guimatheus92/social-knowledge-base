/**
 * Note generation via headless Claude Code. The app spawns `claude -p` (same
 * "Node drives a CLI" pattern as gallery-dl): the agent reads the transcript,
 * watches frames/OCR through the video-analyzer MCP, and writes the markdown
 * note. The Node side then marks the item read in the SQLite manifest.
 *
 * No GPU required — the MCP reuses the existing `.vtt` transcript; if missing it
 * falls back to whatever Whisper backend is configured (CPU is fine, just slower).
 */
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { ROOT, assertSafeSegment } from "@/server/paths";
import * as repo from "@/server/db/repository";
import { getAnalysisConfig } from "@/server/config/mcp";
import { DEFAULT_NOTE_LANG, noteLangEnglish } from "@/lib/languages";
import type { BulkNotesStatus, NotesJobStatus } from "@/lib/types";

const CLAUDE = process.env.CLAUDE_BIN || "claude";

/**
 * Which language the note prose is written in, most-specific first:
 * explicit override → per-account setting → global config default → English.
 */
export function resolveNoteLanguage(account: string, override?: string): string {
  if (override) return override;
  const acc = repo.getAccount(account);
  if (acc?.noteLanguage) return acc.noteLanguage;
  return getAnalysisConfig().noteLanguage || DEFAULT_NOTE_LANG;
}

// Pre-approved tools for the headless run (so it never blocks on a prompt).
const NOTE_TOOLS = [
  "mcp__video-analyzer__analyze_video",
  "mcp__video-analyzer__get_transcript",
  "mcp__video-analyzer__get_metadata",
  "mcp__video-analyzer__get_frames",
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
].join(",");

let claudeOk: boolean | null = null;

/** Is the Claude Code CLI installed and runnable? (cached) */
export function claudeAvailable(): Promise<boolean> {
  if (claudeOk !== null) return Promise.resolve(claudeOk);
  return new Promise((resolve) => {
    try {
      // shell:true so Windows resolves the npm `.cmd` shim via PATHEXT.
      const c = spawn(CLAUDE, ["--version"], { windowsHide: true, shell: true });
      c.on("error", () => resolve((claudeOk = false)));
      c.on("close", (code) => resolve((claudeOk = code === 0)));
    } catch {
      resolve((claudeOk = false));
    }
  });
}

export function notePathFor(account: string, postId: string): string {
  return join(ROOT, "notes", account, "videos", `${postId}.md`);
}

export function metaPathFor(account: string, postId: string): string {
  return join(ROOT, "notes", account, "videos", `${postId}.meta.json`);
}

function buildPrompt(
  account: string,
  postId: string,
  origin: string,
  absVideo: string,
  langEnglish: string,
): string {
  const noteRel = `notes/${account}/videos/${postId}.md`;
  const now = new Date().toISOString();
  return [
    "You are this repository's note-taking agent. FIRST read `prompts/build-notes.md` — it holds the canonical note TEMPLATE and the quality rules.",
    "",
    "Generate the note for ONE already-downloaded video:",
    `- profile: ${account}`,
    `- id: ${postId}`,
    `- origin: ${origin}`,
    `- video (absolute path): ${absVideo}`,
    `- processed_at: ${now}`,
    "",
    "Steps:",
    '1. Call the `analyze_video` tool with `url` = the absolute path above and `options` = { "detail": "standard", "ocrLanguage": "por+eng" } to WATCH (frames + OCR) and LISTEN (transcript). The MCP reuses the `.vtt` next to the video if present.',
    `2. Write the note following the TEMPLATE into \`${noteRel}\`. Cite real timestamps; never invent — if speech is inaudible or OCR is empty, say so in that section.`,
    `3. LANGUAGE: write the note — every section heading AND all prose — in ${langEnglish}. Keep the YAML frontmatter KEYS exactly as in the template (do not translate the keys).`,
    "4. Do NOT touch the manifest/SQLite/README or any other file — write ONLY that `.md`.",
    "When done, reply only: DONE",
  ].join("\n");
}

/** Spawns headless Claude Code to write the note for one video. Pure: does not touch the manifest. */
export function generateNote(
  account: string,
  postId: string,
  signal?: AbortSignal,
  language?: string,
): Promise<{ ok: boolean; error?: string }> {
  assertSafeSegment(account);
  assertSafeSegment(postId);
  const item = repo.getItem(account, postId);
  if (!item?.relPath) return Promise.resolve({ ok: false, error: "video not found" });

  const abs = (isAbsolute(item.relPath) ? item.relPath : join(ROOT, item.relPath)).replace(/\\/g, "/");
  const lang = resolveNoteLanguage(account, language);
  const prompt = buildPrompt(account, postId, item.origin, abs, noteLangEnglish(lang));

  return new Promise((resolve) => {
    let child;
    try {
      // shell:true to resolve the Windows `.cmd` shim; the prompt goes via stdin
      // (not as an argv string) so there's nothing for the shell to re-parse.
      child = spawn(
        CLAUDE,
        ["-p", "--output-format", "json", "--permission-mode", "acceptEdits", "--allowedTools", NOTE_TOOLS],
        { cwd: ROOT, env: process.env, windowsHide: true, shell: true, signal },
      );
      child.stdin?.write(prompt);
      child.stdin?.end();
    } catch (e) {
      resolve({ ok: false, error: (e as Error).message });
      return;
    }
    let out = "";
    let err = "";
    child.stdout?.on("data", (d) => (out += d));
    child.stderr?.on("data", (d) => (err += d));
    child.on("error", (e) => resolve({ ok: false, error: e.message }));
    child.on("close", (code) => {
      // Success = the note file now exists (more reliable than parsing the agent's text).
      if (!existsSync(notePathFor(account, postId))) {
        resolve({ ok: false, error: err.slice(-300).trim() || `claude exited with code ${code} without writing the note` });
        return;
      }
      // Best-effort: persist token usage from the JSON result as a sidecar.
      try {
        const res = JSON.parse(out);
        const u = res.usage ?? {};
        writeFileSync(
          metaPathFor(account, postId),
          JSON.stringify({
            inputTokens:
              (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
            outputTokens: u.output_tokens ?? 0,
            costUsd: typeof res.total_cost_usd === "number" ? res.total_cost_usd : null,
            generatedAt: new Date().toISOString(),
          }),
          "utf-8",
        );
      } catch {
        /* usage capture is best-effort */
      }
      resolve({ ok: true });
    });
  });
}

/** Generates one note AND records it in the manifest (status=read + note_path). */
export async function generateAndRecord(account: string, postId: string, signal?: AbortSignal, language?: string): Promise<{ ok: boolean; error?: string }> {
  const r = await generateNote(account, postId, signal, language);
  if (r.ok) {
    repo.markRead(account, postId, new Date().toISOString(), `notes/${account}/videos/${postId}.md`);
  }
  return r;
}

interface NotesJob extends NotesJobStatus {
  abort: AbortController;
}

/** Sequential per-account note runner (one Claude session at a time). Singleton across HMR. */
class NotesRunner {
  private jobs = new Map<string, NotesJob>();
  /** A cross-account bulk run (accounts processed one at a time). */
  private bulk: (BulkNotesStatus & { abort: AbortController }) | null = null;

  private toStatus(j: NotesJob): NotesJobStatus {
    return {
      account: j.account,
      status: j.status,
      total: j.total,
      done: j.done,
      errors: j.errors,
      current: j.current,
      recentLog: j.recentLog,
    };
  }

  get(account: string): NotesJobStatus | null {
    const j = this.jobs.get(account);
    return j ? this.toStatus(j) : null;
  }

  isRunning(account: string): boolean {
    return this.jobs.get(account)?.status === "running";
  }

  /** Videos that are downloaded but not yet noted. */
  private missing(account: string) {
    return repo.listItems(account, { media: "video", status: "downloaded", limit: 100000 });
  }

  start(account: string): NotesJobStatus {
    assertSafeSegment(account);
    if (this.isRunning(account)) return this.get(account)!;
    const items = this.missing(account);
    const job: NotesJob = {
      account,
      status: "running",
      total: items.length,
      done: 0,
      errors: 0,
      current: null,
      recentLog: [],
      abort: new AbortController(),
    };
    this.jobs.set(account, job);
    void this.run(job, items.map((i) => i.postId));
    return this.toStatus(job);
  }

  private async run(job: NotesJob, postIds: string[]): Promise<void> {
    // Resolve the batch language once (per-account override → global default).
    const lang = resolveNoteLanguage(job.account);
    for (const postId of postIds) {
      if (job.abort.signal.aborted) break;
      job.current = postId;
      const r = await generateAndRecord(job.account, postId, job.abort.signal, lang);
      if (r.ok) {
        job.done += 1;
      } else {
        job.errors += 1;
        job.recentLog.push(`${postId}: ${r.error}`);
        if (job.recentLog.length > 50) job.recentLog.shift();
      }
    }
    job.current = null;
    job.status = job.abort.signal.aborted ? "stopped" : job.errors > 0 && job.done === 0 ? "error" : "done";
    try {
      repo.exportJson(job.account);
    } catch {
      /* best effort */
    }
  }

  stop(account: string): NotesJobStatus | null {
    const j = this.jobs.get(account);
    if (!j) return null;
    j.abort.abort();
    if (j.status === "running") j.status = "stopped";
    return this.toStatus(j);
  }

  getBulk(): BulkNotesStatus | null {
    const b = this.bulk;
    if (!b) return null;
    return {
      status: b.status,
      accounts: b.accounts,
      currentAccount: b.currentAccount,
      accountsDone: b.accountsDone,
      totalAccounts: b.totalAccounts,
      done: b.done,
      total: b.total,
      errors: b.errors,
    };
  }

  /** Generate the missing notes for several accounts, processed one account at a time. */
  startBulk(accounts: string[]): BulkNotesStatus {
    if (this.bulk?.status === "running") return this.getBulk()!;
    const work = accounts
      .map((a) => {
        assertSafeSegment(a);
        return { account: a, postIds: this.missing(a).map((i) => i.postId) };
      })
      // Skip accounts with nothing to do, and any already mid-run (a per-account
      // batch) so we never spawn a second Claude session writing the same notes.
      .filter((w) => w.postIds.length > 0 && !this.isRunning(w.account));
    const abort = new AbortController();
    this.bulk = {
      status: "running",
      accounts: work.map((w) => w.account),
      currentAccount: null,
      accountsDone: 0,
      totalAccounts: work.length,
      done: 0,
      total: work.reduce((n, w) => n + w.postIds.length, 0),
      errors: 0,
      abort,
    };
    void this.runBulk(work, abort);
    return this.getBulk()!;
  }

  private async runBulk(
    work: { account: string; postIds: string[] }[],
    abort: AbortController,
  ): Promise<void> {
    const bulk = this.bulk!;
    for (const w of work) {
      if (abort.signal.aborted) break;
      // A per-account run may have started after startBulk filtered — never clobber it.
      if (this.isRunning(w.account)) {
        bulk.accountsDone += 1;
        continue;
      }
      bulk.currentAccount = w.account;
      // A per-account job so that account's card shows live progress; shares the bulk abort.
      const job: NotesJob = {
        account: w.account,
        status: "running",
        total: w.postIds.length,
        done: 0,
        errors: 0,
        current: null,
        recentLog: [],
        abort,
      };
      this.jobs.set(w.account, job);
      await this.run(job, w.postIds);
      bulk.done += job.done;
      bulk.errors += job.errors;
      bulk.accountsDone += 1;
    }
    bulk.currentAccount = null;
    bulk.status = abort.signal.aborted
      ? "stopped"
      : bulk.errors > 0 && bulk.done === 0
        ? "error"
        : "done";
  }

  stopBulk(): BulkNotesStatus | null {
    if (!this.bulk) return null;
    this.bulk.abort.abort();
    if (this.bulk.status === "running") this.bulk.status = "stopped";
    return this.getBulk();
  }
}

// Singleton across HMR. The key carries a version suffix so that adding methods
// to NotesRunner (e.g. the bulk runner) recreates the instance in dev instead of
// reusing a stale one cached from an older class shape.
const globalRef = globalThis as unknown as { __skbNotesRunnerV2?: NotesRunner };
export const notesRunner: NotesRunner =
  globalRef.__skbNotesRunnerV2 ?? (globalRef.__skbNotesRunnerV2 = new NotesRunner());
