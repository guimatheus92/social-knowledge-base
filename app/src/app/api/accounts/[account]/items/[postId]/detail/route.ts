import * as repo from "@/server/db/repository";
import { readVideoKnowledge } from "@/server/engine/knowledge";
import { resolveNoteLanguage } from "@/server/engine/notes";
import { getProvider } from "@/server/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A single video's knowledge: metadata + curated note + transcript. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ account: string; postId: string }> },
): Promise<Response> {
  const { account, postId } = await params;
  const item = repo.getItem(account, postId);
  if (!item) return Response.json({ error: "item not found" }, { status: 404 });
  const { note, transcript, noteMeta } = await readVideoKnowledge(account, postId);
  const acc = repo.getAccount(account);
  const webUrl = acc ? getProvider(acc.network).webUrl(account, postId, item.origin) : null;
  const noteLanguage = resolveNoteLanguage(account);
  return Response.json({ item, note, transcript, webUrl, noteMeta, noteLanguage });
}
