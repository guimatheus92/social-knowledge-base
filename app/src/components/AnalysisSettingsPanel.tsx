"use client";
import { useEffect, useState } from "react";
import { Loader2, Settings2, TriangleAlert } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { NOTE_LANGS } from "@/lib/languages";
import type { AnalysisConfig } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";

export function AnalysisSettingsPanel() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["config"], queryFn: api.getConfig, enabled: open });
  const [cfg, setCfg] = useState<AnalysisConfig | null>(null);

  useEffect(() => {
    if (data) setCfg(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (c: AnalysisConfig) => api.setConfig(c),
    onSuccess: () => {
      toast.success(t("analysis.saved"));
      setOpen(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const patch = (p: Partial<AnalysisConfig>) => setCfg((c) => (c ? { ...c, ...p } : c));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button variant="outline">
                  <Settings2 />
                  {t("analysis.trigger")}
                </Button>
              }
            />
          }
        />
        <TooltipContent>{t("analysis.triggerTip")}</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("analysis.title")}</DialogTitle>
          <DialogDescription>{t("analysis.description")}</DialogDescription>
        </DialogHeader>

        {cfg ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("analysis.noteLanguage")}</Label>
              <Select value={cfg.noteLanguage} onValueChange={(v) => v && patch({ noteLanguage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_LANGS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.native}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{t("analysis.noteLanguageHelp")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">{t("analysis.whisperModel")}</Label>
                <Select value={cfg.whisperModel} onValueChange={(v) => v && patch({ whisperModel: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["tiny", "base", "small", "medium", "large"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">{t("analysis.language")}</Label>
                <Input
                  value={cfg.whisperLanguage}
                  onChange={(e) => patch({ whisperLanguage: e.target.value })}
                  placeholder="auto"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-400">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {t("analysis.warnPrefix")} <code>.mcp.json</code> — {t("analysis.warnRequire")}{" "}
                <strong>{t("analysis.warnRestartMcp")}</strong>. {t("analysis.warnTipPrefix")}{" "}
                <code>small → medium</code>.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("analysis.detail")}</Label>
              <Select value={cfg.detail} onValueChange={(v) => v && patch({ detail: v as AnalysisConfig["detail"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">{t("analysis.detailBrief")}</SelectItem>
                  <SelectItem value="standard">{t("analysis.detailStandard")}</SelectItem>
                  <SelectItem value="detailed">{t("analysis.detailDetailed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("analysis.maxFrames", { n: cfg.maxFrames })}
              </Label>
              <Slider
                min={1}
                max={60}
                step={1}
                value={[cfg.maxFrames]}
                onValueChange={(v) => patch({ maxFrames: (v as number[])[0] })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("analysis.threshold", { value: cfg.threshold.toFixed(2) })}
              </Label>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[cfg.threshold]}
                onValueChange={(v) => patch({ threshold: (v as number[])[0] })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("analysis.ocrLanguage")}</Label>
              <Input
                value={cfg.ocrLanguage}
                onChange={(e) => patch({ ocrLanguage: e.target.value })}
                placeholder="por+eng"
              />
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline">{t("analysis.cancel")}</Button>} />
          <Button onClick={() => cfg && save.mutate(cfg)} disabled={!cfg || save.isPending}>
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("analysis.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
