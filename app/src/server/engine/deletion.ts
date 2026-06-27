/**
 * Deletes media (files + manifest rows) and whole accounts. File removal is
 * best-effort: a missing or locked file never aborts the rest of the operation.
 */
import { rmSync, existsSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join } from "node:path";
import { ROOT, MANIFESTS } from "@/server/paths";
import { deleteItemRows, getAccount, getCounts, getItem } from "@/server/db/repository";
import { closeDb } from "@/server/db/sqlite";
import { thumbPathFor } from "@/server/engine/thumbnails";
import { jobManager } from "@/server/engine/jobManager";

function tryRm(p: string): void {
  try {
    rmSync(p, { force: true });
  } catch {
    /* best-effort: a missing/locked file shouldn't abort the rest */
  }
}

/** Delete media items: their files (video + sidecars + thumb + note) and DB rows. */
export function deleteMediaItems(
  account: string,
  postIds: string[],
): { deleted: number; freedBytes: number } {
  const acc = getAccount(account);
  const saveDir = acc?.savePath ?? join(ROOT, "downloads", account);
  let freedBytes = 0;
  let deleted = 0;
  for (const postId of postIds) {
    const it = getItem(account, postId);
    if (!it) continue;
    if (it.relPath) {
      const abs = isAbsolute(it.relPath) ? it.relPath : join(ROOT, it.relPath);
      if (existsSync(abs)) {
        try {
          freedBytes += statSync(abs).size;
        } catch {
          /* size is best-effort */
        }
      }
      tryRm(abs);
      // transcript .vtt sidecar lives next to the video
      tryRm(join(dirname(abs), `${basename(abs, extname(abs))}.vtt`));
    }
    tryRm(join(saveDir, "transcripts", `${postId}.txt`));
    tryRm(join(saveDir, "transcripts", `${postId}.json`));
    tryRm(thumbPathFor(saveDir, postId));
    tryRm(join(ROOT, "notes", account, "videos", `${postId}.md`));
    tryRm(join(ROOT, "notes", account, "videos", `${postId}.meta.json`));
    deleted += 1;
  }
  deleteItemRows(account, postIds);
  return { deleted, freedBytes };
}

/** Delete a whole account: stop its job, drop its manifest, optionally its files. */
export function deleteAccount(
  account: string,
  opts: { deleteFiles?: boolean } = {},
): { freedBytes: number } {
  jobManager.stop(account);
  const acc = getAccount(account);
  const saveDir = acc?.savePath ?? join(ROOT, "downloads", account);
  let freedBytes = 0;
  if (opts.deleteFiles) {
    freedBytes = getCounts(account).bytesTotal; // read before dropping the DB
    if (existsSync(saveDir)) {
      try {
        rmSync(saveDir, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    }
  }
  closeDb(account); // release the SQLite handle before unlinking the manifest
  for (const suffix of [".db", ".db-wal", ".db-shm", ".json"]) {
    tryRm(join(MANIFESTS, `${account}${suffix}`));
  }
  return { freedBytes };
}
