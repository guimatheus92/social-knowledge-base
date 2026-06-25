"use client";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import {
  formatBytes,
  formatEta,
  formatNumber,
} from "@/lib/format";
import type { JobSnapshot } from "@/lib/types";

export function DownloadProgress({ job }: { job: JobSnapshot | null }) {
  const running = job?.status === "running";

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!job || (job.status as string) === "idle") return null;

  const percent =
    job.discovered > 0
      ? Math.min(100, (job.downloaded / job.discovered) * 100)
      : 0;

  const elapsed = job.startedAt ? (Date.now() - job.startedAt) / 1000 : 0;
  const ratePerSec = job.downloaded / Math.max(1, elapsed);
  const remaining = Math.max(0, job.discovered - job.downloaded);
  const showRate = running && elapsed > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <Progress value={percent} className="w-full" />
      <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
        <span>{formatNumber(job.downloaded)} baixados</span>
        <span aria-hidden>·</span>
        <span>{formatNumber(job.discovered)} descobertos</span>
        <span aria-hidden>·</span>
        <span>{formatBytes(job.bytesTotal)}</span>
        {showRate && (
          <>
            <span aria-hidden>·</span>
            <span>{Math.round(ratePerSec)}/s</span>
            <span aria-hidden>·</span>
            <span>ETA {formatEta(remaining, ratePerSec)}</span>
          </>
        )}
      </div>
      {job.rateLimited && (
        <span className="text-xs text-amber-400">
          ⚠ Rate-limited — aguardando
        </span>
      )}
    </div>
  );
}
