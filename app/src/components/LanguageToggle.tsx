"use client";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES } from "@/i18n/dictionary";

// Cycles through the available locales (PT ⇄ EN). Compact button for the header.
export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  function cycle() {
    const i = LOCALES.indexOf(locale);
    setLocale(LOCALES[(i + 1) % LOCALES.length]);
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="sm" onClick={cycle} aria-label={t("lang.label")}>
            <Languages />
            <span className="font-medium uppercase">{locale}</span>
          </Button>
        }
      />
      <TooltipContent>{t("lang.label")}</TooltipContent>
    </Tooltip>
  );
}
