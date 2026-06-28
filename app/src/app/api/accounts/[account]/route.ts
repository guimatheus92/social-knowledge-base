import { z } from "zod";
import * as repo from "@/server/db/repository";
import { jobManager } from "@/server/engine/jobManager";
import { NOTE_LANG_CODES } from "@/lib/languages";
import { capitalize } from "@/lib/format";
import { deleteAccount } from "@/server/engine/deletion";
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
  return s ? Response.json(s) : Response.json({ error: "account not found" }, { status: 404 });
}

const Patch = z.object({
  media: z.array(z.enum(["image", "video"])).min(1).optional(),
  tabs: z.array(z.enum(["highlights", "reels", "stories", "posts"])).optional(),
  savePath: z.string().optional(),
  parallelism: z.number().int().min(1).max(4).optional(),
  noteLanguage: z.string().refine((v) => NOTE_LANG_CODES.includes(v), "unsupported note language").optional(),
  category: z.string().max(40).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  let body;
  try {
    body = Patch.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  repo.updateAccountSettings(account, {
    mediaTypes: body.media as MediaType[] | undefined,
    tabs: body.tabs as Tab[] | undefined,
    savePath: body.savePath,
    parallelism: body.parallelism,
    noteLanguage: body.noteLanguage,
    category: body.category === undefined ? undefined : capitalize(body.category.trim()),
  });
  const s = summary(account);
  return s ? Response.json(s) : Response.json({ error: "account not found" }, { status: 404 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  if (!repo.getAccount(account)) {
    return Response.json({ error: "account not found" }, { status: 404 });
  }
  let deleteFiles = false;
  try {
    deleteFiles = (await req.json())?.deleteFiles === true;
  } catch {
    /* no body → keep the files on disk */
  }
  try {
    return Response.json({ ok: true, ...(await deleteAccount(account, { deleteFiles })) });
  } catch (e) {
    return Response.json({ error: (e as Error).message || "delete failed" }, { status: 400 });
  }
}
