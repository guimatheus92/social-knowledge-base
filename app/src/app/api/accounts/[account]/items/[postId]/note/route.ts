import { readFile } from "node:fs/promises";
import * as repo from "@/server/db/repository";
import { generateAndRecord, notePathFor } from "@/server/engine/notes";
import { NOTE_LANG_CODES } from "@/lib/languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// One Claude session can take a minute or two — let it run.
export const maxDuration = 600;

/** Generates the curated note for one video via headless Claude Code. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ account: string; postId: string }> },
): Promise<Response> {
  const { account, postId } = await params;
  if (!repo.getItem(account, postId)) {
    return Response.json({ ok: false, error: "item not found" }, { status: 404 });
  }
  // Optional per-video language override; ignored unless it's a known code.
  let language: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.language === "string" && NOTE_LANG_CODES.includes(body.language)) {
      language = body.language;
    }
  } catch {
    /* no body = use the account/global default */
  }
  const r = await generateAndRecord(account, postId, undefined, language);
  if (!r.ok) return Response.json({ ok: false, error: r.error }, { status: 502 });
  let note: string | null = null;
  try {
    note = await readFile(notePathFor(account, postId), "utf-8");
  } catch {
    /* note written but unreadable — unlikely */
  }
  return Response.json({ ok: true, note });
}
