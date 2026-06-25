"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/i18n/I18nProvider";

export function JobLog({ lines }: { lines: string[] }) {
  const t = useT();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{t("joblog.title")}</span>
      <ScrollArea className="h-40 rounded-lg border bg-muted/30">
        {lines.length === 0 ? (
          <div className="flex h-40 items-center justify-center p-3 text-xs text-muted-foreground">
            {t("joblog.empty")}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-3 font-mono text-xs text-muted-foreground">
            {lines.map((line, i) => (
              <div key={i} className="break-words whitespace-pre-wrap">
                {line}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
