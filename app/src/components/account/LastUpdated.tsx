"use client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

export function LastUpdated({ iso }: { iso: string | null }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="text-xs text-muted-foreground" />}
      >
        Atualizado {formatRelativeTime(iso)}
      </TooltipTrigger>
      <TooltipContent>{formatDateTime(iso)}</TooltipContent>
    </Tooltip>
  );
}
