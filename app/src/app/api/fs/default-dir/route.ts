import { DOWNLOADS } from "@/server/paths";

export const runtime = "nodejs";

/** Default download folder (where the current downloads already live). */
export function GET(): Response {
  return Response.json({ path: DOWNLOADS });
}
