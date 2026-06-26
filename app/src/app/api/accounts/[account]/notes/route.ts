import * as repo from "@/server/db/repository";
import { notesRunner } from "@/server/engine/notes";
import type { NotesJobStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function idle(account: string): NotesJobStatus {
  return { account, status: "idle", total: 0, done: 0, errors: 0, current: null, recentLog: [] };
}

/** Start a per-account batch: generate notes for every downloaded-but-unnoted video. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  if (!repo.getAccount(account)) {
    return Response.json({ error: "account not found" }, { status: 404 });
  }
  return Response.json(notesRunner.start(account));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  return Response.json(notesRunner.get(account) ?? idle(account));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<Response> {
  const { account } = await params;
  return Response.json(notesRunner.stop(account) ?? idle(account));
}
