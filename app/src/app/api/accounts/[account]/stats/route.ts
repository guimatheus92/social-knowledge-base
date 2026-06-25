import * as repo from "@/server/db/repository";
import { jobManager } from "@/server/engine/jobManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  return Response.json({
    account: repo.getAccount(account),
    counts: repo.getCounts(account),
    job: jobManager.get(account),
  });
}
