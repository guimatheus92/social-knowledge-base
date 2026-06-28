import * as repo from "@/server/db/repository";
import type { ItemStatus, MediaType, Origin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every post_id matching a filter — backs the gallery's "select all". */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  const sp = new URL(req.url).searchParams;
  const ids = repo.listItemIds(account, {
    q: sp.get("q") || undefined,
    status: (sp.get("status") as ItemStatus) || undefined,
    media: (sp.get("media") as MediaType) || undefined,
    origin: (sp.get("origin") as Origin) || undefined,
  });
  return Response.json({ ids });
}
