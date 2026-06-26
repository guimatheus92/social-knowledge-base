import { jobManager } from "@/server/engine/jobManager";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  const snapshot = jobManager.stop(account);
  if (!snapshot) return Response.json({ error: "No job for this account" }, { status: 404 });
  return Response.json(snapshot);
}
