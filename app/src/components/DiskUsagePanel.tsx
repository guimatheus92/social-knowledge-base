"use client";
import { HardDrive, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { useT } from "@/i18n/I18nProvider";

export function DiskUsagePanel() {
  const t = useT();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["disk"], queryFn: api.disk, refetchInterval: 15000 });
  const clear = useMutation({
    mutationFn: api.clearThumbs,
    onSuccess: (r) => {
      toast.success(t("disk.cleared", { n: r.cleared }));
      qc.invalidateQueries({ queryKey: ["disk"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const downloaded = data?.downloaded ?? 0;
  const free = data?.free ?? 0;
  const total = data?.total ?? 0;
  const usedPct = total > 0 ? Math.min(100, ((total - free) / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex min-w-64 flex-1 flex-col gap-1.5">
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
        </div>

        <AlertDialog>
          <Tooltip>
            <TooltipTrigger
              render={
                <AlertDialogTrigger
                  render={
                    <Button variant="outline" size="sm" disabled={clear.isPending}>
                      <Trash2 className="size-4" />
                      {t("disk.clearThumbnails")}
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>{t("disk.clearTooltip")}</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("disk.clearTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("disk.clearDescriptionBefore")}
                <code>.thumbs</code>
                {t("disk.clearDescriptionAfter")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel render={<Button variant="outline">{t("disk.cancel")}</Button>} />
              <AlertDialogAction render={<Button onClick={() => clear.mutate()}>{t("disk.clear")}</Button>} />
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
