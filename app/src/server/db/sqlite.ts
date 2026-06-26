/** Per-account SQLite connection (`manifests/<conta>.db`) via node:sqlite (Node 24+). */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { MANIFESTS, assertSafeSegment } from "@/server/paths";
import { SCHEMA } from "@/server/db/schema";

// Connection cache (single writer = Node process; WAL allows concurrent reads).
const cache = new Map<string, DatabaseSync>();

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
