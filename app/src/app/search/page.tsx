"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, ScrollText, Search as SearchIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VideoDetailDialog } from "@/components/library/VideoDetailDialog";
import { api } from "@/lib/api";
import { useT } from "@/i18n/I18nProvider";

export default function SearchPage() {
  const t = useT();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [sel, setSel] = useState<{ account: string; postId: string } | null>(null);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => api.search(submitted, 12),
    enabled: submitted.trim().length > 0,
  });

  const hits = data?.hits ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 p-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label={t("search.back")}
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("search.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("search.subtitle")}</p>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={!q.trim()}>
          {isFetching ? <Loader2 className="animate-spin" /> : <SearchIcon />}
          {t("search.go")}
        </Button>
      </form>

      {isFetching && <p className="text-sm text-muted-foreground">{t("search.searching")}</p>}
      {isError && (
        <p className="text-sm text-destructive">{(error as Error)?.message || t("search.error")}</p>
      )}
      {!submitted && !isFetching && (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("search.prompt")}</p>
      )}
      {submitted && !isFetching && !isError && hits.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("search.empty")}</p>
      )}

      <div className="space-y-3">
        {hits.map((h, i) => {
          const Icon = h.kind === "note" ? FileText : ScrollText;
          const clickable = Boolean(h.account && h.postId);
          return (
            <button
              key={`${h.path}-${i}`}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && setSel({ account: h.account!, postId: h.postId! })}
              className="glass flex w-full flex-col gap-2 rounded-2xl p-4 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:ring-1 enabled:hover:ring-coral/40 disabled:cursor-default"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="size-3.5 text-coral" />
                <span>{h.kind === "note" ? t("detail.note") : t("detail.transcript")}</span>
                {h.account && <span>· @{h.account}</span>}
                <span className="ml-auto font-mono">{Math.round(h.score * 100)}%</span>
              </div>
              <p className="line-clamp-4 text-sm whitespace-pre-wrap text-foreground/90">{h.excerpt}</p>
            </button>
          );
        })}
      </div>

      <VideoDetailDialog
        account={sel?.account ?? null}
        postId={sel?.postId ?? null}
        open={sel !== null}
        onOpenChange={(o) => {
          if (!o) setSel(null);
        }}
      />
    </main>
  );
}
