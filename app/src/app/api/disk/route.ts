import { statfs } from "node:fs/promises";
import * as repo from "@/server/db/repository";
import { DOWNLOADS } from "@/server/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  let downloaded = 0;
  for (const a of repo.listAccountNames()) downloaded += repo.getCounts(a).bytesTotal;

  let free = 0;
  let total = 0;
  try {
    const s = await statfs(DOWNLOADS);
    free = Number(s.bavail) * Number(s.bsize);
    total = Number(s.blocks) * Number(s.bsize);
  } catch {
    /* statfs unavailable */
  }
  return Response.json({ downloaded, free, total });
}
