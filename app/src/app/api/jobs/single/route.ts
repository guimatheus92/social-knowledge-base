import { existsSync } from "node:fs";
import { z } from "zod";
import { jobManager } from "@/server/engine/jobManager";
import { providerForUrl } from "@/server/providers";

export const runtime = "nodejs";

const Body = z.object({
  url: z
    .string()
    .url()
    .refine((u) => providerForUrl(u) !== null, "Rede não suportada (Instagram, TikTok…)"),
  cookiesPath: z.string().min(1),
  media: z.array(z.enum(["image", "video"])).min(1).optional(),
});

export async function POST(req: Request): Promise<Response> {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return Response.json({ error: "Corpo inválido", detail: String(e) }, { status: 400 });
  }
  if (!existsSync(parsed.cookiesPath)) {
    return Response.json({ error: `cookies.txt não encontrado: ${parsed.cookiesPath}` }, { status: 400 });
  }
  try {
    const snapshot = await jobManager.startSingle(parsed);
    return Response.json(snapshot);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
