import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export const runtime = "nodejs";

/** Opens the folder in Windows Explorer (local app). */
export async function POST(req: Request): Promise<Response> {
  if (process.platform !== "win32") {
    return Response.json({ error: "Open folder only on Windows" }, { status: 501 });
  }
  let path = "";
  try {
    path = (await req.json())?.path ?? "";
  } catch {
    /* no body */
  }
  if (!path || !existsSync(path)) {
    return Response.json({ error: "Folder not found" }, { status: 400 });
  }
  spawn("explorer.exe", [path], { detached: true, stdio: "ignore" }).unref();
  return Response.json({ ok: true });
}
