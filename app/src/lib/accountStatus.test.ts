import { describe, it, expect } from "vitest";
import { accountStatus } from "@/lib/accountStatus";

/* eslint-disable @typescript-eslint/no-explicit-any */
const noJob = { job: null, lastSyncedAt: null };

describe("accountStatus", () => {
  it("a live SSE snapshot wins over everything", () => {
    expect(accountStatus({ status: "running" } as any, { job: { status: "paused" } as any, lastSyncedAt: "x" })).toBe(
      "running",
    );
  });

  it("with no snapshot, the in-memory job status is used", () => {
    expect(accountStatus(null, { job: { status: "paused" } as any, lastSyncedAt: null })).toBe("paused");
  });

  it("a synced-but-idle account reads 'completed', not idle (survives a restart)", () => {
    expect(accountStatus(null, { job: null, lastSyncedAt: "2026-06-28T00:00:00Z" })).toBe("completed");
  });

  it("a never-synced account is idle", () => {
    expect(accountStatus(null, noJob)).toBe("idle");
  });
});
