/** Generates video posters (thumbnails) via ffmpeg, lazily, with an on-disk cache. */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ffmpegPath } from "@/server/engine/ffmpeg";

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
