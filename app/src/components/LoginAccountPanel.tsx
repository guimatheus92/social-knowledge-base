"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";
import { KeyRound, TriangleAlert } from "lucide-react";

type LoginStatus = "valid" | "expired" | "unknown";

const STATUS_BADGE: Record<LoginStatus, { labelKey: string; className: string }> = {
  valid: {
    labelKey: "login.statusValid",
    className: "bg-emerald-500/15 text-emerald-400",
  },
  expired: {
    labelKey: "login.statusExpired",
    className: "bg-red-500/15 text-red-400",
  },
  unknown: {
    labelKey: "login.statusUnknown",
    className: "bg-muted text-muted-foreground",
  },
};

function StatusBadge({ status }: { status: LoginStatus }) {
  const t = useT();
  const badge = STATUS_BADGE[status];
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        badge.className,
      )}
    >
      {t(badge.labelKey)}
    </span>
  );
}

export function LoginAccountPanel({
  cookiesPath,
  status,
  onChange,
}: {
  cookiesPath: string;
  status: LoginStatus;
  onChange: (path: string) => void;
}) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          {t("login.title")}
        </CardTitle>
        <CardDescription>
          {t("login.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="cookies-path">{t("login.cookiesFileLabel")}</Label>
            <StatusBadge status={status} />
          </div>
          <Input
            id="cookies-path"
            value={cookiesPath}
            onChange={(e) => onChange(e.target.value)}
            placeholder="cookies.txt"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{t("login.howToExport")}</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={t("login.howToExportAria")}
                  className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
                />
              }
            >
              <TriangleAlert className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              {t("login.exportTooltip")}
            </TooltipContent>
          </Tooltip>
        </div>

        {status === "expired" && (
          <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-400">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {t("login.expiredWarning")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
