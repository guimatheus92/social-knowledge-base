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
import { CategoryInput } from "@/components/controls/CategoryInput";
import { useT } from "@/i18n/I18nProvider";
import { api } from "@/lib/api";
import { useAccounts } from "@/hooks/useAccounts";
import { cn } from "@/lib/utils";
import { NETWORKS, DEFAULT_NETWORK } from "@/lib/networks";
import type { MediaType, Tab } from "@/lib/types";

const DEFAULT_MEDIA: MediaType[] = ["video"];
const DEFAULT_TABS: Tab[] = ["highlights", "reels", "stories"];

function sanitizeHandle(value: string) {
  return value.replace(/^@+/, "").trim();
}

/** Joins base + name respecting the path separator (Windows or posix). */
function joinPath(base: string, name: string) {
  if (!base) return `downloads/${name || "perfil"}`;
  const sep = base.includes("\\") ? "\\" : "/";
  return `${base.replace(/[\\/]+$/, "")}${sep}${name || "perfil"}`;
}

export function AddAccountDialog({
  onAdd,
}: {
  onAdd: (data: {
    account: string;
    savePath: string;
    media: MediaType[];
    tabs: Tab[];
    network: string;
    category: string;
  }) => void;
}) {
  const t = useT();
  const { data: accounts } = useAccounts();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [baseDir, setBaseDir] = useState("");
  const [savePath, setSavePath] = useState("");
  const [savePathTouched, setSavePathTouched] = useState(false);
  const [media, setMedia] = useState<MediaType[]>(DEFAULT_MEDIA);
  const [tabs, setTabs] = useState<Tab[]>(DEFAULT_TABS);
  const [network, setNetwork] = useState(DEFAULT_NETWORK);

  // Default = existing downloads folder (absolute).
  useEffect(() => {
    if (!open) return;
    api
      .defaultDir()
      .then((d) => setBaseDir(d.path))
      .catch(() => setBaseDir(""));
  }, [open]);

  const handle = sanitizeHandle(account);
  const canAdd = handle.length > 0;
  const catSuggestions = [...new Set((accounts ?? []).map((a) => a.category).filter(Boolean))] as string[];
  const effectiveSavePath =
    savePathTouched && savePath.length > 0 ? savePath : joinPath(baseDir, handle);

  function reset() {
    setAccount("");
    setCategory("");
    setSavePath("");
    setSavePathTouched(false);
    setMedia(DEFAULT_MEDIA);
    setTabs(DEFAULT_TABS);
    setNetwork(DEFAULT_NETWORK);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function submit() {
    if (!canAdd) return;
    onAdd({ account: handle, savePath: effectiveSavePath, media, tabs, network, category });
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
            <Label className="text-xs text-muted-foreground">{t("addAccount.networkLabel")}</Label>
            <div className="flex flex-wrap gap-2">
              {NETWORKS.map((n) => {
                const Icon = n.Icon;
                const active = network === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    disabled={!n.available}
                    onClick={() => setNetwork(n.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                      active
                        ? "border-coral/60 bg-coral/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-white/5",
                      !n.available && "cursor-not-allowed opacity-50 hover:bg-transparent",
                    )}
                  >
                    <span
                      className="grid size-5 place-items-center rounded-md"
                      style={{ background: n.gradient }}
                    >
                      <Icon className="size-3 text-white" />
                    </span>
                    {n.label}
                    {!n.available && (
                      <span className="text-[10px] tracking-wide uppercase opacity-70">
                        {t("network.comingSoon")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-account-category" className="text-xs text-muted-foreground">
              {t("category.labelOptional")}
            </Label>
            <CategoryInput
              id="add-account-category"
              value={category}
              onChange={setCategory}
              suggestions={catSuggestions}
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
