"use client";
import { HardDrive, Image, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { useT } from "@/i18n/I18nProvider";
import type { AccountSummary } from "@/lib/types";

export function DiskUsagePanel({ accounts }: { accounts: AccountSummary[] }) {
  const t = useT();
  const { data } = useQuery({ queryKey: ["disk"], queryFn: api.disk, refetchInterval: 15000 });

  const downloaded = data?.downloaded ?? 0;
  const free = data?.free ?? 0;
  const total = data?.total ?? 0;
  const usedPct = total > 0 ? Math.min(100, ((total - free) / total) * 100) : 0;

  const videoBytes = accounts.reduce((s, a) => s + (a.counts.bytesByMedia.video ?? 0), 0);
  const imageBytes = accounts.reduce((s, a) => s + (a.counts.bytesByMedia.image ?? 0), 0);
  const perAccount = accounts
    .filter((a) => a.counts.bytesTotal > 0)
    .sort((a, b) => b.counts.bytesTotal - a.counts.bytesTotal);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-2 text-sm">
          <HardDrive className="size-4 text-muted-foreground" />
          <span className="font-medium">{formatBytes(downloaded)}</span>
          <span className="text-muted-foreground">{t("disk.downloaded")}</span>
          {total > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {t("disk.freeOfTotal", { free: formatBytes(free), total: formatBytes(total) })}
            </span>
          )}
        </div>
        <Progress value={usedPct} />

        {/* subtotal by media type */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Video className="size-3.5 text-coral" />
            <b className="font-mono font-medium text-foreground">{formatBytes(videoBytes)}</b>{" "}
            {t("media.videosLabel").toLowerCase()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Image className="size-3.5 text-violet" aria-hidden />
            <b className="font-mono font-medium text-foreground">{formatBytes(imageBytes)}</b>{" "}
            {t("media.imagesLabel").toLowerCase()}
          </span>
        </div>

        {/* subtotal by account (when more than one) */}
        {perAccount.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {perAccount.map((a) => (
              <span
                key={a.account}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 text-xs"
              >
                <span className="text-muted-foreground">@{a.account}</span>
                <b className="font-mono font-medium text-foreground">{formatBytes(a.counts.bytesTotal)}</b>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
