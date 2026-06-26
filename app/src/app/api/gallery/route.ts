import { listGallery } from "@/server/engine/gallery";
import type { MediaType, Origin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Global media listing across every profile, with filters + sort + paging. */
export async function GET(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams;
  const sort = sp.get("sort");
  return Response.json(
    listGallery({
      q: sp.get("q") || undefined,
      profile: sp.get("profile") || undefined,
      network: sp.get("network") || undefined,
      media: (sp.get("media") as MediaType) || undefined,
      origin: (sp.get("origin") as Origin) || undefined,
      sort: sort === "size" || sort === "duration" ? sort : "date",
      order: sp.get("order") === "asc" ? "asc" : "desc",
      limit: Number(sp.get("limit") ?? 48) || 48,
      offset: Number(sp.get("offset") ?? 0) || 0,
    }),
  );
}
