"use client";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useT } from "@/i18n/I18nProvider";

/** Confirm + delete one or many media items (file + sidecars + note). */
export function DeleteMediaButton({
  account,
  postIds,
  onDeleted,
  variant = "outline",
  label,
}: {
  account: string;
  postIds: string[];
  onDeleted?: () => void;
  variant?: "outline" | "ghost" | "destructive";
  /** Override the trigger text (defaults to a single/bulk label). */
  label?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const many = postIds.length > 1;

  async function doDelete() {
    if (!postIds.length) return;
    setBusy(true);
    try {
      const r = await api.deleteItems(account, postIds);
      toast.success(many ? t("delete.bulkDone", { n: r.deleted }) : t("delete.itemDone"));
      setOpen(false);
      onDeleted?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant={variant} size="sm" disabled={!postIds.length}>
            <Trash2 />
            {label ?? (many ? t("delete.bulkTrigger", { n: postIds.length }) : t("delete.itemTrigger"))}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {many ? t("delete.bulkTitle", { n: postIds.length }) : t("delete.itemTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {many ? t("delete.bulkDescription") : t("delete.itemDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={doDelete} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {t("delete.itemConfirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
