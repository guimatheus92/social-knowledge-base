/**
 * Deletes media (files + manifest rows) and whole accounts. File removal is
 * best-effort: a locked file (EBUSY/EPERM on Windows) never aborts the rest.
 * The reported `freedBytes` only counts files that were actually removed, so it
 * is a lower bound — never claims success for a file that survived.
 */
import { rmSync, existsSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join } from "node:path";
import { ROOT, MANIFESTS, assertSafeSegment } from "@/server/paths";
import { clearItemMedia, deleteItemRows, getAccount, getCounts, getItem } from "@/server/db/repository";
import { closeDb, markDeleting, openDb, unmarkDeleting } from "@/server/db/sqlite";
import { thumbPathFor } from "@/server/engine/thumbnails";
import { jobManager } from "@/server/engine/jobManager";
import type { DeleteAccountResult, DeleteMediaResult } from "@/lib/types";

/**
 * Remove a file. Returns whether it was actually removed. `force: true` already
 * ignores a missing path, so a `false` here means a real failure (a locked file
 * — EBUSY/EPERM), which the caller may or may not care about.
 */
function tryRm(p: string): boolean {
  try {
    rmSync(p, { force: true });
    return true;
  } catch {
    return false;
  }
}

function safeSize(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return 0; // size probe is best-effort
  }
}

/**
 * Delete media items. A plain delete removes everything (video, poster, the
 * transcript sidecars and the note) and drops the manifest row. With `keepNotes`,
 * an item that HAS a note keeps its row as a "note-only" item — only the heavy
 * video is freed; the note, its transcript sidecars and the poster stay on disk
 * and the row stays (media nulled) so the note is still readable in the library.
 * An un-noted item has nothing to keep, so it is deleted outright even then.
 */
export function deleteMediaItems(
  account: string,
  postIds: string[],
  opts: { keepNotes?: boolean } = {},
): DeleteMediaResult {
  const acc = getAccount(account);
  const saveDir = acc?.savePath ?? join(ROOT, "downloads", account);
  let freedBytes = 0;
  let deleted = 0;
  const toDrop: string[] = []; // rows removed entirely
  const toClear: string[] = []; // rows kept as note-only (media nulled)
  for (const postId of postIds) {
    assertSafeSegment(postId); // never interpolate a crafted id into an rmSync path
    const it = getItem(account, postId);
    if (!it) {
      toDrop.push(postId); // not in the manifest → make sure no row lingers
      continue;
    }
    const keepThis = Boolean(opts.keepNotes && (it.notePath || it.readAt || it.status === "read"));

    // Always free the heavy video file — that's the whole point, and a plain delete frees it too.
    let abs: string | null = null;
    if (it.relPath) abs = isAbsolute(it.relPath) ? it.relPath : join(ROOT, it.relPath);
    if (abs) {
      const size = existsSync(abs) ? safeSize(abs) : 0;
      if (tryRm(abs)) freedBytes += size; // only count it as freed if actually removed
      else console.warn(`[deletion] could not remove ${abs}; the manifest row is updated anyway`);
    }

    if (keepThis) {
      // note-only: keep the note, its transcript sidecars and the poster on disk.
      toClear.push(postId);
    } else {
      if (abs) tryRm(join(dirname(abs), `${basename(abs, extname(abs))}.vtt`)); // .vtt next to the video
      tryRm(join(saveDir, "transcripts", `${postId}.txt`));
      tryRm(join(saveDir, "transcripts", `${postId}.json`));
      tryRm(thumbPathFor(saveDir, postId)); // derived poster — orphaned once the row goes
      tryRm(join(ROOT, "notes", account, "videos", `${postId}.md`));
      tryRm(join(ROOT, "notes", account, "videos", `${postId}.meta.json`));
      toDrop.push(postId);
    }
    deleted += 1;
  }
  clearItemMedia(account, toClear);
  deleteItemRows(account, toDrop);
  return { deleted, freedBytes };
}

/** Delete a whole account: stop its job, drop its manifest, optionally its files. */
export async function deleteAccount(
  account: string,
  opts: { deleteFiles?: boolean } = {},
): Promise<DeleteAccountResult> {
  jobManager.stop(account);
  const acc = getAccount(account);
  const saveDir = acc?.savePath ?? join(ROOT, "downloads", account);
  let freedBytes = 0;
  if (opts.deleteFiles && existsSync(saveDir)) {
    const total = getCounts(account).bytesTotal; // read before dropping the DB
    try {
      rmSync(saveDir, { recursive: true, force: true });
      freedBytes = total; // only claim it once the removal actually succeeded
    } catch (e) {
      // Surface it; the manifest is still dropped below, and the UI sees freedBytes=0.
      console.warn(`[deletion] files at ${saveDir} could not be removed: ${(e as Error).message}`);
    }
  }
  // Fold the WAL into the .db and switch off WAL before closing, so Windows can
  // actually unlink the manifest — a memory-mapped -wal/-shm otherwise keeps the
  // .db locked and the unlink fails silently (the account then never disappears).
  // From here the manifest is going away. Mark the account "deleting" so a
  // concurrent request (the 5s /api/accounts poll) can't re-open the .db and
  // re-lock it between close() and the unlink retries below.
  markDeleting(account);
  try {
    try {
      const db = openDb(account);
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      db.exec("PRAGMA journal_mode=DELETE");
    } catch {
      /* best-effort: still try to close + unlink below */
    }
    closeDb(account); // release the SQLite handle before unlinking the manifest
    const dbFile = join(MANIFESTS, `${account}.db`);
    // Windows can hold the file open for a moment after close(), so retry briefly.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      for (const suffix of [".db", ".db-wal", ".db-shm", ".json"]) {
        tryRm(join(MANIFESTS, `${account}${suffix}`));
      }
      if (!existsSync(dbFile)) return { freedBytes };
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    // Never report success while the account would still show up.
    throw new Error(`manifest for "${account}" could not be removed (file locked)`);
  } finally {
    unmarkDeleting(account);
  }
}
