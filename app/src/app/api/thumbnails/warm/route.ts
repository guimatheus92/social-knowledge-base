import { warmAllThumbnails } from "@/server/engine/thumbnails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fire-and-forget: warm the poster cache for any already-downloaded video that
 *  lacks one (the gallery calls this once on open). Returns immediately. */
export function POST(): Response {
  // Defer so the scan/generation never blocks this response (or the event loop).
  setImmediate(() => void warmAllThumbnails());
  return Response.json({ ok: true });
}
