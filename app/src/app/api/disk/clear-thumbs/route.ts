import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import * as repo from "@/server/db/repository";

export const runtime = "nodejs";

/** Clears the thumbnail caches (.thumbs) — regenerable on demand. */
export async function POST(): Promise<Response> {
  let cleared = 0;
  for (const a of repo.listAccountNames()) {
    const acc = repo.getAccount(a);
    if (!acc?.savePath) continue;
    const dir = join(acc.savePath, ".thumbs");
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true });
      cleared += 1;
    }
  }
  return Response.json({ ok: true, cleared });
}
