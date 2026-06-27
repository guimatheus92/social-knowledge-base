import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import * as repo from "@/server/db/repository";
import { ROOT } from "@/server/paths";

export const runtime = "nodejs";

/** Opens the video/image in the system's default app (there's no player in the UI). */
export async function POST(req: Request): Promise<Response> {
  if (process.platform !== "win32") {
    return Response.json({ error: "Open file only on Windows" }, { status: 501 });
  }
  let account = "";
  let postId = "";
  try {
    const b = await req.json();
    account = b?.account ?? "";
    postId = b?.postId ?? "";
  } catch {
    /* no body */
  }
  const item = account && postId ? repo.getItem(account, postId) : null;
  if (!item?.relPath) return Response.json({ error: "Item not found" }, { status: 404 });
  const abs = isAbsolute(item.relPath) ? item.relPath : join(ROOT, item.relPath);
  if (!existsSync(abs)) return Response.json({ error: "File does not exist" }, { status: 400 });
  spawn("cmd.exe", ["/c", "start", "", abs], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();
  return Response.json({ ok: true });
}
