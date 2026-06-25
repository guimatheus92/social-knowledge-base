"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MediaTypeToggle } from "@/components/controls/MediaTypeToggle";
import { TabSelector } from "@/components/controls/TabSelector";
import { SavePathPicker } from "@/components/controls/SavePathPicker";
import { useT } from "@/i18n/I18nProvider";
import { api } from "@/lib/api";
import type { MediaType, Tab } from "@/lib/types";

const DEFAULT_MEDIA: MediaType[] = ["video"];
const DEFAULT_TABS: Tab[] = ["highlights", "reels", "stories"];

function sanitizeHandle(value: string) {
  return value.replace(/^@+/, "").trim();
}

/** Junta base + nome respeitando o separador do caminho (Windows ou posix). */
function joinPath(base: string, name: string) {
  if (!base) return `downloads/${name || "perfil"}`;
  const sep = base.includes("\\") ? "\\" : "/";
  return `${base.replace(/[\\/]+$/, "")}${sep}${name || "perfil"}`;
}

export function AddAccountDialog({
  onAdd,
}: {
  onAdd: (data: { account: string; savePath: string; media: MediaType[]; tabs: Tab[] }) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState("");
  const [baseDir, setBaseDir] = useState("");
  const [savePath, setSavePath] = useState("");
  const [savePathTouched, setSavePathTouched] = useState(false);
  const [media, setMedia] = useState<MediaType[]>(DEFAULT_MEDIA);
  const [tabs, setTabs] = useState<Tab[]>(DEFAULT_TABS);

  // Default = pasta de downloads existente (absoluta).
  useEffect(() => {
    if (!open) return;
    api
      .defaultDir()
      .then((d) => setBaseDir(d.path))
      .catch(() => setBaseDir(""));
  }, [open]);

  const handle = sanitizeHandle(account);
  const canAdd = handle.length > 0;
  const effectiveSavePath =
    savePathTouched && savePath.length > 0 ? savePath : joinPath(baseDir, handle);

  function reset() {
    setAccount("");
    setSavePath("");
    setSavePathTouched(false);
    setMedia(DEFAULT_MEDIA);
    setTabs(DEFAULT_TABS);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function submit() {
    if (!canAdd) return;
    onAdd({ account: handle, savePath: effectiveSavePath, media, tabs });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button>
                  <Plus />
                  {t("addAccount.trigger")}
                </Button>
              }
            />
          }
        />
        <TooltipContent>{t("addAccount.triggerTip")}</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addAccount.title")}</DialogTitle>
          <DialogDescription>{t("addAccount.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-account-handle" className="text-xs text-muted-foreground">
              {t("addAccount.handleLabel")}
            </Label>
            <Input
              id="add-account-handle"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={t("addAccount.handlePlaceholder")}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          <SavePathPicker
            id="add-account-savepath"
            value={effectiveSavePath}
            onChange={(v) => {
              setSavePath(v);
              setSavePathTouched(true);
            }}
          />

          <MediaTypeToggle value={media} onChange={setMedia} />
          <TabSelector value={tabs} onChange={setTabs} />
        </div>

        <DialogFooter>
          <Tooltip>
            <TooltipTrigger
              render={<DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />}
            />
            <TooltipContent>{t("common.dismiss")}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button onClick={submit} disabled={!canAdd}>
                  <Plus />
                  {t("addAccount.submit")}
                </Button>
              }
            />
            <TooltipContent>
              {canAdd ? t("addAccount.submitTipOk") : t("addAccount.submitTipNeed")}
            </TooltipContent>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
