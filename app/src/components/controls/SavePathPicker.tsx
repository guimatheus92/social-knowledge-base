"use client";

import { useState } from "react";
import { Folder, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { useT } from "@/i18n/I18nProvider";

export function SavePathPicker({
  value,
  onChange,
  id = "save-path",
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const t = useT();
  const [picking, setPicking] = useState(false);

  async function browse() {
    setPicking(true);
    try {
      const r = await api.pickDir(value || undefined);
      if (r.path) onChange(r.path);
    } catch (e) {
      toast.error(t("savepath.pickerError", { message: (e as Error).message }));
    } finally {
      setPicking(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {t("savepath.label")}
      </Label>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="relative flex flex-1 items-center">
                <Folder className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
                <Input
                  id={id}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="downloads/perfil"
                  spellCheck={false}
                  className="pl-8 font-mono text-xs"
                />
              </div>
            }
          />
          <TooltipContent>{t("savepath.inputTooltip")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button type="button" variant="outline" onClick={browse} disabled={picking}>
                {picking ? <Loader2 className="size-4 animate-spin" /> : <Folder className="size-4" />}
                {t("savepath.browse")}
              </Button>
            }
          />
          <TooltipContent>{t("savepath.browseTooltip")}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
