import { existsSync } from "node:fs";
import { z } from "zod";
import { jobManager } from "@/server/engine/jobManager";

export const runtime = "nodejs";

const Body = z.object({
  account: z.string().min(1),
  cookiesPath: z.string().min(1),
  tabs: z.array(z.enum(["highlights", "reels", "stories", "posts"])).optional(),
  media: z.array(z.enum(["image", "video"])).min(1).optional(),
  parallelism: z.number().int().min(1).max(4).optional(),
  range: z.string().optional(),
  mode: z.enum(["full", "incremental", "count"]).optional(),
});

export async function POST(req: Request): Promise<Response> {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "Corpo inválido" }, { status: 400 });
  }
  if (!existsSync(parsed.cookiesPath)) {
    return Response.json({ error: `cookies.txt não encontrado: ${parsed.cookiesPath}` }, { status: 400 });
  }
  const snapshot = jobManager.start(parsed);
  return Response.json(snapshot);
}

export function GET(): Response {
  return Response.json({ jobs: jobManager.list() });
}
