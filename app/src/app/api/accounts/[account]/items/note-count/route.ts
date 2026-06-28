import * as repo from "@/server/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * How many of the given postIds already have a curated note — backs the
 * "free up space" warning (freeing an un-noted item keeps nothing).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  let postIds: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.postIds)) {
      postIds = body.postIds.filter((x: unknown): x is string => typeof x === "string");
    }
  } catch {
    /* invalid/empty body → no ids */
  }
  try {
    const noted = repo.countNotedAmong(account, postIds);
    return Response.json({ total: postIds.length, noted });
  } catch (e) {
    return Response.json({ error: (e as Error).message || "count failed" }, { status: 400 });
  }
}
