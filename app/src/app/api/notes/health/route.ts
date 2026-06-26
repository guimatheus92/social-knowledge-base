import { claudeAvailable } from "@/server/engine/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Is the Claude Code CLI installed, so the app can generate notes? */
export async function GET(): Promise<Response> {
  return Response.json({ available: await claudeAvailable() });
}
