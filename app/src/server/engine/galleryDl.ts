/**
 * gallery-dl runner for ONE tab (port of run_gallery_dl from
 * download_instagram.py). Spawns `python -m gallery_dl`, parses stdout
 * per file → events + upsert into the SQLite manifest. ffmpeg is injected into the PATH.
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { DatabaseSync } from "node:sqlite";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, posix, relative, sep } from "node:path";
import { ROOT } from "@/server/paths";
import { buildEnv } from "@/server/engine/ffmpeg";
import { mediaFilterArgs, mediaTypeForFile } from "@/server/engine/mediaType";
import { getProvider, providerForUrl, type SourceProvider } from "@/server/providers";
import * as repo from "@/server/db/repository";
import { ensureThumb, thumbPathFor } from "@/server/engine/thumbnails";
import { TAB_ORIGIN, type MediaType, type Tab } from "@/lib/types";
import type { JobEvent } from "@/server/engine/progress";

const PYTHON = process.env.PYTHON_BIN || "python";

export interface TabRunOptions {
  account: string;
  /** Base download folder for this account (e.g.: .../downloads/<account>). */
  saveDir: string;
  cookiesPath: string;
  tab: Tab;
  mediaTypes: MediaType[];
  range?: string;
  /** Incremental: aborts the tab at the first already-downloaded item. */
  incremental?: boolean;
  /** Count only (gallery-dl --simulate) — neither downloads nor writes. */
  simulate?: boolean;
  /** Download a SINGLE video from this URL (instead of enumerating the profile). */
  singleUrl?: string;
  /** Social network of the account (default: Instagram). */
  provider?: SourceProvider;
  signal: AbortSignal;
  emit: (e: JobEvent) => void;
}

export interface TabRunResult {
  downloaded: number;
  skipped: number;
  errors: number;
}

export function archivePath(saveDir: string, tab: Tab): string {
  return join(saveDir, `.gdl-archive-${tab}.sqlite3`);
}

/**
 * Seeds the gallery-dl archive with the files ALREADY on disk (entry =
 * `instagram<post_id>`, gallery-dl's format) so we can resume without
 * re-downloading. Idempotent. Returns how many entries exist in the folder.
 */
export function seedArchive(saveDir: string, tab: Tab): number {
  const dir = join(saveDir, tab);
  if (!existsSync(dir)) return 0;
  const db = new DatabaseSync(archivePath(saveDir, tab));
  try {
    db.exec("CREATE TABLE IF NOT EXISTS archive (entry TEXT PRIMARY KEY)");
    const stmt = db.prepare("INSERT OR IGNORE INTO archive(entry) VALUES (?)");
    let n = 0;
    db.exec("BEGIN");
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.name.startsWith(".")) continue;
        const full = join(d, e.name);
        if (e.isDirectory()) {
          walk(full);
          continue;
        }
        if (!mediaTypeForFile(e.name)) continue;
        stmt.run(`instagram${basename(e.name, extname(e.name))}`);
        n += 1;
      }
    };
    walk(dir);
    db.exec("COMMIT");
    return n;
  } finally {
    db.close();
  }
}

export function buildArgs(o: TabRunOptions): string[] {
  const provider = o.provider ?? getProvider();
  const dest = join(o.saveDir, o.tab);
  const args = ["-m", "gallery_dl", "--cookies", o.cookiesPath];
  if (o.simulate) args.push("--simulate");
  else args.push("--download-archive", archivePath(o.saveDir, o.tab));
  args.push("-o", "videos=true", "-D", dest, ...mediaFilterArgs(o.mediaTypes));
  if (o.singleUrl) {
    // Single video: use the media's own URL, without enumerating the profile's tabs.
    args.push(o.singleUrl);
    return args;
  }
  args.push(...provider.kindArgs(o.tab));
  if (o.range) args.push("--range", o.range);
  if (o.incremental && !o.simulate) args.push("-o", "skip=abort:1");
  args.push(provider.profileUrl(o.account));
  return args;
}

