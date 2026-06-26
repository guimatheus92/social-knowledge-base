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
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { ROOT, assertSafeSegment } from "@/server/paths";
import * as repo from "@/server/db/repository";
import type { NotesJobStatus } from "@/lib/types";

const CLAUDE = process.env.CLAUDE_BIN || "claude";

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

function buildPrompt(account: string, postId: string, origin: string, absVideo: string): string {
  const noteRel = `notes/${account}/videos/${postId}.md`;
  const now = new Date().toISOString();
  return [
    "Você é o agente de notas deste repositório. LEIA primeiro `prompts/build-notes.md` — ele tem o TEMPLATE canônico da nota e as regras de qualidade.",
    "",
    "Gere a nota de UM vídeo já baixado:",
    `- perfil: ${account}`,
    `- id: ${postId}`,
    `- origem: ${origin}`,
    `- vídeo (caminho absoluto): ${absVideo}`,
    `- processado_em: ${now}`,
    "",
    "Passos:",
    '1. Use a tool `analyze_video` com `url` = o caminho absoluto acima e `options` = { "detail": "standard", "ocrLanguage": "por+eng" } para ASSISTIR (frames + OCR) e OUVIR (transcrição). O MCP reusa o `.vtt` ao lado do vídeo se existir.',
    `2. Escreva a nota seguindo o TEMPLATE em \`${noteRel}\`. Cite timestamps reais; não invente — se a fala estiver inaudível ou o OCR vazio, diga isso na seção.`,
    "3. NÃO toque em manifest/SQLite/README nem em nenhum outro arquivo — escreva APENAS esse `.md`.",
    "Ao terminar, responda apenas: DONE",
  ].join("\n");
}

/** Spawns headless Claude Code to write the note for one video. Pure: does not touch the manifest. */
export function generateNote(
  account: string,
  postId: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; error?: string }> {
  assertSafeSegment(account);
  assertSafeSegment(postId);
  const item = repo.getItem(account, postId);
  if (!item?.relPath) return Promise.resolve({ ok: false, error: "vídeo não encontrado" });

  const abs = (isAbsolute(item.relPath) ? item.relPath : join(ROOT, item.relPath)).replace(/\\/g, "/");
  const prompt = buildPrompt(account, postId, item.origin, abs);

  return new Promise((resolve) => {
    let child;
    try {
      // shell:true to resolve the Windows `.cmd` shim; the prompt goes via stdin
      // (not as an argv string) so there's nothing for the shell to re-parse.
      child = spawn(
        CLAUDE,
        ["-p", "--permission-mode", "acceptEdits", "--allowedTools", NOTE_TOOLS],
        { cwd: ROOT, env: process.env, windowsHide: true, shell: true, signal },
      );
      child.stdin?.write(prompt);
      child.stdin?.end();
    } catch (e) {
      resolve({ ok: false, error: (e as Error).message });
      return;
    }
    let err = "";
    child.stderr?.on("data", (d) => (err += d));
    child.stdout?.on("data", () => {}); // drain so it doesn't block
    child.on("error", (e) => resolve({ ok: false, error: e.message }));
    child.on("close", (code) => {
      // Success = the note file now exists (more reliable than parsing the agent's text).
      if (existsSync(notePathFor(account, postId))) resolve({ ok: true });
      else resolve({ ok: false, error: err.slice(-300).trim() || `claude saiu com código ${code} sem gravar a nota` });
    });
  });
}

/** Generates one note AND records it in the manifest (status=read + note_path). */
export async function generateAndRecord(account: string, postId: string, signal?: AbortSignal): Promise<{ ok: boolean; error?: string }> {
  const r = await generateNote(account, postId, signal);
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
    for (const postId of postIds) {
      if (job.abort.signal.aborted) break;
      job.current = postId;
      const r = await generateAndRecord(job.account, postId, job.abort.signal);
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
}

const globalRef = globalThis as unknown as { __skbNotesRunner?: NotesRunner };
export const notesRunner: NotesRunner =
  globalRef.__skbNotesRunner ?? (globalRef.__skbNotesRunner = new NotesRunner());
