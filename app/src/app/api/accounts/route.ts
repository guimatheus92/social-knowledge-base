import { join } from "node:path";
import { z } from "zod";
import * as repo from "@/server/db/repository";
import { DOWNLOADS } from "@/server/paths";
import { capitalize } from "@/lib/format";
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
  network: z.string().optional(),
  category: z.string().max(40).optional(),
});

export async function POST(req: Request): Promise<Response> {
  let body;
  try {
    body = NewAccount.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  repo.upsertAccount({
    account: body.account,
    savePath: body.savePath || join(DOWNLOADS, body.account),
    cookiesPath: body.cookiesPath ?? null,
    mediaTypes: body.media,
    tabs: body.tabs,
    network: body.network,
    category: capitalize((body.category ?? "").trim()) || undefined,
  });
  return Response.json({
    ...repo.getAccount(body.account),
    counts: repo.getCounts(body.account),
    job: jobManager.get(body.account),
  });
}
