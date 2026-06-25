"use client";
import { create } from "zustand";
import { applyJobEvent } from "@/lib/jobReducer";
import type { JobSnapshot, StreamMessage } from "@/lib/types";

interface JobsStore {
  snapshots: Record<string, JobSnapshot | null>;
  setSnapshot: (account: string, snap: JobSnapshot | null) => void;
  applyMessage: (account: string, msg: StreamMessage) => void;
}

export const useJobsStore = create<JobsStore>((set) => ({
  snapshots: {},
  setSnapshot: (account, snap) =>
    set((st) => ({ snapshots: { ...st.snapshots, [account]: snap } })),
  applyMessage: (account, msg) =>
    set((st) => {
      const cur = st.snapshots[account] ?? null;
      const next = msg.t === "snapshot" ? msg.snapshot : applyJobEvent(cur, msg);
      return { snapshots: { ...st.snapshots, [account]: next } };
    }),
}));
