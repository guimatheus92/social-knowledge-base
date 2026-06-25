"use client";
import { HardDrive, TriangleAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { useT } from "@/i18n/I18nProvider";

const LOW_DISK_THRESHOLD = 10 * 1024 ** 3;

export function SizeMeter({
  bytes,
  freeBytes,
}: {
  bytes: number;
  freeBytes?: number | null;
}) {
  const t = useT();
  const hasFree = freeBytes != null;
  const low = hasFree && freeBytes < LOW_DISK_THRESHOLD;

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <HardDrive className="size-4 text-muted-foreground" />
      <span className="tabular-nums">{formatBytes(bytes)}</span>
      {hasFree && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-muted-foreground",
            low && "text-amber-400"
          )}
        >
          <span aria-hidden>·</span>
          {low ? (
            <Tooltip>
              <TooltipTrigger
                render={<span className="inline-flex items-center gap-1 tabular-nums" />}
              >
                <TriangleAlert className="size-3.5" />
                {t("size.free", { size: formatBytes(freeBytes) })}
              </TooltipTrigger>
              <TooltipContent>{t("size.lowDisk")}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="tabular-nums">{t("size.free", { size: formatBytes(freeBytes) })}</span>
          )}
        </span>
      )}
    </span>
  );
}
