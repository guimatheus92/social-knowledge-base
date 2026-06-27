import { z } from "zod";
import { getAnalysisConfig, setAnalysisConfig } from "@/server/config/mcp";
import { NOTE_LANG_CODES } from "@/lib/languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(getAnalysisConfig());
}

const Body = z.object({
  whisperModel: z.enum(["tiny", "base", "small", "medium", "large"]),
  whisperLanguage: z.string().min(2).max(8),
  detail: z.enum(["brief", "standard", "detailed"]),
  maxFrames: z.number().int().min(1).max(60),
  threshold: z.number().min(0).max(1),
  ocrLanguage: z.string().min(2).max(40),
  noteLanguage: z.string().refine((v) => NOTE_LANG_CODES.includes(v), "unsupported note language"),
});

export async function PUT(req: Request): Promise<Response> {
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid config" }, { status: 400 });
  }
  setAnalysisConfig(body);
  return Response.json(getAnalysisConfig());
}
