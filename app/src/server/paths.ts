/**
 * Resolve the repo root (parent of app/) so we can locate downloads/,
 * manifests/ and the legacy manifest.json — works both under `next dev`
 * (cwd = app/) and when run via `tsx`/`node` from the repo root.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

function findRepoRoot(start: string = process.cwd()): string {
  if (process.env.SKB_ROOT) return resolve(process.env.SKB_ROOT);
  let dir = resolve(start);
  for (let i = 0; i < 10; i += 1) {
    // Repo markers (not the app/): scripts + prompts, or the legacy manifest.
    if (existsSync(join(dir, "scripts")) && existsSync(join(dir, "prompts"))) return dir;
    if (existsSync(join(dir, "manifest.json")) && existsSync(join(dir, ".mcp.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: if we're inside app/, go up one level.
  const base = resolve(start);
  return base.endsWith(`${sep}app`) ? dirname(base) : base;
}

export const ROOT = findRepoRoot();
export const DOWNLOADS = join(ROOT, "downloads");
export const MANIFESTS = join(ROOT, "manifests");
export const LEGACY_MANIFEST = join(ROOT, "manifest.json");
export const MCP_CONFIG = join(ROOT, ".mcp.json");
