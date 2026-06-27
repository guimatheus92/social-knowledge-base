"use client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";

export function LastUpdated({ iso }: { iso: string | null }) {
  const { t, locale } = useI18n();
  const relative = formatRelativeTime(iso, locale) ?? t("time.never");
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="text-xs text-muted-foreground" />}>
        {t("time.updated")} {relative}
      </TooltipTrigger>
      <TooltipContent>{formatDateTime(iso, locale)}</TooltipContent>
    </Tooltip>
  );
}