/** Finds the first `username` field (owner) in a gallery-dl `-j` JSON. */
function findUsername(jsonText: string): string | null {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return null;
  }
  let found: string | null = null;
  const visit = (o: unknown): void => {
    if (found || o === null || typeof o !== "object") return;
    if (Array.isArray(o)) {
      for (const v of o) visit(v);
      return;
    }
    const rec = o as Record<string, unknown>;
    if (typeof rec.username === "string" && rec.username) {
      found = rec.username;
      return;
    }
    const owner = rec.owner as Record<string, unknown> | undefined;
    if (owner && typeof owner.username === "string" && owner.username) {
      found = owner.username;
      return;
    }
    for (const v of Object.values(rec)) visit(v);
  };
  visit(data);
  return found;
}

/**
 * Resolves the owner (username) and the tab from a media URL, via
 * `gallery-dl -j` (downloads nothing). Enables "download just 1 video from the link".
 */
export function resolveOwner(
  url: string,
  cookiesPath: string,
  signal?: AbortSignal,
): Promise<{ account: string; tab: Tab; providerId: string }> {
  const provider = providerForUrl(url) ?? getProvider();
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, ["-m", "gallery_dl", "-j", "--cookies", cookiesPath, url], {
      env: buildEnv(),
      signal,
      windowsHide: true,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("error", (e) => reject(e));
    child.on("close", () => {
      const username = findUsername(out);
      if (!username) {
        reject(new Error(`Could not identify the video's owner (valid cookies?). ${err.slice(0, 200)}`.trim()));
        return;
      }
      resolve({ account: username, tab: provider.kindFromUrl(url) as Tab, providerId: provider.id });
    });
  });
}

/**
 * Peeks the top `count` items of a tab via `gallery-dl --simulate` against the
 * resume archive and reports how many are NEW (not yet downloaded). One small
 * request — powers the "New posts" delta preview before committing to a sync.
 */
export function peekNew(o: {
  account: string;
  saveDir: string;
  cookiesPath: string;
  tab: Tab;
  count: number;
  provider?: SourceProvider;
  signal?: AbortSignal;
}): Promise<{ newCount: number; checked: number }> {
  const provider = o.provider ?? getProvider();
  try {
    seedArchive(o.saveDir, o.tab); // reflect what's already on disk
  } catch {
    /* best effort */
  }
  const args = [
    "-m", "gallery_dl", "--simulate",
    "--download-archive", archivePath(o.saveDir, o.tab),
    "--cookies", o.cookiesPath,
    "-o", "videos=true",
    "--range", `1-${o.count}`,
    ...provider.kindArgs(o.tab),
    provider.profileUrl(o.account),
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, args, { env: buildEnv(), signal: o.signal, windowsHide: true });
    let newCount = 0;
    let checked = 0;
    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      let p = line.trim();
      if (!p) return;
      const isSkip = p.startsWith("# "); // gallery-dl marks already-archived items
      if (isSkip) p = p.slice(2).trim();
      if (!mediaTypeForFile(p)) return;
      const pid = basename(p, extname(p));
      if (pid.includes(".")) return; // yt-dlp fragment
      checked += 1;
      if (!isSkip) newCount += 1;
    });
    child.on("error", reject);
    child.on("close", () => resolve({ newCount, checked }));
  });
}

const RE_RATE_LIMIT = /401|please wait a few minutes/i;
const RE_LOGIN_REDIRECT = /accounts\/login|redirect to login/i;

/**
 * Post id = filename without extension. gallery-dl prints `\` paths on Windows
 * and `/` on Linux/Docker, so normalize both separators and parse with the
 * posix rules — keeps stdout parsing identical on every platform (the test
 * runner and the container are Linux; the user's machine is Windows).
 */
function postIdFromPath(p: string): string {
  const norm = p.replace(/\\/g, "/");
  return posix.basename(norm, posix.extname(norm));
}

/** Is a stdout line a media path from this tab? (downloaded or `# ` skip) */
export function parseMediaLine(
  line: string,
  tab: Tab,
): { postId: string; mediaType: MediaType; path: string; skipped: boolean } | null {
  let p = line.trim();
  if (!p) return null;
  let skipped = false;
  if (p.startsWith("# ")) {
    skipped = true;
    p = p.slice(2).trim();
  }
  const mediaType = mediaTypeForFile(p);
  if (!mediaType) return null;
  // confirm it belongs to the tab's folder (avoids false positives in logs)
  if (!p.replace(/\\/g, "/").includes(`/${tab}/`)) return null;
  const postId = postIdFromPath(p);
  if (postId.includes(".")) return null; // yt-dlp fragment (<id>.f...) — not real media
  return { postId, mediaType, path: p, skipped };
}

