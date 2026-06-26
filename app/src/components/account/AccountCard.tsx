"use client";

import type { AccountSummary, JobSnapshot } from "@/lib/types";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusPill } from "@/components/account/StatusPill";
import { AccountAvatar } from "@/components/account/AccountAvatar";
import { NotesControl } from "@/components/account/NotesControl";
import { MediaCountBadges } from "@/components/account/MediaCountBadges";
import { SizeMeter } from "@/components/account/SizeMeter";
import { ElapsedTimer } from "@/components/account/ElapsedTimer";
import { LastUpdated } from "@/components/account/LastUpdated";
import { DownloadProgress } from "@/components/account/DownloadProgress";
import { PlayButton } from "@/components/controls/PlayButton";
import { SyncButton } from "@/components/controls/SyncButton";
import { MediaTypeToggle } from "@/components/controls/MediaTypeToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ExternalLink, Folder, Images, Sigma } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { networkMeta } from "@/lib/networks";
import type { MediaType } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";

export function AccountCard({
  summary,
  snapshot,
  onPlay,
  onStop,
  onSync,
  onCount,
  onPeek,
  onMediaChange,
}: {
  summary: AccountSummary;
  snapshot: JobSnapshot | null;
  onPlay: () => void;
  onStop: () => void;
  onSync: () => void;
  onCount: () => void;
  onPeek: () => Promise<{ newCount: number; checked: number; tab: string }>;
  onMediaChange: (media: MediaType[]) => void;
}) {
  const { t, locale } = useI18n();
  const status = snapshot?.status ?? summary.job?.status ?? "idle";
  const running = snapshot?.status === "running";
  const busy = status === "running" || status === "queued";
  const counting = snapshot?.mode === "count" && running;
  const est = summary.estimatedTotal;
  const remaining = est != null ? Math.max(0, est - summary.counts.downloaded) : null;

  async function openFolder() {
    try {
      await api.openDir(summary.savePath);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-3">
          <AccountAvatar account={summary.account} network={summary.network} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="truncate font-heading">@{summary.account}</span>
              <StatusPill status={status} rateLimited={snapshot?.rateLimited} />
            </div>
            <span className="text-xs font-normal text-muted-foreground">
              {networkMeta(summary.network).label}
            </span>
          </div>
        </CardTitle>
        <CardAction className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={`/library/${encodeURIComponent(summary.account)}`}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium transition hover:bg-muted"
                >
                  <Images className="size-4" />
                  {t("card.library")}
                </Link>
              }
            />
            <TooltipContent>{t("card.libraryTooltip")}</TooltipContent>
          </Tooltip>
          <PlayButton
            status={snapshot?.status ?? summary.job?.status ?? "idle"}
            onPlay={onPlay}
            onStop={onStop}
          />
          <SyncButton onSync={onSync} onPeek={onPeek} />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" onClick={onCount} disabled={busy}>
                  <Sigma className="size-4" />
                  {t("card.count")}
                </Button>
              }
            />
            <TooltipContent>{t("card.countTooltip")}</TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <MediaCountBadges counts={summary.counts} />
          <SizeMeter bytes={summary.counts.bytesTotal} />
          <ElapsedTimer
            elapsedSeconds={snapshot?.elapsedSeconds ?? summary.elapsedSeconds}
            startedAt={snapshot?.startedAt ?? null}
            running={running}
          />
          <LastUpdated iso={summary.lastSyncedAt} />
        </div>

        {counting ? (
          <span className="text-xs text-amber-400">
            {t("card.counting", { n: formatNumber(snapshot?.discovered ?? 0, locale) })}
          </span>
        ) : est != null ? (
          <span className="text-xs text-muted-foreground">
            {t("card.profileEstimate", { n: formatNumber(est, locale) })} ·{" "}
            {remaining === 0 ? (
              <span className="text-emerald-400">{t("card.allDownloaded")}</span>
            ) : (
              <span>{t("card.remaining", { n: formatNumber(remaining ?? 0, locale) })}</span>
            )}
          </span>
        ) : null}

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={openFolder}
                className="group flex w-fit max-w-full items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <Folder className="size-3.5 shrink-0" />
                <span className="truncate font-mono">{summary.savePath}</span>
                <ExternalLink className="size-3 shrink-0 opacity-0 transition group-hover:opacity-100" />
              </button>
            }
          />
          <TooltipContent>{t("card.openFolderTooltip")}</TooltipContent>
        </Tooltip>

        <DownloadProgress job={snapshot ?? summary.job} />

        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
          <MediaTypeToggle value={summary.mediaTypes} onChange={onMediaChange} />
          <span className="text-xs text-muted-foreground">
            {t("card.pickMediaHintBefore")}{" "}
            <strong>{t("card.download")}</strong>
            {t("card.pickMediaHintAfter")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-sm">
          <span className="font-medium text-muted-foreground">{t("notes.label")}</span>
          <NotesControl account={summary.account} unnoted={summary.counts.unnotedVideos} />
        </div>
      </CardContent>
    </Card>
  );
}
