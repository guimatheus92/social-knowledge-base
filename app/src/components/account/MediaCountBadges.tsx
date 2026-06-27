"use client";
import { Image as ImageIcon, Video } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/format";
import type { Counts } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";

export function MediaCountBadges({ counts }: { counts: Counts }) {
  const { t, locale } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums" />
          }
        >
          <Video className="size-3.5" />
          {formatNumber(counts.byMedia.video, locale)}
        </TooltipTrigger>
        <TooltipContent>{t("badges.videosInLibrary")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums" />
          }
        >
          <ImageIcon className="size-3.5" />
          {formatNumber(counts.byMedia.image, locale)}
        </TooltipTrigger>
        <TooltipContent>{t("badges.imagesInLibrary")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
