"use client";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";

export function ElapsedTimer({
  elapsedSeconds,
  startedAt,
  running,
  big,
}: {
  elapsedSeconds: number;
  startedAt: number | null;
  running?: boolean;
  big?: boolean;
}) {
  const live = Boolean(running && startedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  const value = live
    ? elapsedSeconds + (now - (startedAt as number)) / 1000
    : elapsedSeconds;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 tabular-nums",
        big ? "text-base font-medium" : "text-sm"
      )}
    >
      <Clock className={cn("text-muted-foreground", big ? "size-4" : "size-3.5")} />
      {formatDuration(value)}
    </span>
  );
}
