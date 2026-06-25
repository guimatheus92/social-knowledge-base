/**
 * One-shot migration: imports the legacy `manifest.json` (PT, at the root) into the
 * per-account SQLite (`manifests/<conta>.db`), RECONCILING with disk (disk is the
 * source of truth for what was downloaded — fixes the drift of the sync-only-at-the-end).
 * Idempotent. Does not delete manifest.json.
 *
 * Usage:  cd app && npx tsx src/server/migrate/importManifest.ts [conta]
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
  origem?: string;
  baixado_em?: string;
  lido_em?: string | null;
  nota?: string | null;
  status?: string;
  erro?: string | null;
}
interface LegacyManifest {
  perfil?: string;
  videos?: Record<string, LegacyVideo>;
}

const ORIGINS: Origin[] = ["highlight", "reel", "story", "post"];

function mapOrigin(origem: string | undefined): Origin {
  const head = String(origem ?? "post").split(":")[0];
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
  const account = accountArg ?? manifest.perfil ?? "";
  if (!account) throw new Error("Sem conta: passe um argumento ou defina perfil no manifest.json");

  // 1. index the legacy entries by post_id (= the file stem of the key)
  const legacy = new Map<string, LegacyVideo & { key: string }>();
  for (const [key, v] of Object.entries(manifest.videos ?? {})) {
    legacy.set(basename(key, extname(key)), { ...v, key });
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
    const downloadedAt = lg?.baixado_em ?? st.mtime.toISOString();
    const status = lg?.status === "lido" || lg?.lido_em ? "read" : "downloaded";
    repo.upsertItem(account, {
      postId: m.postId,
      mediaType: m.mediaType,
      origin: m.origin,
      relPath: relToRoot(m.file),
      fileSize: st.size,
      status: status as "read" | "downloaded",
      downloadedAt,
    });
    if (lg?.lido_em) repo.markRead(account, m.postId, lg.lido_em, lg.nota ?? null);
    if (!lg) addedFromDisk += 1;
  }

  // 3. legacy entries with no file on disk: record as an error (preserve note/timestamps)
  for (const [pid, lg] of legacy) {
    if (seen.has(pid)) continue;
    missingOnDisk += 1;
    repo.upsertItem(account, {
      postId: pid,
      mediaType: "video",
      origin: mapOrigin(lg.origem),
      relPath: lg.key,
      status: "error",
      downloadedAt: lg.baixado_em ?? null,
      error: "arquivo ausente no disco",
    });
    if (lg.lido_em) repo.markRead(account, pid, lg.lido_em, lg.nota ?? null);
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
  console.log("Migração concluída:");
  console.log(`  conta:            ${r.account}`);
  console.log(`  legado (manifest): ${r.legacyCount}`);
  console.log(`  no disco:         ${r.diskCount}`);
  console.log(`  novos do disco:   ${r.addedFromDisk} (estavam no disco, faltando no manifest — drift corrigido)`);
  console.log(`  faltando no disco: ${r.missingOnDisk}`);
  console.log(`  total no SQLite:  ${r.total}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
