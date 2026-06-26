import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import * as repo from "@/server/db/repository";
import { peekNew } from "@/server/engine/galleryDl";
import { getProvider } from "@/server/providers";
import { DOWNLOADS } from "@/server/paths";
import type { Tab } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({ cookiesPath: z.string().min(1) });

/** Delta preview for "New posts": how many of the top items aren't downloaded yet. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  const acc = repo.getAccount(account);
  if (!acc) return Response.json({ error: "account not found" }, { status: 404 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  if (!existsSync(body.cookiesPath)) {
    return Response.json({ error: `cookies.txt not found: ${body.cookiesPath}` }, { status: 400 });
  }

  // Peek the main feed (reels) when available, else the first enabled tab.
  const tab: Tab = acc.tabs.includes("reels") ? "reels" : acc.tabs[0] ?? "reels";
  try {
    const r = await peekNew({
      account,
      saveDir: acc.savePath || join(DOWNLOADS, account),
      cookiesPath: body.cookiesPath,
      tab,
      count: 12,
      provider: getProvider(acc.network),
    });
    return Response.json({ ...r, tab });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
