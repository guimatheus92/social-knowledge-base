import * as repo from "@/server/db/repository";
import type { ItemStatus, MediaType, Origin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(500, Number(sp.get("limit") ?? 100) || 100);
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const items = repo.listItems(account, {
    q: sp.get("q") || undefined,
    status: (sp.get("status") as ItemStatus) || undefined,
    media: (sp.get("media") as MediaType) || undefined,
    origin: (sp.get("origin") as Origin) || undefined,
    sort: sp.get("sort") === "size" ? "size" : "date",
    limit,
    offset,
  });
  return Response.json({ items, limit, offset });
}
