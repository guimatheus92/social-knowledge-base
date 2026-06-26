import * as repo from "@/server/db/repository";
import { readVideoKnowledge } from "@/server/engine/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A single video's knowledge: metadata + curated note + transcript. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ account: string; postId: string }> },
): Promise<Response> {
  const { account, postId } = await params;
  const item = repo.getItem(account, postId);
  if (!item) return Response.json({ error: "item não encontrado" }, { status: 404 });
  const { note, transcript } = await readVideoKnowledge(account, postId);
  return Response.json({ item, note, transcript });
}
