/** Per-account SQLite connection (`manifests/<account>.db`) via node:sqlite (Node 24+). */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { MANIFESTS, assertSafeSegment } from "@/server/paths";
import { SCHEMA } from "@/server/db/schema";

// Connection cache (single writer = Node process; WAL allows concurrent reads).
// Pinned to globalThis so Next's dev HMR reuses one cache/connection per account
// across reloads — otherwise stale duplicate connections pile up and keep the
// manifest files locked (e.g. an account delete can't unlink the .db).
const g = globalThis as typeof globalThis & {
  __skbDbCache?: Map<string, DatabaseSync>;
  __skbDeleting?: Set<string>;
};
const cache = (g.__skbDbCache ??= new Map<string, DatabaseSync>());

export function dbPath(account: string): string {
  return join(MANIFESTS, `${account}.db`);
}

export function openDb(account: string): DatabaseSync {
  assertSafeSegment(account); // never let a crafted account escape manifests/
  const existing = cache.get(account);
  if (existing) return existing;
  mkdirSync(MANIFESTS, { recursive: true });
  const db = new DatabaseSync(dbPath(account));
  db.exec(SCHEMA);
  // Idempotent column migrations: upgrade manifests created before a column
  // existed. New databases already get these from SCHEMA above.
  for (const col of [
    "estimated_total INTEGER",
    "network TEXT NOT NULL DEFAULT 'instagram'",
    "note_language TEXT",
    "category TEXT",
  ]) {
    try {
      db.exec(`ALTER TABLE account ADD COLUMN ${col}`);
    } catch {
      /* column already exists */
    }
  }
  cache.set(account, db);
  return db;
}

export function closeDb(account: string): void {
  const db = cache.get(account);
  if (db) {
    db.close();
    cache.delete(account);
  }
}

export function closeAll(): void {
  for (const db of cache.values()) db.close();
  cache.clear();
}

/**
 * Accounts currently being deleted. While an account sits here, getAccount and
 * listAccountNames pretend it's gone, so a concurrent request (e.g. the 5s
 * /api/accounts poll) can't re-open its manifest mid-delete and re-lock the file
 * between close() and the unlink.
 */
const deleting = (g.__skbDeleting ??= new Set<string>());
export function markDeleting(account: string): void {
  deleting.add(account);
}
export function unmarkDeleting(account: string): void {
  deleting.delete(account);
}
export function isDeleting(account: string): boolean {
  return deleting.has(account);
}
