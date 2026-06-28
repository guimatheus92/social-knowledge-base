import { existsSync } from "node:fs";
import * as repo from "@/server/db/repository";
import { dbPath } from "@/server/db/sqlite";
import { assertSafeSegment } from "@/server/paths";
import type { ItemStatus, MediaType, Origin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every post_id matching a filter — backs the gallery's "select all". */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  try {
    assertSafeSegment(account);
    // Guard before any openDb: a missing/misspelled account would otherwise have
    // its manifest created on read (openDb materializes the .db), leaving a
    // phantom account behind. Check the file exists first, then the row.
    if (!existsSync(dbPath(account)) || !repo.getAccount(account)) {
      return Response.json({ error: "account not found" }, { status: 404 });
    }
    const sp = new URL(req.url).searchParams;
    const ids = repo.listItemIds(account, {
      q: sp.get("q") || undefined,
      status: (sp.get("status") as ItemStatus) || undefined,
      media: (sp.get("media") as MediaType) || undefined,
      origin: (sp.get("origin") as Origin) || undefined,
    });
    return Response.json({ ids });
  } catch (e) {
    return Response.json({ error: (e as Error).message || "list failed" }, { status: 400 });
  }
}
