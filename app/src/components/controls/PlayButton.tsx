"use client";

import { Play, Square } from "lucide-react";

import type { JobStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/i18n/I18nProvider";

export function PlayButton({
  status,
  onPlay,
  onStop,
  disabled,
  disabledReason,
}: {
  status: JobStatus | "idle" | null;
  onPlay: () => void;
  onStop: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const t = useT();
  const isActive = status === "running" || status === "queued";

  const tip = disabled
    ? (disabledReason ?? t("play.unavailable"))
    : isActive
      ? t("play.stopTip")
      : t("play.startTip");

  const button = isActive ? (
    <Button
      variant="destructive"
      size="sm"
      disabled={disabled}
      onClick={onStop}
    >
      <Square />
      {t("play.stop")}
    </Button>
  ) : (
    <Button size="sm" disabled={disabled} onClick={onPlay}>
      <Play />
      {t("play.download")}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          disabled ? (
            <span className="inline-flex cursor-not-allowed">{button}</span>
          ) : (
            button
          )
        }
      />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
