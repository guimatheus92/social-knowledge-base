import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

export const runtime = "nodejs";

const Body = z.object({ path: z.string().min(1) });

/**
 * Reads the Netscape cookies.txt locally and checks the Instagram `sessionid`
 * cookie's own expiry. No network call — honest about what it can know offline:
 * "valid" = a sessionid is present and hasn't expired by its own timestamp
 * (a live revoke is still caught at download time via the login-redirect probe).
 */
export async function POST(req: Request): Promise<Response> {
  let path: string;
  try {
    path = Body.parse(await req.json()).path;
  } catch {
    return Response.json({ status: "unknown", reason: "bad-request" });
  }
  if (!existsSync(path)) return Response.json({ status: "unknown", reason: "missing" });

  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch {
    return Response.json({ status: "unknown", reason: "unreadable" });
  }

  let expiry: number | null = null;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trimEnd();
    // Netscape format: domain \t flag \t path \t secure \t expiry \t name \t value
    if (!line || (line.startsWith("#") && !line.startsWith("#HttpOnly_"))) continue;
    const parts = line.split("\t");
    if (parts.length < 7) continue;
    const domain = parts[0].replace(/^#HttpOnly_/, "");
    if (/(^|\.)instagram\.com$/i.test(domain) && parts[5] === "sessionid") {
      expiry = Number(parts[4]) || null;
      break;
    }
  }

  if (expiry == null) return Response.json({ status: "unknown", reason: "no-session" });
  const expired = expiry * 1000 < Date.now();
  return Response.json({
    status: expired ? "expired" : "valid",
    expiresAt: new Date(expiry * 1000).toISOString(),
  });
}
