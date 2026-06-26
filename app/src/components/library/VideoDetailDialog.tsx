"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, ExternalLink, FileText, Loader2, Play, ScrollText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatBytes, formatDuration } from "@/lib/format";
import { useT } from "@/i18n/I18nProvider";

/** Opens a single video's knowledge: poster + metadata + curated note + transcript. */
export function VideoDetailDialog({
  account,
  postId,
  open,
  onOpenChange,
}: {
  account: string | null;
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["detail", account, postId],
    queryFn: () => api.videoDetail(account as string, postId as string),
    enabled: open && !!account && !!postId,
  });
  const { data: health } = useQuery({
    queryKey: ["notes-health"],
    queryFn: api.notesHealth,
    staleTime: Infinity,
    enabled: open,
  });

  const gen = useMutation({
    mutationFn: () => api.generateNote(account as string, postId as string),
    onSuccess: (r) => {
      if (r.ok) {
        qc.invalidateQueries({ queryKey: ["detail", account, postId] });
        qc.invalidateQueries({ queryKey: ["accounts"] });
        toast.success(t("detail.noteGenerated"));
      } else {
        toast.error(r.error || t("detail.error"));
      }
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function openInPlayer() {
    if (!account || !postId) return;
    try {
      await api.openFile(account, postId);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function copyNotePath() {
    navigator.clipboard
      ?.writeText(`notes/${account}/videos/${postId}.md`)
      .then(() => toast.success(t("detail.pathCopied")))
      .catch(() => {});
  }

  const item = data?.item;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex flex-wrap items-center gap-2 font-heading">
            @{account}
            {item && (
              <span className="text-sm font-normal text-muted-foreground">
                · {t(`origin.${item.origin}`)}
                {item.durationS ? ` · ${formatDuration(item.durationS)}` : ""}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{postId}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
          {isError && <p className="py-8 text-center text-sm text-destructive">{t("detail.error")}</p>}

          {data && (
            <>
              <div className="flex gap-4">
                {account && postId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/accounts/${encodeURIComponent(account)}/items/${encodeURIComponent(postId)}/thumb`}
                    alt=""
                    className="aspect-[9/16] w-24 shrink-0 rounded-xl object-cover ring-1 ring-border"
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {item?.fileSize ? (
                      <span className="font-mono text-foreground">{formatBytes(item.fileSize)}</span>
                    ) : null}
                    {item?.width && item?.height ? (
                      <span>
                        {item.width}×{item.height}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.webUrl && (
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={<a href={data.webUrl} target="_blank" rel="noreferrer noopener" />}
                      >
                        <ExternalLink />
                        {t("detail.openInstagram")}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={openInPlayer}>
                      <Play />
                      {t("detail.openPlayer")}
                    </Button>
                    {data.note && (
                      <Button variant="outline" size="sm" onClick={copyNotePath}>
                        <Copy />
                        {t("detail.copyPath")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* note */}
              <section className="flex flex-col gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <FileText className="size-3.5" /> {t("detail.note")}
                </h3>
                {data.note ? (
                  <div className="md-body text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.note}</ReactMarkdown>
                  </div>
                ) : health?.available ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-muted-foreground">{t("detail.noNote")}</p>
                    <Button size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
                      {gen.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
                      {gen.isPending ? t("detail.generating") : t("detail.generateNote")}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("detail.noClaudeCode")}</p>
                )}
              </section>

              {/* transcript */}
              <section className="flex flex-col gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <ScrollText className="size-3.5" /> {t("detail.transcript")}
                </h3>
                {data.transcript ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {data.transcript}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("detail.noTranscript")}</p>
                )}
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
