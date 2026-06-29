"use client";
import { useEffect, useState } from "react";
import { HardDrive, Loader2, Trash2 } from "lucide-react";
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
import { formatBytes } from "@/lib/format";
import { useT } from "@/i18n/I18nProvider";

/**
 * Confirm + delete one or many media items (file + sidecars + note).
 * With `keepNotes`, only the media is removed and the curated note stays on
 * disk — the item still leaves the gallery, but the knowledge survives.
 */
export function DeleteMediaButton({
  account,
  postIds,
  onDeleted,
  variant = "outline",
  label,
  keepNotes = false,
}: {
  account: string;
  postIds: string[];
  onDeleted?: () => void;
  variant?: "outline" | "ghost" | "destructive";
  /** Override the trigger text (defaults to a single/bulk label). */
  label?: string;
  /** "Free up space": delete the media but keep the note on disk. */
  keepNotes?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const n = postIds.length;
  const many = n > 1;
  const Icon = keepNotes ? HardDrive : Trash2;

  // When the "free space" dialog opens, find how many selected items have no
  // note yet — freeing those deletes the only copy of their content with nothing
  // kept. The dialog is modal, so the selection is fixed while it's open.
  const [noteInfo, setNoteInfo] = useState<{ total: number; noted: number } | null>(null);
  useEffect(() => {
    if (!open || !keepNotes) return;
    let cancelled = false;
    api
      .noteCount(account, postIds)
      .then((info) => {
        if (!cancelled) setNoteInfo(info);
      })
      .catch(() => {
        /* best-effort: no warning if the probe fails */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per open; selection is fixed while the modal is open
  }, [open, keepNotes, account]);

  async function doDelete() {
    if (!n) return;
    setBusy(true);
    try {
      const r = await api.deleteItems(account, postIds, keepNotes);
      if (keepNotes) {
        // Honor the engine's freedBytes contract: if the file was locked the row
        // still drops but nothing is reclaimed — don't claim space was freed.
        if (r.freedBytes > 0)
          toast.success(t("delete.freeDone", { n: r.deleted, size: formatBytes(r.freedBytes) }));
        else toast.warning(t("delete.freeNone", { n: r.deleted }));
      } else {
        toast.success(many ? t("delete.bulkDone", { n: r.deleted }) : t("delete.itemDone"));
      }
      setOpen(false);
      onDeleted?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const triggerText =
    label ??
    (keepNotes
      ? t("delete.freeTrigger", { n })
      : many
        ? t("delete.bulkTrigger", { n })
        : t("delete.itemTrigger"));
  const title = keepNotes
    ? t("delete.freeTitle", { n })
    : many
      ? t("delete.bulkTitle", { n })
      : t("delete.itemTitle");
  const description = keepNotes
    ? t("delete.freeDescription")
    : many
      ? t("delete.bulkDescription")
      : t("delete.itemDescription");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setNoteInfo(null);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button variant={variant} size="sm" disabled={!n}>
            <Icon />
            {triggerText}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {keepNotes && noteInfo && noteInfo.noted < noteInfo.total && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {noteInfo.noted === 0
              ? t("delete.freeNoNoteAll", { total: noteInfo.total })
              : t("delete.freeNoNoteSome", { n: noteInfo.total - noteInfo.noted, total: noteInfo.total })}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={doDelete} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Icon />}
            {keepNotes ? t("delete.freeConfirm") : t("delete.itemConfirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
