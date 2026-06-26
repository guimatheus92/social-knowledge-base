"use client";

import { Check, Image, Video } from "lucide-react";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MediaType } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";

const OPTIONS: { value: MediaType; labelKey: string; hintKey: string; Icon: typeof Image }[] = [
  { value: "image", labelKey: "media.imagesLabel", hintKey: "media.imagesHint", Icon: Image },
  { value: "video", labelKey: "media.videosLabel", hintKey: "media.videosHint", Icon: Video },
];

export function MediaTypeToggle({
  value,
  onChange,
}: {
  value: MediaType[];
  onChange: (v: MediaType[]) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{t("media.label")}</Label>
      <ToggleGroup
        multiple
        value={value}
        onValueChange={(v: string[]) => {
          // Keep at least one media type selected.
          if (v.length === 0) return;
          onChange(v as MediaType[]);
        }}
        variant="outline"
        className="w-fit"
      >
        {OPTIONS.map(({ value: v, labelKey, hintKey, Icon }) => {
          const selected = value.includes(v);
          const label = t(labelKey);
          return (
            <Tooltip key={v}>
              <TooltipTrigger
                render={
                  <ToggleGroupItem
                    value={v}
                    aria-label={label}
                    className="gap-2 px-3 aria-pressed:border-primary/45 aria-pressed:bg-primary/10 aria-pressed:text-foreground data-[pressed]:border-primary/45 data-[pressed]:bg-primary/10 data-[pressed]:text-foreground"
                  >
                    <Icon className="size-4" />
                    <span className="text-sm">{label}</span>
                    {selected && <Check className="size-4 text-green-400" aria-hidden />}
                  </ToggleGroupItem>
                }
              />
              <TooltipContent>{t(hintKey)}</TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
