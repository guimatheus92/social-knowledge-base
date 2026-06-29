"use client";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useJobsStore } from "@/store/jobs";
import { useT } from "@/i18n/I18nProvider";
import type { StreamMessage } from "@/lib/types";

/**
 * Subscribes to a job's SSE: applies events to the store, revalidates stats, and
 * notifies. `enabled` gates the connection — keep it false for idle accounts so a
 * dashboard full of cards doesn't hold one persistent SSE each and exhaust the
 * browser's ~6 connections-per-host limit (which would block all navigation).
 */
export function useJobStream(account: string | null, enabled = true): void {
  const applyMessage = useJobsStore((s) => s.applyMessage);
  const qc = useQueryClient();
  const t = useT();
  // Keep the latest t() without re-subscribing the SSE when the locale changes.
  // Write the ref in an effect (not during render) so the SSE callbacks, which
  // read it asynchronously, always see the latest committed translator.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });
  // Avoids repeating the same warning toast during a job.
  const warned = useRef({ rate: false, cookies: false });
  const jobMode = useRef<string>("full");

  useEffect(() => {
    if (!account || !enabled) return;
    warned.current = { rate: false, cookies: false };
    const es = new EventSource(`/api/jobs/${encodeURIComponent(account)}/stream`);
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as StreamMessage;
        applyMessage(account, msg);
        const tt = tRef.current;
        if (msg.t === "job_start") {
          jobMode.current = msg.mode;
          warned.current = { rate: false, cookies: false };
        } else if (msg.t === "rate_limited" && !warned.current.rate) {
          warned.current.rate = true;
          toast.warning(tt("job.rateLimited", { account }));
        } else if (msg.t === "cookies_expired" && !warned.current.cookies) {
          warned.current.cookies = true;
          toast.error(tt("job.cookiesExpired", { account }));
        } else if (msg.t === "job_done") {
          if (jobMode.current === "count") {
            toast.success(tt("job.countDone", { account, count: msg.skipped }));
          } else if (msg.status === "stopped") {
            toast.message(tt("job.stopped", { account }));
          } else if (msg.status === "error") {
            toast.error(tt("job.error", { account, count: msg.errors }));
          } else if (msg.downloaded === 0 && msg.skipped > 0) {
            if (jobMode.current === "incremental") {
              toast.message(tt("job.noNews", { account }));
            } else {
              toast.success(tt("job.allDownloaded", { account }));
            }
          } else if (msg.skipped) {
            toast.success(
              tt("job.doneSkipped", { account, downloaded: msg.downloaded, skipped: msg.skipped }),
            );
          } else {
            toast.success(tt("job.done", { account, downloaded: msg.downloaded }));
          }
          qc.invalidateQueries({ queryKey: ["accounts"] });
          qc.invalidateQueries({ queryKey: ["stats", account] });
        } else if (msg.t === "tab_done") {
          qc.invalidateQueries({ queryKey: ["accounts"] });
          qc.invalidateQueries({ queryKey: ["stats", account] });
        }
      } catch {
        /* non-JSON line (ping) */
      }
    };
    return () => es.close();
  }, [account, enabled, applyMessage, qc]);
}
