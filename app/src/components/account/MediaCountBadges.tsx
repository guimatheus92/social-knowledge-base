"use client";
import { FileText, Image as ImageIcon, Video } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/format";
import type { Counts } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";

const PILL = "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums";

export function MediaCountBadges({ counts }: { counts: Counts }) {
  const { t, locale } = useI18n();
  // Note-only videos (media freed) get their own badge — don't count them as
  // videos on disk, otherwise "1 video · 0 B" reads as a glitch.
  const videos = Math.max(0, counts.byMedia.video - counts.notesOnly);

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger render={<span className={PILL} />}>
          <Video className="size-3.5" />
          {formatNumber(videos, locale)}
        </TooltipTrigger>
        <TooltipContent>{t("badges.videosInLibrary")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<span className={PILL} />}>
          <ImageIcon className="size-3.5" />
          {formatNumber(counts.byMedia.image, locale)}
        </TooltipTrigger>
        <TooltipContent>{t("badges.imagesInLibrary")}</TooltipContent>
      </Tooltip>
      {counts.notesOnly > 0 && (
        <Tooltip>
          <TooltipTrigger render={<span className={PILL} />}>
            <FileText className="size-3.5" />
            {formatNumber(counts.notesOnly, locale)}
          </TooltipTrigger>
          <TooltipContent>{t("badges.notesOnly")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
