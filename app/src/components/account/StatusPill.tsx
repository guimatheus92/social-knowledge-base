"use client";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";

const STYLES: Record<string, string> = {
  idle: "bg-muted text-muted-foreground",
  queued: "bg-amber-500/15 text-amber-400",
  running: "bg-coral/15 text-coral",
  paused: "bg-sky-500/15 text-sky-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  stopped: "bg-zinc-500/15 text-zinc-400",
  error: "bg-red-500/15 text-red-400",
};

export function StatusPill({
  status,
  rateLimited,
}: {
  status?: JobStatus | "idle" | null;
  rateLimited?: boolean;
}) {
  const t = useT();
  if (rateLimited) {
    return (
      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
        {t("status.rateLimited")}
      </span>
    );
  }
  const s = status ?? "idle";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STYLES[s] ?? STYLES.idle)}>
      <span
        className={cn(
          "mr-1 inline-block size-1.5 rounded-full bg-current align-middle",
          s === "running" && "animate-pulse",
        )}
      />
      {t(`status.${s}`)}
    </span>
  );
}
