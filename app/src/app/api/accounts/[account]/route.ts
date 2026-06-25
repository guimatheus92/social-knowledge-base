import { z } from "zod";
import * as repo from "@/server/db/repository";
import { jobManager } from "@/server/engine/jobManager";
import type { MediaType, Tab } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function summary(account: string) {
  const a = repo.getAccount(account);
  if (!a) return null;
  return { ...a, counts: repo.getCounts(account), job: jobManager.get(account) };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  const s = summary(account);
  return s ? Response.json(s) : Response.json({ error: "conta não encontrada" }, { status: 404 });
}

const Patch = z.object({
  media: z.array(z.enum(["image", "video"])).min(1).optional(),
  tabs: z.array(z.enum(["highlights", "reels", "stories", "posts"])).optional(),
  savePath: z.string().optional(),
  parallelism: z.number().int().min(1).max(4).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  let body;
  try {
    body = Patch.parse(await req.json());
  } catch (e) {
    return Response.json({ error: "Corpo inválido", detail: String(e) }, { status: 400 });
  }
  repo.updateAccountSettings(account, {
    mediaTypes: body.media as MediaType[] | undefined,
    tabs: body.tabs as Tab[] | undefined,
    savePath: body.savePath,
    parallelism: body.parallelism,
  });
  const s = summary(account);
  return s ? Response.json(s) : Response.json({ error: "conta não encontrada" }, { status: 404 });
}
