import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "@/server/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Collects *cookies*.txt files in a directory (preferred name first). */
function cookiesIn(dir: string, preferred?: string): string[] {
  const out: string[] = [];
  if (preferred) out.push(join(dir, preferred));
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (/cookies.*\.txt$/i.test(f)) out.push(join(dir, f));
    }
  }
  return out;
}

/** Tries to find an exported cookies.txt to pre-fill the UI: the data root
 *  (the Docker /data volume) first, then the user's Downloads folder (local/dev). */
export function GET(): Response {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const candidates = [
    ...cookiesIn(ROOT, "cookies.txt"),
    ...(home ? cookiesIn(join(home, "Downloads"), "ig_cookies.txt") : []),
  ];
  const found = candidates.find((p) => existsSync(p));
  return Response.json({ path: found ?? null });
}
