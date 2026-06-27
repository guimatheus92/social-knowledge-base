"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/i18n/I18nProvider";

export function SyncButton({
  onSync,
  onPeek,
  disabled,
}: {
  onSync: () => void;
  onPeek?: () => Promise<{ newCount: number; checked: number; tab: string }>;
  disabled?: boolean;
}) {
  const t = useT();
  const [peeking, setPeeking] = useState(false);
  const [result, setResult] = useState<{ newCount: number; checked: number } | null>(null);

  async function doPeek() {
    if (!onPeek) return;
    setPeeking(true);
    try {
      setResult(await onPeek());
    } catch (e) {
      toast.error((e as Error).message || t("sync.peekError"));
    } finally {
      setPeeking(false);
    }
  }

  const trigger = (
    <Button variant="ghost" size="sm" disabled={disabled}>
      <RefreshCw />
      {t("sync.button")}
    </Button>
  );

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) {
          setResult(null);
          setPeeking(false);
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                disabled ? (
                  <span className="inline-flex cursor-not-allowed">{trigger}</span>
                ) : (
                  trigger
                )
              }
            />
          }
        />
        <TooltipContent>
          {disabled ? t("sync.tooltipDisabled") : t("sync.tooltip")}
        </TooltipContent>
      </Tooltip>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("sync.dialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("sync.dialogDescriptionBefore")}{" "}
            <strong>{t("sync.dialogDescriptionAction")}</strong>{" "}
            {t("sync.dialogDescriptionAfter")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {onPeek && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white/[0.03] px-3 py-2.5 text-sm">
            <Button variant="outline" size="sm" onClick={doPeek} disabled={peeking}>
              {peeking ? <Loader2 className="animate-spin" /> : <Search />}
              {t("sync.checkNew")}
            </Button>
            {result && (
              <span className={result.newCount > 0 ? "font-medium text-coral" : "text-muted-foreground"}>
                {result.newCount > 0
                  ? t("sync.peekResult", { n: result.newCount, checked: result.checked })
                  : t("sync.peekNone")}
              </span>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t("sync.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onSync}>{t("sync.button")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
