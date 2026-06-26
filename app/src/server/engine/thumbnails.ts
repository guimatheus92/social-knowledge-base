/** Generates video posters (thumbnails) via ffmpeg, lazily, with an on-disk cache. */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { ffmpegPath } from "@/server/engine/ffmpeg";
import { ROOT } from "@/server/paths";
import { getAccount, listAccountNames, listItems } from "@/server/db/repository";

// Cap concurrent ffmpeg processes (so we don't blow up while scrolling the grid).
let active = 0;
const waiters: Array<() => void> = [];
const LIMIT = 3;

async function withLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= LIMIT) await new Promise<void>((r) => waiters.push(r));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiters.shift()?.();
  }
}

export function thumbPathFor(saveDir: string, postId: string): string {
  return join(saveDir, ".thumbs", `${postId}.jpg`);
}

/**
 * Generates the poster (if it doesn't exist yet). Returns true if the file exists at the end.
 * Cancelable: if the `signal` aborts (e.g. the user left the page), it doesn't start /
 * kills the ffmpeg process — avoids a backlog that would saturate the server.
 */
export function ensureThumb(
  videoAbsPath: string,
  thumbAbs: string,
  signal?: AbortSignal,
): Promise<boolean> {
  if (existsSync(thumbAbs)) return Promise.resolve(true);
  if (signal?.aborted) return Promise.resolve(false);
  const ff = ffmpegPath();
  if (!ff || !existsSync(videoAbsPath)) return Promise.resolve(false);
  mkdirSync(dirname(thumbAbs), { recursive: true });
  return withLimit(
    () =>
      new Promise<boolean>((resolve) => {
        if (signal?.aborted) {
          resolve(false);
          return;
        }
        const p = spawn(
          ff,
          ["-y", "-ss", "1", "-i", videoAbsPath, "-frames:v", "1", "-vf", "scale=360:-1", "-q:v", "4", thumbAbs],
          { windowsHide: true },
        );
        const onAbort = () => {
          try {
            p.kill();
          } catch {
            /* already exited */
          }
          resolve(false);
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        const done = (val: boolean) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(val);
        };
        p.on("close", () => done(existsSync(thumbAbs)));
        p.on("error", () => done(false));
      }),
  );
}

let warming = false;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Background batch: generate posters for every already-downloaded video that
 * doesn't have one yet, across all profiles. Deliberately **gentle** — one
 * ffmpeg at a time with a pause between generations — so a big backlog (10k+
 * videos) warms quietly without starving the server. Idempotent (skips cached
 * fast) and safe to call repeatedly; returns once the backlog is drained.
 */
export async function warmAllThumbnails(): Promise<{ total: number }> {
  if (warming) return { total: 0 };
  warming = true;
  try {
    // Collect work without per-item stat (that would block the loop) — the
    // worker checks the cache one at a time, interleaved with yields.
    const work: { abs: string; thumb: string }[] = [];
    for (const account of listAccountNames()) {
      const saveDir = getAccount(account)?.savePath ?? join(ROOT, "downloads", account);
      for (const it of listItems(account, { media: "video", limit: 1_000_000 })) {
        if (!it.relPath) continue;
        const abs = isAbsolute(it.relPath) ? it.relPath : join(ROOT, it.relPath);
        work.push({ abs, thumb: thumbPathFor(saveDir, it.postId) });
      }
    }
    for (let i = 0; i < work.length; i++) {
      const w = work[i];
      if (!existsSync(w.thumb)) {
        await ensureThumb(w.abs, w.thumb);
        await sleep(120); // breathe between real generations so the UI stays snappy
      } else if (i % 200 === 0) {
        await sleep(0); // yield occasionally while fast-skipping cached posters
      }
    }
    return { total: work.length };
  } finally {
    warming = false;
  }
}
