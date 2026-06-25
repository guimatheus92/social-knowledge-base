"use client";
import { HardDrive } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { useT } from "@/i18n/I18nProvider";

export function DiskUsagePanel() {
  const t = useT();
  const { data } = useQuery({ queryKey: ["disk"], queryFn: api.disk, refetchInterval: 15000 });

  const downloaded = data?.downloaded ?? 0;
  const free = data?.free ?? 0;
  const total = data?.total ?? 0;
  const usedPct = total > 0 ? Math.min(100, ((total - free) / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 py-4">
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
      </CardContent>
    </Card>
  );
}
