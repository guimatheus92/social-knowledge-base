"use client";

import { useEffect, useState } from "react";
import { ChevronDown, KeyRound, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

type LoginStatus = "valid" | "expired" | "unknown";

const STATUS_BADGE: Record<LoginStatus, { labelKey: string; className: string }> = {
  valid: { labelKey: "login.statusValid", className: "bg-emerald-500/15 text-emerald-400" },
  expired: { labelKey: "login.statusExpired", className: "bg-red-500/15 text-red-400" },
  unknown: { labelKey: "login.statusUnknown", className: "bg-muted text-muted-foreground" },
};

function StatusBadge({ status }: { status: LoginStatus }) {
  const t = useT();
  const badge = STATUS_BADGE[status];
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", badge.className)}>
      {t(badge.labelKey)}
    </span>
  );
}

function fileName(p: string): string {
  return p.split(/[\\/]/).pop() || p;
}

/**
 * Network config (the login cookies) — a distinct, collapsible strip so it
 * doesn't read like another profile card. Collapsed once the cookie is valid
 * (you rarely touch it); auto-opens when it's missing or expired.
 */
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
  const [open, setOpen] = useState(!cookiesPath);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- open the panel when the cookie status flips to expired
    if (status === "expired") setOpen(true);
  }, [status]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
        aria-expanded={open}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-muted-foreground">
          <KeyRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("login.title")}</span>
            <StatusBadge status={status} />
          </div>
          {!open && (
            <span className="block truncate font-mono text-xs text-muted-foreground">
              {cookiesPath ? fileName(cookiesPath) : t("login.description")}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">{t("login.description")}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cookies-path">{t("login.cookiesFileLabel")}</Label>
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
              <TooltipContent>{t("login.exportTooltip")}</TooltipContent>
            </Tooltip>
          </div>

          {status === "expired" && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-400">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {t("login.expiredWarning")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
