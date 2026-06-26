"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { useT } from "@/i18n/I18nProvider";

/** Per-account "generate the missing notes" via headless Claude Code (polled progress). */
export function NotesControl({ account, unnoted }: { account: string; unnoted: number }) {
  const t = useT();
  const qc = useQueryClient();

  const { data: health } = useQuery({
    queryKey: ["notes-health"],
    queryFn: api.notesHealth,
    staleTime: Infinity,
  });

  const { data: job } = useQuery({
    queryKey: ["notes-job", account],
    queryFn: () => api.notesStatus(account),
    refetchInterval: (q) => (q.state.data?.status === "running" ? 3000 : false),
  });

  // Refresh the account counts when a batch finishes.
  useEffect(() => {
    if (job && (job.status === "done" || job.status === "stopped" || job.status === "error")) {
      qc.invalidateQueries({ queryKey: ["accounts"] });
    }
  }, [job?.status, qc]);

  const start = useMutation({
    mutationFn: () => api.startNotes(account),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes-job", account] }),
    onError: (e) => toast.error((e as Error).message),
  });
  const stop = useMutation({
    mutationFn: () => api.stopNotes(account),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes-job", account] }),
  });

  if (!health?.available) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="text-xs text-muted-foreground" />}>
          {t("notes.needClaude")}
        </TooltipTrigger>
        <TooltipContent>{t("notes.needClaudeTip")}</TooltipContent>
      </Tooltip>
    );
  }

  if (job?.status === "running") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin text-coral" />
        <span className="tabular-nums">
          {job.done}/{job.total}
          {job.errors ? ` · ${job.errors} ${t("notes.errors")}` : ""}
        </span>
        <Button variant="outline" size="sm" onClick={() => stop.mutate()}>
          <Square />
          {t("notes.stop")}
        </Button>
      </div>
    );
  }

  // Nothing left to do: every downloaded video already has a note.
  if (unnoted === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="size-3.5 text-emerald-400" />
        {t("notes.allDone")}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="outline" size="sm" onClick={() => start.mutate()} disabled={start.isPending}>
              <Sparkles />
              {t("notes.generate")} ({unnoted})
            </Button>
          }
        />
        <TooltipContent>{t("notes.generateTip")}</TooltipContent>
      </Tooltip>
      {job && (job.status === "done" || job.status === "stopped") && job.total > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {job.done}/{job.total}
          {job.errors ? ` · ${job.errors} ${t("notes.errors")}` : ""}
        </span>
      )}
    </div>
  );
}
