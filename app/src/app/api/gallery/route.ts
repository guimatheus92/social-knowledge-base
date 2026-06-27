import { listGallery } from "@/server/engine/gallery";
import type { Origin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGINS = ["highlight", "reel", "story", "post"];

/** Global media listing across every profile, with filters + sort + paging. */
export async function GET(req: Request): Promise<Response> {
  try {
    const sp = new URL(req.url).searchParams;
    const sort = sp.get("sort");
    const media = sp.get("media");
    const origin = sp.get("origin");
    return Response.json(
      listGallery({
        q: sp.get("q") || undefined,
        profile: sp.get("profile") || undefined,
        network: sp.get("network") || undefined,
        category: sp.get("category") || undefined,
        media: media === "image" || media === "video" ? media : undefined,
        origin: origin && ORIGINS.includes(origin) ? (origin as Origin) : undefined,
        sort: sort === "size" || sort === "duration" ? sort : "date",
        order: sp.get("order") === "asc" ? "asc" : "desc",
        limit: Number(sp.get("limit") ?? 48) || 48,
        offset: Number(sp.get("offset") ?? 0) || 0,
      }),
    );
  } catch (e) {
    // e.g. a crafted ?profile that fails assertSafeSegment — reject as bad input.
    return Response.json({ error: (e as Error).message || "invalid request" }, { status: 400 });
  }
}
