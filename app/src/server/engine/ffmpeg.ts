/**
 * Locates ffmpeg (port of find_ffmpeg_dir from download_instagram.py) and builds
 * the subprocess environment. WITHOUT ffmpeg on the PATH, yt-dlp won't merge
 * video+audio and the videos come out SILENT — so we inject the binary's
 * directory into the PATH.
 */
import { existsSync, readdirSync } from "node:fs";
import { delimiter, join } from "node:path";

const isWin = process.platform === "win32";
const FFMPEG_BIN = isWin ? "ffmpeg.exe" : "ffmpeg";

let cached: string | null | undefined;

export function findFfmpegDir(): string | null {
  if (cached !== undefined) return cached;
  // 1. already on the PATH?
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir && existsSync(join(dir, FFMPEG_BIN))) return (cached = dir);
  }
  // 2. typical winget install (Gyan.FFmpeg) on Windows
  const local = process.env.LOCALAPPDATA;
  if (isWin && local) {
    const base = join(local, "Microsoft", "WinGet", "Packages");
    if (existsSync(base)) {
      for (const pkg of readdirSync(base)) {
        if (!pkg.startsWith("Gyan.FFmpeg")) continue;
        const pkgDir = join(base, pkg);
        for (const sub of readdirSync(pkgDir)) {
          const bin = join(pkgDir, sub, "bin");
          if (existsSync(join(bin, FFMPEG_BIN))) return (cached = bin);
        }
      }
    }
  }
  return (cached = null);
}

/** Python's Scripts directory (where gallery-dl/whisper live on Windows). */
function pythonScriptsDir(): string | null {
  // Best-effort: resolve via PYTHON_BIN or let `python -m` handle it.
  return null;
}

/**
 * Subprocess environment: ffmpeg on the PATH + PYTHONUTF8=1 (avoids cp1252 on
 * Windows). gallery-dl runs via `python -m gallery_dl`, so we only need python
 * on the PATH (already there) and ffmpeg for yt-dlp's merge.
 */
export function buildEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, PYTHONUTF8: "1" };
  const extra: string[] = [];
  const ff = findFfmpegDir();
  if (ff) extra.push(ff);
  const scripts = pythonScriptsDir();
  if (scripts) extra.push(scripts);
  if (extra.length) env.PATH = [...extra, env.PATH ?? ""].join(delimiter);
  return env;
}

export function ffmpegAvailable(): boolean {
  return findFfmpegDir() !== null;
}

/** Path to ffprobe (same folder as ffmpeg), if present. */
export function ffprobePath(): string | null {
  const dir = findFfmpegDir();
  if (!dir) return null;
  const probe = join(dir, isWin ? "ffprobe.exe" : "ffprobe");
  return existsSync(probe) ? probe : null;
}

/** Path to ffmpeg (for generating thumbnails). */
export function ffmpegPath(): string | null {
  const dir = findFfmpegDir();
  if (!dir) return null;
  const bin = join(dir, FFMPEG_BIN);
  return existsSync(bin) ? bin : null;
}
