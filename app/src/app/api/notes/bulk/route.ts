import { z } from "zod";
import { notesRunner } from "@/server/engine/notes";
import type { BulkNotesStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idle: BulkNotesStatus = {
  status: "idle",
  accounts: [],
  currentAccount: null,
  accountsDone: 0,
  totalAccounts: 0,
  done: 0,
  total: 0,
  errors: 0,
};

const Body = z.object({ accounts: z.array(z.string().min(1)).min(1) });

/** Start a cross-account bulk note run (accounts processed one at a time). */
export async function POST(req: Request): Promise<Response> {
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  return Response.json(notesRunner.startBulk(body.accounts));
}

export function GET(): Response {
  return Response.json(notesRunner.getBulk() ?? idle);
}

export function DELETE(): Response {
  return Response.json(notesRunner.stopBulk() ?? idle);
}
