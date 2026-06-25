import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export const runtime = "nodejs";

/** Abre a pasta no Explorer do Windows (app local). */
export async function POST(req: Request): Promise<Response> {
  if (process.platform !== "win32") {
    return Response.json({ error: "Abrir pasta só no Windows" }, { status: 501 });
  }
  let path = "";
  try {
    path = (await req.json())?.path ?? "";
  } catch {
    /* sem corpo */
  }
  if (!path || !existsSync(path)) {
    return Response.json({ error: "Pasta não encontrada" }, { status: 400 });
  }
  spawn("explorer.exe", [path], { detached: true, stdio: "ignore" }).unref();
  return Response.json({ ok: true });
}
