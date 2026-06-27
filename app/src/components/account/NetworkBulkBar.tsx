"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useT } from "@/i18n/I18nProvider";
import type { AccountSummary } from "@/lib/types";

/** Network-level bulk actions: download every profile, generate every missing note. */
export function NetworkBulkBar({
  accounts,
  cookiesPath,
}: {
  accounts: AccountSummary[];
  cookiesPath: string;
}) {
  const t = useT();
  const qc = useQueryClient();

  const { data: health } = useQuery({
    queryKey: ["notes-health"],
    queryFn: api.notesHealth,
    staleTime: Infinity,
  });
  const { data: bulk } = useQuery({
    queryKey: ["bulk-notes"],
    queryFn: api.bulkNotesStatus,
    refetchInterval: (q) => (q.state.data?.status === "running" ? 3000 : false),
  });

  // Refresh the cards/counts when a bulk run ends.
  useEffect(() => {
    if (bulk && (bulk.status === "done" || bulk.status === "stopped" || bulk.status === "error")) {
      qc.invalidateQueries({ queryKey: ["accounts"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when bulk.status changes, not on every bulk field
  }, [bulk?.status, qc]);

  const unnotedVideos = accounts.reduce((n, a) => n + a.counts.unnotedVideos, 0);
  const unnotedAccounts = accounts.filter((a) => a.counts.unnotedVideos > 0).map((a) => a.account);

  const downloadAll = useMutation({
    mutationFn: async () => {
      if (!cookiesPath) throw new Error(t("cardc.cookiesRequired"));
      let started = 0;
      const failed: string[] = [];
      // The job manager serializes by cookies, so these queue and run in turn.
      for (const a of accounts) {
        try {
          await api.startJob({
            account: a.account,
            cookiesPath,
            tabs: a.tabs,
            media: a.mediaTypes,
            parallelism: a.parallelism,
            mode: "full",
          });
          started += 1;
        } catch {
          failed.push(a.account); // don't abort the rest, but surface it below
        }
      }
      return { started, failed };
    },
    onSuccess: ({ started, failed }) => {
      if (started > 0) toast.success(t("bulk.downloadStarted", { n: started }));
      if (failed.length > 0) {
        toast.error(t("bulk.downloadFailed", { accounts: failed.map((a) => `@${a}`).join(", ") }));
      }
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const notesAll = useMutation({
    mutationFn: () => api.startBulkNotes(unnotedAccounts),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bulk-notes"] }),
    onError: (e) => toast.error((e as Error).message),
  });
  const stopNotes = useMutation({
    mutationFn: () => api.stopBulkNotes(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bulk-notes"] }),
  });

  const running = bulk?.status === "running";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/40 px-3 py-2">
      <span className="mr-1 text-xs font-medium text-muted-foreground">{t("bulk.label")}</span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadAll.mutate()}
        disabled={downloadAll.isPending || !cookiesPath}
      >
        {downloadAll.isPending ? <Loader2 className="animate-spin" /> : <Download />}
        {t("bulk.downloadAll")} ({accounts.length})
      </Button>

      {health?.available &&
        (running ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-coral" />
            <span className="tabular-nums">
              {bulk.done}/{bulk.total}
              {bulk.currentAccount ? ` · @${bulk.currentAccount}` : ""} ({bulk.accountsDone}/
              {bulk.totalAccounts})
            </span>
            <Button variant="outline" size="sm" onClick={() => stopNotes.mutate()}>
              <Square />
              {t("notes.stop")}
            </Button>
          </div>
        ) : unnotedVideos > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => notesAll.mutate()}
            disabled={notesAll.isPending}
          >
            {notesAll.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {t("bulk.notesAll")} ({unnotedVideos})
          </Button>
        ) : null)}
    </div>
  );
}
