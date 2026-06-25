import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import * as repo from "@/server/db/repository";
import { ROOT } from "@/server/paths";
import { ensureThumb, thumbPathFor } from "@/server/engine/thumbnails";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ account: string; postId: string }> },
): Promise<Response> {
  const { account, postId } = await params;
  if (req.signal.aborted) return new Response(null, { status: 499 });
  const item = repo.getItem(account, postId);
  if (!item?.relPath) return new Response("not found", { status: 404 });

  const abs = isAbsolute(item.relPath) ? item.relPath : join(ROOT, item.relPath);
  const headers = { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" };

  // Image: serve the file itself.
  if (item.mediaType === "image") {
    try {
      const buf = await readFile(abs);
      return new Response(new Uint8Array(buf), { headers });
    } catch {
      return new Response("not found", { status: 404 });
    }
  }

  // Video: poster via ffmpeg (cached).
  const acc = repo.getAccount(account);
  const saveDir = acc?.savePath ?? join(ROOT, "downloads", account);
  const thumb = thumbPathFor(saveDir, postId);
  const ok = await ensureThumb(abs, thumb, req.signal);
  if (!ok) return new Response("no thumb", { status: 404 });
  try {
    const buf = await readFile(thumb);
    return new Response(new Uint8Array(buf), { headers });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
