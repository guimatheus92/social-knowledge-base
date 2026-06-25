"use client";

import { TriangleAlert } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/i18n/I18nProvider";

export function ParallelismControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">
        {t("parallel.label", { n: value })}
      </Label>
      <Tooltip>
        <TooltipTrigger
          render={
            <Slider
              min={1}
              max={4}
              step={1}
              value={[value]}
              onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
              className="w-full max-w-56"
              aria-label={t("parallel.ariaLabel")}
            />
          }
        />
        <TooltipContent>{t("parallel.tooltip")}</TooltipContent>
      </Tooltip>
      {value > 2 ? (
        <p className="flex items-center gap-1.5 text-xs text-amber-400">
          <TriangleAlert className="size-3.5" />
          {t("parallel.warning")}
        </p>
      ) : null}
    </div>
  );
}
