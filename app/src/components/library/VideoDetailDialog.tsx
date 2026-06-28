"use client";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Download, ExternalLink, FileText, Loader2, Play, RefreshCw, ScrollText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteMediaButton } from "@/components/library/DeleteMediaButton";
import { api } from "@/lib/api";
import { DEFAULT_NOTE_LANG, NOTE_LANGS, noteLangNative } from "@/lib/languages";
import { formatBytes, formatDuration } from "@/lib/format";
import { useT } from "@/i18n/I18nProvider";

function IconBtn({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClick} aria-label={label}>
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Compact note-language picker (per-video override before (re)generating). */
function LangSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Select value={value} onValueChange={(v) => v && onChange(v)}>
            <SelectTrigger size="sm" className="w-[8.5rem]" aria-label={label}>
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
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

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

  // Per-video language override; defaults to the account/global resolved language.
  // Reset it when the dialog switches videos — adjust-state-during-render, the
  // React-recommended alternative to a reset effect.
  const [langOverride, setLangOverride] = useState<string | null>(null);
  const [prevPostId, setPrevPostId] = useState(postId);
  if (postId !== prevPostId) {
    setPrevPostId(postId);
    setLangOverride(null);
  }
  const lang = langOverride ?? data?.noteLanguage ?? DEFAULT_NOTE_LANG;

  const gen = useMutation({
    mutationFn: (language: string) => api.generateNote(account as string, postId as string, language),
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

  function copyText(text: string) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast.success(t("detail.copied")))
      .catch(() => {});
  }

  function copyNotePath() {
    copyText(`notes/${account}/videos/${postId}.md`);
  }

  function downloadNote() {
    if (!data?.note || !postId) return;
    const blob = new Blob([data.note], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${postId}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const item = data?.item;
  const tokens = data?.noteMeta ? data.noteMeta.inputTokens + data.noteMeta.outputTokens : null;

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
              {/* actions — full-width row at the top */}
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
                {account && postId && (
                  <DeleteMediaButton
                    account={account}
                    postIds={[postId]}
                    onDeleted={() => {
                      qc.invalidateQueries({ queryKey: ["gallery"] });
                      qc.invalidateQueries({ queryKey: ["items"] });
                      qc.invalidateQueries({ queryKey: ["stats", account] });
                      qc.invalidateQueries({ queryKey: ["accounts"] });
                      onOpenChange(false);
                    }}
                  />
                )}
              </div>

              {/* media: centered thumbnail with the size as a caption */}
              <div className="flex flex-col items-center gap-1.5">
                {account && postId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/accounts/${encodeURIComponent(account)}/items/${encodeURIComponent(postId)}/thumb`}
                    alt=""
                    className="aspect-[9/16] w-32 rounded-xl object-cover ring-1 ring-border"
                  />
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {item?.fileSize ? formatBytes(item.fileSize) : ""}
                  {item?.width && item?.height ? ` · ${item.width}×${item.height}` : ""}
                </span>
              </div>

              {/* note */}
              <section className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <FileText className="size-3.5" /> {t("detail.note")}
                  </h3>
                  {data.note && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {data.note.length.toLocaleString()} {t("detail.chars")}
                      {tokens != null ? ` · ${tokens.toLocaleString()} tokens` : ""}
                    </span>
                  )}
                  {data.note && (
                    <div className="ml-auto flex items-center gap-1.5">
                      <IconBtn label={t("detail.copy")} onClick={() => copyText(data.note as string)}>
                        <Copy className="size-3.5" />
                      </IconBtn>
                      <IconBtn label={t("detail.downloadMd")} onClick={downloadNote}>
                        <Download className="size-3.5" />
                      </IconBtn>
                      <LangSelect value={lang} onChange={setLangOverride} label={t("detail.language")} />
                      <Button variant="outline" size="sm" onClick={() => gen.mutate(lang)} disabled={gen.isPending}>
                        {gen.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                        {t("detail.regenerate")}
                      </Button>
                    </div>
                  )}
                </div>

                {data.note ? (
                  <div className="md-body text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.note}</ReactMarkdown>
                  </div>
                ) : health?.available ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-muted-foreground">{t("detail.noNote")}</p>
                    <LangSelect value={lang} onChange={setLangOverride} label={t("detail.language")} />
                    <Button size="sm" onClick={() => gen.mutate(lang)} disabled={gen.isPending}>
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
                <div className="flex items-center gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <ScrollText className="size-3.5" /> {t("detail.transcript")}
                  </h3>
                  {data.transcript && (
                    <div className="ml-auto">
                      <IconBtn label={t("detail.copy")} onClick={() => copyText(data.transcript as string)}>
                        <Copy className="size-3.5" />
                      </IconBtn>
                    </div>
                  )}
                </div>
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
