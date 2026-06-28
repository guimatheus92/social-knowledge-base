"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { formatBytes, formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";

/** Destructive: remove a profile from the app, optionally deleting its files too. */
export function DeleteAccountButton({
  account,
  totalItems,
  bytesTotal,
}: {
  account: string;
  totalItems: number;
  bytesTotal: number;
}) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    setBusy(true);
    try {
      const r = await api.deleteAccount(account, deleteFiles);
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(
        deleteFiles && r.freedBytes
          ? t("delete.accountDoneFreed", { account, size: formatBytes(r.freedBytes) })
          : t("delete.accountDone", { account }),
      );
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setDeleteFiles(false);
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("delete.accountTrigger")}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              }
            />
          }
        />
        <TooltipContent>{t("delete.accountTrigger")}</TooltipContent>
      </Tooltip>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete.accountTitle", { account })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("delete.accountDescription", { n: formatNumber(totalItems, locale) })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <label className="flex items-start gap-2.5 rounded-lg border border-border bg-white/[0.03] px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
            className="mt-0.5 size-4 accent-coral"
          />
          <span>
            {t("delete.alsoFiles", { size: formatBytes(bytesTotal) })}
            <span className="mt-0.5 block text-xs text-muted-foreground">{t("delete.alsoFilesHint")}</span>
          </span>
        </label>

        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={doDelete} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {t("delete.accountConfirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
