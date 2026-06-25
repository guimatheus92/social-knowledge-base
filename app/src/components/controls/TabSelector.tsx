"use client";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Tab } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";

const OPTION_VALUES: Tab[] = ["highlights", "reels", "stories", "posts"];

export function TabSelector({
  value,
  onChange,
}: {
  value: Tab[];
  onChange: (v: Tab[]) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{t("tabs.label")}</Label>
      <ToggleGroup
        multiple
        value={value}
        onValueChange={(v: string[]) => onChange(v as Tab[])}
        variant="outline"
        className="w-fit flex-wrap"
      >
        {OPTION_VALUES.map((v) => {
          const label = t(`tabs.${v}Label`);
          const hint = t(`tabs.${v}Hint`);
          return (
            <Tooltip key={v}>
              <TooltipTrigger
                render={
                  <ToggleGroupItem
                    value={v}
                    aria-label={label}
                    className="px-3 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[pressed]:border-primary data-[pressed]:bg-primary data-[pressed]:text-primary-foreground"
                  >
                    {label}
                  </ToggleGroupItem>
                }
              />
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
