/**
 * One-shot migration: imports the legacy `manifest.json` (PT, at the root) into the
 * per-account SQLite (`manifests/<account>.db`), RECONCILING with disk (disk is the
 * source of truth for what was downloaded — fixes the drift of the sync-only-at-the-end).
 * Idempotent. Does not delete manifest.json.
 *
 * Usage:  cd app && npx tsx src/server/migrate/importManifest.ts [account]
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { DOWNLOADS, LEGACY_MANIFEST, ROOT } from "@/server/paths";
import { mediaTypeForFile } from "@/server/engine/mediaType";
import { openDb } from "@/server/db/sqlite";
import * as repo from "@/server/db/repository";
import { TAB_ORIGIN, type MediaType, type Origin, type Tab } from "@/lib/types";

interface LegacyVideo {
  origin?: string;
  downloadedAt?: string;
  readAt?: string | null;
  note?: string | null;
  status?: string;
  error?: string | null;
}
interface LegacyManifest {
  profile?: string;
  videos?: Record<string, unknown>;
}

/** The legacy root manifest.json used Portuguese keys — read both (English-first). */
function normVideo(raw: unknown): LegacyVideo {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    origin: (r.origin ?? r.origem) as string | undefined,
    downloadedAt: (r.downloadedAt ?? r.baixado_em) as string | undefined,
    readAt: (r.readAt ?? r.lido_em ?? null) as string | null,
    note: (r.note ?? r.nota ?? null) as string | null,
    status: r.status as string | undefined,
    error: (r.error ?? r.erro ?? null) as string | null,
  };
}

const ORIGINS: Origin[] = ["highlight", "reel", "story", "post"];

function mapOrigin(origin: string | undefined): Origin {
  const head = String(origin ?? "post").split(":")[0];
  return (ORIGINS as string[]).includes(head) ? (head as Origin) : "post";
}

function relToRoot(file: string): string {
  return relative(ROOT, file).split(sep).join("/");
}

interface DiskMedia {
  file: string;
  postId: string;
  mediaType: MediaType;
  origin: Origin;
}

function* walkMedia(dir: string, accountDir: string): Generator<DiskMedia> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue; // .thumbs, .gdl-archive.sqlite3, etc.
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkMedia(full, accountDir);
      continue;
    }
    const mediaType = mediaTypeForFile(entry.name);
    if (!mediaType) continue;
    const postId = basename(entry.name, extname(entry.name));
    if (postId.includes(".")) continue; // yt-dlp fragment — ignore
    const rel = relative(accountDir, full).split(sep);
    const folder = rel.length > 1 ? rel[0] : "";
    const origin = TAB_ORIGIN[folder as Tab] ?? "post";
    yield { file: full, postId, mediaType, origin };
  }
}

export function importManifest(accountArg?: string): {
  account: string;
  legacyCount: number;
  diskCount: number;
  addedFromDisk: number;
  missingOnDisk: number;
  total: number;
} {
  const manifest: LegacyManifest = existsSync(LEGACY_MANIFEST)
    ? JSON.parse(readFileSync(LEGACY_MANIFEST, "utf-8"))
    : {};
  const account = accountArg ?? manifest.profile ?? (manifest as { perfil?: string }).perfil ?? "";
  if (!account) throw new Error("No account: pass an argument or set `profile` in manifest.json");

  // 1. index the legacy entries by post_id (= the file stem of the key)
  const legacy = new Map<string, LegacyVideo & { key: string }>();
  for (const [key, v] of Object.entries(manifest.videos ?? {})) {
    legacy.set(basename(key, extname(key)), { ...normVideo(v), key });
  }

  const accountDir = join(DOWNLOADS, account);
  const seen = new Set<string>();
  let addedFromDisk = 0;
  let missingOnDisk = 0;

  const db = openDb(account);
  db.exec("BEGIN");
  try {
  // 2. disk = truth: record every media file present
  for (const m of walkMedia(accountDir, accountDir)) {
    seen.add(m.postId);
    const lg = legacy.get(m.postId);
    const st = statSync(m.file);
    const downloadedAt = lg?.downloadedAt ?? st.mtime.toISOString();
    const status = lg?.status === "read" || lg?.status === "lido" || lg?.readAt ? "read" : "downloaded";
    repo.upsertItem(account, {
      postId: m.postId,
      mediaType: m.mediaType,
      origin: m.origin,
      relPath: relToRoot(m.file),
      fileSize: st.size,
      status: status as "read" | "downloaded",
      downloadedAt,
    });
    if (lg?.readAt) repo.markRead(account, m.postId, lg.readAt, lg.note ?? null);
    if (!lg) addedFromDisk += 1;
  }

  // 3. legacy entries with no file on disk: record as an error (preserve note/timestamps)
  for (const [pid, lg] of legacy) {
    if (seen.has(pid)) continue;
    missingOnDisk += 1;
    repo.upsertItem(account, {
      postId: pid,
      mediaType: "video",
      origin: mapOrigin(lg.origin),
      relPath: lg.key,
      status: "error",
      downloadedAt: lg.downloadedAt ?? null,
      error: "file missing on disk",
    });
    if (lg.readAt) repo.markRead(account, pid, lg.readAt, lg.note ?? null);
  }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  // 4. account + sync + export
  repo.upsertAccount({ account, savePath: accountDir });
  repo.setLastSynced(account);
  repo.exportJson(account);

  const counts = repo.getCounts(account);
  return {
    account,
    legacyCount: legacy.size,
    diskCount: seen.size,
    addedFromDisk,
    missingOnDisk,
    total: counts.total,
  };
}

function main(): void {
  const account = process.argv[2];
  const r = importManifest(account);
  console.log("Migration complete:");
  console.log(`  account:           ${r.account}`);
  console.log(`  legacy (manifest): ${r.legacyCount}`);
  console.log(`  on disk:           ${r.diskCount}`);
  console.log(`  new from disk:     ${r.addedFromDisk} (were on disk, missing from manifest — drift fixed)`);
  console.log(`  missing on disk:   ${r.missingOnDisk}`);
  console.log(`  total in SQLite:   ${r.total}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
