"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CategoryInput } from "@/components/controls/CategoryInput";
import { useAccounts } from "@/hooks/useAccounts";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

/** Editable category chip on the account card (click to set/change). */
export function CategoryBadge({ account, category }: { account: string; category: string | null }) {
  const t = useT();
  const qc = useQueryClient();
  const { data: accounts } = useAccounts();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(category ?? "");
  const [saving, setSaving] = useState(false);

  const suggestions = [...new Set((accounts ?? []).map((a) => a.category).filter(Boolean))] as string[];

  async function save() {
    setSaving(true);
    try {
      await api.patchAccount(account, { category: value.trim() });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(t("category.saved"));
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(category ?? "");
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring/40",
                    category
                      ? "border-coral/30 bg-coral/10 text-foreground"
                      : "border-dashed border-border text-muted-foreground hover:border-coral/40 hover:text-foreground",
                  )}
                >
                  <Tag className="size-3" />
                  {category || t("category.add")}
                </button>
              }
            />
          }
        />
        <TooltipContent>{t("category.editTooltip")}</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("category.dialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cat-${account}`} className="text-xs text-muted-foreground">
            {t("category.label")}
          </Label>
          <CategoryInput id={`cat-${account}`} value={value} onChange={setValue} suggestions={suggestions} />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />
          <Button onClick={save} disabled={saving}>
            {t("category.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
