import { searchRag } from "@/server/engine/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RAG search across transcripts + curated notes (shells scripts/query.py). */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const k = Math.min(20, Math.max(1, Number(url.searchParams.get("k")) || 10));
  if (!q) return Response.json({ hits: [] });
  try {
    const hits = await searchRag(q, k);
    return Response.json({ hits });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
