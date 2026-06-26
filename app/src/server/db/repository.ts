/** Repository: all SQLite manifest queries (single writer = Node). */
import { writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MANIFESTS } from "@/server/paths";
import { openDb } from "@/server/db/sqlite";
import type {
  Account,
  Counts,
  Item,
  ItemStatus,
  MediaType,
  Origin,
  Tab,
} from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function num(v: unknown): number {
  return typeof v === "bigint" ? Number(v) : (v as number) ?? 0;
}

function rowToItem(r: any): Item {
  return {
    postId: r.post_id,
    mediaType: r.media_type,
    origin: r.origin,
    relPath: r.rel_path ?? null,
    fileSize: r.file_size == null ? null : num(r.file_size),
    durationS: r.duration_s ?? null,
    width: r.width ?? null,
    height: r.height ?? null,
    caption: r.caption ?? null,
    postedAt: r.posted_at ?? null,
    thumbPath: r.thumb_path ?? null,
    status: r.status,
    retries: num(r.retries),
    downloadedAt: r.downloaded_at ?? null,
    readAt: r.read_at ?? null,
    notePath: r.note_path ?? null,
    error: r.error ?? null,
    downloadMs: r.download_ms == null ? null : num(r.download_ms),
  };
}

function rowToAccount(r: any): Account {
  return {
    account: r.account,
    savePath: r.save_path,
    cookiesPath: r.cookies_path ?? null,
    mediaTypes: String(r.media_types).split(",").filter(Boolean) as MediaType[],
    tabs: String(r.tabs).split(",").filter(Boolean) as Tab[],
    parallelism: num(r.parallelism),
    network: r.network ?? "instagram",
    elapsedSeconds: num(r.elapsed_seconds),
    lastSyncedAt: r.last_synced_at ?? null,
    estimatedTotal: r.estimated_total == null ? null : num(r.estimated_total),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function setEstimatedTotal(account: string, total: number): void {
  openDb(account)
    .prepare("UPDATE account SET estimated_total = ?, updated_at = ? WHERE account = ?")
    .run(total, new Date().toISOString(), account);
}

export function getAccount(account: string): Account | null {
  const db = openDb(account);
  const r = db.prepare("SELECT * FROM account WHERE account = ?").get(account);
  return r ? rowToAccount(r) : null;
}

export interface AccountInput {
  account: string;
  savePath: string;
  cookiesPath?: string | null;
  mediaTypes?: MediaType[];
  tabs?: Tab[];
  parallelism?: number;
  /** Source network provider id; set once at creation, defaults to instagram. */
  network?: string;
}

export function upsertAccount(a: AccountInput): void {
  const db = openDb(a.account);
  const now = new Date().toISOString();
  // `network` is identity: set once at creation, never overwritten on conflict.
  db.prepare(
    `INSERT INTO account (account, save_path, cookies_path, media_types, tabs, parallelism, network, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(account) DO UPDATE SET
       save_path=excluded.save_path,
       cookies_path=COALESCE(excluded.cookies_path, account.cookies_path),
       media_types=excluded.media_types,
       tabs=excluded.tabs,
       parallelism=excluded.parallelism,
       updated_at=excluded.updated_at`,
  ).run(
    a.account,
    a.savePath,
    a.cookiesPath ?? null,
    (a.mediaTypes ?? ["video"]).join(","),
    (a.tabs ?? ["highlights", "reels", "stories"]).join(","),
    a.parallelism ?? 2,
    a.network ?? "instagram",
    now,
    now,
  );
}

export function updateAccountSettings(
  account: string,
  p: { mediaTypes?: MediaType[]; tabs?: Tab[]; savePath?: string; parallelism?: number },
): void {
  const sets: string[] = [];
  const vals: (string | number)[] = [];
  if (p.mediaTypes) {
    sets.push("media_types = ?");
    vals.push(p.mediaTypes.join(","));
  }
  if (p.tabs) {
    sets.push("tabs = ?");
    vals.push(p.tabs.join(","));
  }
  if (p.savePath) {
    sets.push("save_path = ?");
    vals.push(p.savePath);
  }
  if (p.parallelism != null) {
    sets.push("parallelism = ?");
    vals.push(p.parallelism);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  vals.push(new Date().toISOString());
  vals.push(account);
  openDb(account)
    .prepare(`UPDATE account SET ${sets.join(", ")} WHERE account = ?`)
    .run(...vals);
}

export function setLastSynced(account: string, iso = new Date().toISOString()): void {
  openDb(account)
    .prepare("UPDATE account SET last_synced_at = ?, updated_at = ? WHERE account = ?")
    .run(iso, new Date().toISOString(), account);
}

export function addElapsed(account: string, seconds: number): void {
  openDb(account)
    .prepare("UPDATE account SET elapsed_seconds = elapsed_seconds + ?, updated_at = ? WHERE account = ?")
    .run(seconds, new Date().toISOString(), account);
}

export interface ItemInput {
  postId: string;
  mediaType: MediaType;
  origin: Origin;
  relPath?: string | null;
  fileSize?: number | null;
  durationS?: number | null;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  postedAt?: string | null;
  status?: ItemStatus;
  downloadedAt?: string | null;
  downloadMs?: number | null;
  error?: string | null;
}

/**
 * Inserts/updates an item by post_id. Preserves the reading state
 * (read/reading) and the original downloaded_at; the rest is merged with COALESCE.
 */
export function upsertItem(account: string, it: ItemInput): void {
  openDb(account)
    .prepare(
      `INSERT INTO item
         (post_id, media_type, origin, rel_path, file_size, duration_s, width, height,
          caption, posted_at, status, downloaded_at, download_ms, error)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(post_id) DO UPDATE SET
         media_type=excluded.media_type,
         origin=excluded.origin,
         rel_path=COALESCE(excluded.rel_path, item.rel_path),
         file_size=COALESCE(excluded.file_size, item.file_size),
         duration_s=COALESCE(excluded.duration_s, item.duration_s),
         width=COALESCE(excluded.width, item.width),
         height=COALESCE(excluded.height, item.height),
         caption=COALESCE(excluded.caption, item.caption),
         posted_at=COALESCE(excluded.posted_at, item.posted_at),
         downloaded_at=COALESCE(item.downloaded_at, excluded.downloaded_at),
         download_ms=COALESCE(excluded.download_ms, item.download_ms),
         error=excluded.error,
         status=CASE WHEN item.status IN ('read','reading') THEN item.status ELSE excluded.status END`,
    )
    .run(
      it.postId,
      it.mediaType,
      it.origin,
      it.relPath ?? null,
      it.fileSize ?? null,
      it.durationS ?? null,
      it.width ?? null,
      it.height ?? null,
      it.caption ?? null,
      it.postedAt ?? null,
      it.status ?? "downloaded",
      it.downloadedAt ?? null,
      it.downloadMs ?? null,
      it.error ?? null,
    );
}

export function setThumb(account: string, postId: string, thumbPath: string): void {
  openDb(account)
    .prepare("UPDATE item SET thumb_path = ? WHERE post_id = ?")
    .run(thumbPath, postId);
}

export function getItem(account: string, postId: string): Item | null {
  const r = openDb(account).prepare("SELECT * FROM item WHERE post_id = ?").get(postId);
  return r ? rowToItem(r) : null;
}

export function markRead(
  account: string,
  postId: string,
  readAt: string,
  notePath: string | null,
): void {
  openDb(account)
    .prepare("UPDATE item SET status='read', read_at=?, note_path=? WHERE post_id=?")
    .run(readAt, notePath, postId);
}

export function getCounts(account: string): Counts {
  const rows = openDb(account)
    .prepare(
      `SELECT media_type, status, origin, COUNT(*) n, COALESCE(SUM(file_size),0) bytes
       FROM item GROUP BY media_type, status, origin`,
    )
    .all() as any[];
  const counts: Counts = {
    total: 0,
    byMedia: { image: 0, video: 0 },
    bytesByMedia: { image: 0, video: 0 },
    byStatus: {},
    byOrigin: {},
    bytesTotal: 0,
    downloaded: 0,
    unnotedVideos: 0,
  };
  for (const r of rows) {
    const n = num(r.n);
    const bytes = num(r.bytes);
    counts.total += n;
    counts.byMedia[r.media_type as MediaType] += n;
    counts.bytesByMedia[r.media_type as MediaType] += bytes;
    counts.byStatus[r.status] = (counts.byStatus[r.status] ?? 0) + n;
    counts.byOrigin[r.origin] = (counts.byOrigin[r.origin] ?? 0) + n;
    counts.bytesTotal += bytes;
    if (r.status === "downloaded" || r.status === "reading" || r.status === "read") {
      counts.downloaded += n;
    }
    // A video is "unnoted" once downloaded but not yet read (= no note written).
    if (r.media_type === "video" && r.status === "downloaded") {
      counts.unnotedVideos += n;
    }
  }
  return counts;
}

export interface ListOpts {
  status?: ItemStatus;
  media?: MediaType;
  origin?: Origin;
  q?: string;
  sort?: "date" | "size";
  limit?: number;
  offset?: number;
}

export function listItems(account: string, opts: ListOpts = {}): Item[] {
  const where: string[] = [];
  const params: any[] = [];
  if (opts.status) {
    where.push("status = ?");
    params.push(opts.status);
  }
  if (opts.media) {
    where.push("media_type = ?");
    params.push(opts.media);
  }
  if (opts.origin) {
    where.push("origin = ?");
    params.push(opts.origin);
  }
  if (opts.q) {
    where.push("(caption LIKE ? OR post_id LIKE ?)");
    params.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  // posted_at is not captured yet; IG IDs are chronological → order by id.
  const order = opts.sort === "size" ? "file_size DESC" : "CAST(post_id AS INTEGER) DESC";
  const sql = `SELECT * FROM item ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order} NULLS LAST LIMIT ? OFFSET ?`;
  params.push(opts.limit ?? 100, opts.offset ?? 0);
  return (openDb(account).prepare(sql).all(...params) as any[]).map(rowToItem);
}

/** Names of existing accounts (scans manifests/*.db). */
export function listAccountNames(): string[] {
  if (!existsSync(MANIFESTS)) return [];
  return readdirSync(MANIFESTS)
    .filter((f) => f.endsWith(".db"))
    .map((f) => f.slice(0, -3));
}

/** Versionable export `manifests/<conta>.json` (replaces the root manifest.json). */
export function exportJson(account: string): string {
  const db = openDb(account);
  const acc = getAccount(account);
  const items = db.prepare("SELECT * FROM item ORDER BY post_id").all() as any[];
  const videos: Record<string, unknown> = {};
  for (const r of items) {
    videos[r.post_id] = {
      post_id: r.post_id,
      media_type: r.media_type,
      origin: r.origin,
      file: r.rel_path,
      file_size: r.file_size == null ? null : num(r.file_size),
      caption: r.caption,
      posted_at: r.posted_at,
      status: r.status,
      downloaded_at: r.downloaded_at,
      read_at: r.read_at,
      note: r.note_path,
      error: r.error,
    };
  }
  const out = {
    account,
    save_path: acc?.savePath ?? null,
    last_synced_at: acc?.lastSyncedAt ?? null,
    elapsed_seconds: acc?.elapsedSeconds ?? 0,
    counts: getCounts(account),
    videos,
  };
  const path = join(MANIFESTS, `${account}.json`);
  writeFileSync(path, JSON.stringify(out, null, 2) + "\n", "utf-8");
  return path;
}
