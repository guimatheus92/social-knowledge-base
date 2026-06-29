"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ElapsedTimer } from "@/components/account/ElapsedTimer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { DEFAULT_NOTE_LANG, NOTE_LANGS, noteLangNative } from "@/lib/languages";
import { useT } from "@/i18n/I18nProvider";

/** Per-account "generate the missing notes" via headless Claude Code (polled progress). */
export function NotesControl({
  account,
  unnoted,
  noted,
  noteLanguage,
}: {
  account: string;
  unnoted: number;
  noted: number;
  noteLanguage: string | null;
}) {
  const t = useT();
  const qc = useQueryClient();

  const { data: health } = useQuery({
    queryKey: ["notes-health"],
    queryFn: api.notesHealth,
    staleTime: Infinity,
  });

  // Global default note language (shown when the account has no override).
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: api.getConfig,
    staleTime: Infinity,
  });
  const lang = noteLanguage ?? config?.noteLanguage ?? DEFAULT_NOTE_LANG;

  const setLang = useMutation({
    mutationFn: (v: string) => api.patchAccount(account, { noteLanguage: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
    onError: (e) => toast.error((e as Error).message),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when job.status changes, not on every job field
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
        <ElapsedTimer elapsedSeconds={0} startedAt={job.startedAt} running />
        <Button variant="outline" size="sm" onClick={() => stop.mutate()}>
          <Square />
          {t("notes.stop")}
        </Button>
      </div>
    );
  }

  // No note candidates left. Distinguish "every video is noted" (a real win)
  // from "there are simply no notes yet" — the latter is what an empty/freed
  // profile shows, and calling it "all noted" is misleading.
  if (unnoted === 0) {
    return noted > 0 ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="size-3.5 text-emerald-400" />
        {t("notes.allDone")}
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">{t("notes.none")}</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Select value={lang} onValueChange={(v) => v && v !== lang && setLang.mutate(v)}>
              <SelectTrigger size="sm" className="w-[8.5rem]" aria-label={t("notes.language")}>
                <SelectValue>{(v) => noteLangNative(String(v))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {NOTE_LANGS.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.native}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <TooltipContent>{t("notes.languageTip")}</TooltipContent>
      </Tooltip>
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