export function runTab(o: TabRunOptions): Promise<TabRunResult> {
  return new Promise((resolve) => {
    const result: TabRunResult = { downloaded: 0, skipped: 0, errors: 0 };
    o.emit({ t: "tab_start", tab: o.tab });

    // Resume: ensures everything on disk is in the archive (avoids re-downloading).
    if (!o.simulate) {
      try {
        seedArchive(o.saveDir, o.tab);
      } catch (e) {
        o.emit({ t: "log", level: "warn", msg: `[${o.tab}] seed archive failed: ${(e as Error).message}` });
      }
    }

    const child = spawn(PYTHON, buildArgs(o), {
      env: buildEnv(),
      signal: o.signal,
      windowsHide: true,
    });

    let lastTs = Date.now();
    // Hoisted: where this account's posters go (matches the thumb route). Stable
    // for the run, so resolve it once instead of per downloaded file.
    const thumbDir = repo.getAccount(o.account)?.savePath ?? join(ROOT, "downloads", o.account);
    const out = createInterface({ input: child.stdout });
    out.on("line", (line) => {
      if (o.simulate) {
        // --simulate prints only the file name (with "# " if it already exists).
        // Counts any listed media (becomes "discovered"), without downloading or writing.
        let p = line.trim();
        if (p.startsWith("# ")) p = p.slice(2).trim();
        const mt = mediaTypeForFile(p);
        if (!mt) return;
        const pid = postIdFromPath(p);
        if (pid.includes(".")) return; // yt-dlp fragment
        result.skipped += 1;
        o.emit({ t: "file_done", tab: o.tab, postId: pid, mediaType: mt, bytes: 0, elapsedMs: 0, skipped: true });
        return;
      }
      const m = parseMediaLine(line, o.tab);
      if (!m) return;
      if (m.skipped) {
        result.skipped += 1;
        o.emit({ t: "file_done", tab: o.tab, postId: m.postId, mediaType: m.mediaType, bytes: 0, elapsedMs: 0, skipped: true });
        return;
      }
      let bytes = 0;
      try {
        bytes = statSync(m.path).size;
      } catch {
        /* file may still be finalizing; carry on */
      }
      const now = Date.now();
      const elapsedMs = now - lastTs;
      lastTs = now;
      repo.upsertItem(o.account, {
        postId: m.postId,
        mediaType: m.mediaType,
        origin: TAB_ORIGIN[o.tab] ?? "post",
        relPath: relative(ROOT, m.path).split(sep).join("/"),
        fileSize: bytes || null,
        status: "downloaded",
        downloadedAt: new Date(now).toISOString(),
        downloadMs: elapsedMs,
      });
      // Pre-generate the poster (background, capped) so the gallery is instant later.
      if (m.mediaType === "video") {
        void ensureThumb(m.path, thumbPathFor(thumbDir, m.postId));
      }
      result.downloaded += 1;
      o.emit({ t: "file_done", tab: o.tab, postId: m.postId, mediaType: m.mediaType, bytes, elapsedMs, skipped: false });
    });

    const err = createInterface({ input: child.stderr });
    err.on("line", (line) => {
      const l = line.trim();
      if (!l) return;
      if (RE_RATE_LIMIT.test(l)) o.emit({ t: "rate_limited", tab: o.tab });
      else if (RE_LOGIN_REDIRECT.test(l)) o.emit({ t: "cookies_expired", tab: o.tab });
      o.emit({ t: "log", level: "warn", msg: `[${o.tab}] ${l}` });
    });

    child.on("error", (e) => {
      o.emit({ t: "log", level: "error", msg: `[${o.tab}] spawn failed: ${e.message}` });
      result.errors += 1;
      o.emit({ t: "tab_done", tab: o.tab, downloaded: result.downloaded, skipped: result.skipped, errors: result.errors });
      resolve(result);
    });

    child.on("close", (code) => {
      if (code && code !== 0) {
        o.emit({ t: "log", level: "warn", msg: `[${o.tab}] gallery-dl exited with code ${code}` });
      }
      o.emit({ t: "tab_done", tab: o.tab, downloaded: result.downloaded, skipped: result.skipped, errors: result.errors });
      resolve(result);
    });
  });
}
