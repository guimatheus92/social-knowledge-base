"use client";

import { RefreshCw } from "lucide-react";

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
  disabled,
}: {
  onSync: () => void;
  disabled?: boolean;
}) {
  const t = useT();
  const trigger = (
    <Button variant="outline" size="sm" disabled={disabled}>
      <RefreshCw />
      {t("sync.button")}
    </Button>
  );

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                disabled ? (
                  <span className="inline-flex cursor-not-allowed">
                    {trigger}
                  </span>
                ) : (
                  trigger
                )
              }
            />
          }
        />
        <TooltipContent>
          {disabled
            ? t("sync.tooltipDisabled")
            : t("sync.tooltip")}
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
        <AlertDialogFooter>
          <AlertDialogCancel>{t("sync.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onSync}>
            {t("sync.button")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
