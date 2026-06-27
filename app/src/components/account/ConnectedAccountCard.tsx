"use client";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useJobStream } from "@/hooks/useJobStream";
import { useJobsStore } from "@/store/jobs";
import { api } from "@/lib/api";
import { AccountCard } from "@/components/account/AccountCard";
import type { AccountSummary, MediaType } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";

/** Wires AccountCard to the API + SSE (live snapshot, Play/Stop/Sync handlers). */
export function ConnectedAccountCard({
  summary,
  cookiesPath,
}: {
  summary: AccountSummary;
  cookiesPath: string;
}) {
  const t = useT();
  useJobStream(summary.account);
  const snapshot = useJobsStore((s) => s.snapshots[summary.account] ?? null);
  const qc = useQueryClient();

  const onMediaChange = useCallback(
    async (media: MediaType[]) => {
      try {
        await api.patchAccount(summary.account, { media });
        qc.invalidateQueries({ queryKey: ["accounts"] });
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [summary.account, qc],
  );

  const startJob = useCallback(
    async (mode: "full" | "incremental" | "count") => {
      if (!cookiesPath) {
        toast.error(t("cardc.cookiesRequired"));
        return;
      }
      try {
        await api.startJob({
          account: summary.account,
          cookiesPath,
          tabs: summary.tabs,
          media: summary.mediaTypes,
          parallelism: summary.parallelism,
          mode,
        });
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on the specific summary fields used, not the unstable summary object
    [cookiesPath, summary.account, summary.tabs, summary.mediaTypes, summary.parallelism],
  );

  const onStop = useCallback(async () => {
    try {
      await api.stopJob(summary.account);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [summary.account]);

  const onPeek = useCallback(
    () => api.peek(summary.account, cookiesPath),
    [summary.account, cookiesPath],
  );

  return (
    <AccountCard
      summary={summary}
      snapshot={snapshot}
      onPlay={() => startJob("full")}
      onStop={onStop}
      onSync={() => startJob("incremental")}
      onCount={() => startJob("count")}
      onPeek={onPeek}
      onMediaChange={onMediaChange}
    />
  );
}
