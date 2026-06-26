import { readFile } from "node:fs/promises";
import * as repo from "@/server/db/repository";
import { generateAndRecord, notePathFor } from "@/server/engine/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// One Claude session can take a minute or two — let it run.
export const maxDuration = 600;

/** Generates the curated note for one video via headless Claude Code. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ account: string; postId: string }> },
): Promise<Response> {
  const { account, postId } = await params;
  if (!repo.getItem(account, postId)) {
    return Response.json({ ok: false, error: "item não encontrado" }, { status: 404 });
  }
  const r = await generateAndRecord(account, postId);
  if (!r.ok) return Response.json({ ok: false, error: r.error }, { status: 502 });
  let note: string | null = null;
  try {
    note = await readFile(notePathFor(account, postId), "utf-8");
  } catch {
    /* note written but unreadable — unlikely */
  }
  return Response.json({ ok: true, note });
}
