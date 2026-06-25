import { join } from "node:path";
import { z } from "zod";
import * as repo from "@/server/db/repository";
import { DOWNLOADS } from "@/server/paths";
import { jobManager } from "@/server/engine/jobManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  const accounts = repo.listAccountNames().map((name) => ({
    ...repo.getAccount(name),
    counts: repo.getCounts(name),
    job: jobManager.get(name),
  }));
  return Response.json({ accounts });
}

const NewAccount = z.object({
  account: z
    .string()
    .min(1)
    .transform((s) => s.trim().replace(/^@/, "")),
  savePath: z.string().optional(),
  cookiesPath: z.string().optional(),
  media: z.array(z.enum(["image", "video"])).min(1).optional(),
  tabs: z.array(z.enum(["highlights", "reels", "stories", "posts"])).optional(),
});

export async function POST(req: Request): Promise<Response> {
  let body;
  try {
    body = NewAccount.parse(await req.json());
  } catch (e) {
    return Response.json({ error: "Corpo inválido", detail: String(e) }, { status: 400 });
  }
  repo.upsertAccount({
    account: body.account,
    savePath: body.savePath || join(DOWNLOADS, body.account),
    cookiesPath: body.cookiesPath ?? null,
    mediaTypes: body.media,
    tabs: body.tabs,
  });
  return Response.json({
    ...repo.getAccount(body.account),
    counts: repo.getCounts(body.account),
    job: jobManager.get(body.account),
  });
}
