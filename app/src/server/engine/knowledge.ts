/**
 * Knowledge layer: reads a video's curated note + transcript from disk, and
 * runs RAG search by shelling `scripts/query.py` (Chroma) — same "Node drives a
 * Python CLI" pattern as gallery-dl. No long-running Python service.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { ROOT, assertSafeSegment } from "@/server/paths";
import * as repo from "@/server/db/repository";
import type { NoteMeta, SearchHit } from "@/lib/types";

const PYTHON = process.env.PYTHON_BIN || "python";

/** Drop leading YAML frontmatter so only the note body is rendered. */
function stripFrontmatter(md: string): string {
  if (!md.startsWith("---")) return md;
  const end = md.indexOf("\n---", 3);
  if (end === -1) return md;
  const nl = md.indexOf("\n", end + 1);
  return nl === -1 ? "" : md.slice(nl + 1).trimStart();
}

/** Reduce a .vtt to plain caption text (no header, cue numbers, or timestamps). */
function vttToText(vtt: string): string {
  return vtt
    .split(/\r?\n/)
    .filter((l) => l && !/^WEBVTT/i.test(l) && !l.includes("-->") && !/^\d+$/.test(l))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function readVideoKnowledge(
  account: string,
  postId: string,
): Promise<{ note: string | null; transcript: string | null; noteMeta: NoteMeta | null }> {
  assertSafeSegment(account);
  assertSafeSegment(postId);
  let note: string | null = null;
  const notePath = join(ROOT, "notes", account, "videos", `${postId}.md`);
  if (existsSync(notePath)) {
    try {
      note = stripFrontmatter(await readFile(notePath, "utf-8")).trim() || null;
    } catch {
      /* unreadable */
    }
  }

  let transcript: string | null = null;
  const txt = join(ROOT, "downloads", account, "transcripts", `${postId}.txt`);
  if (existsSync(txt)) {
    try {
      transcript = (await readFile(txt, "utf-8")).trim() || null;
    } catch {
      /* unreadable */
    }
  }
  // Fallback: the .vtt sitting next to the video file.
  if (!transcript) {
    const item = repo.getItem(account, postId);
    if (item?.relPath) {
      const abs = isAbsolute(item.relPath) ? item.relPath : join(ROOT, item.relPath);
      const vtt = abs.replace(/\.[^.]+$/, ".vtt");
      if (existsSync(vtt)) {
        try {
          transcript = vttToText(await readFile(vtt, "utf-8")) || null;
        } catch {
          /* unreadable */
        }
      }
    }
  }
  let noteMeta: NoteMeta | null = null;
  const metaPath = join(ROOT, "notes", account, "videos", `${postId}.meta.json`);
  if (existsSync(metaPath)) {
    try {
      noteMeta = JSON.parse(await readFile(metaPath, "utf-8")) as NoteMeta;
    } catch {
      /* corrupt sidecar */
    }
  }

  return { note, transcript, noteMeta };
}

/** Maps a result path back to the account + post it came from. */
function locate(path: string): Pick<SearchHit, "account" | "postId" | "kind"> {
  const p = (path ?? "").replace(/\\/g, "/");
  let m = p.match(/notes\/([^/]+)\/videos\/(\d+)\.md$/i);
  if (m) return { account: m[1], postId: m[2], kind: "note" };
  m = p.match(/downloads\/([^/]+)\/transcripts\/(\d+)\.txt$/i);
  if (m) return { account: m[1], postId: m[2], kind: "transcript" };
  m = p.match(/notes\/([^/]+)\//i); // thematic guide (no single post)
  if (m) return { account: m[1], postId: null, kind: "note" };
  return { account: null, postId: null, kind: "other" };
}

export function searchRag(question: string, k = 10): Promise<SearchHit[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [join(ROOT, "scripts", "query.py"), question, "-k", String(k), "--json"], {
      env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
      windowsHide: true,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (!out.trim()) {
        reject(new Error(err.slice(0, 300).trim() || `query.py exited with code ${code}`));
        return;
      }
      try {
        const raw = JSON.parse(out) as { path: string; score: number; excerpt: string }[];
        resolve(raw.map((r) => ({ ...r, ...locate(r.path) })));
      } catch (e) {
        reject(new Error(`invalid output from query.py: ${(e as Error).message}`));
      }
    });
  });
}
