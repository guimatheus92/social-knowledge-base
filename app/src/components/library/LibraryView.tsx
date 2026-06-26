"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SearchFilterBar } from "@/components/library/SearchFilterBar";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { VideoDetailDialog } from "@/components/library/VideoDetailDialog";
import { useStats } from "@/hooks/useAccounts";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";
import type { ItemFilters } from "@/hooks/useItems";
import type { Item } from "@/lib/types";

export function LibraryView({ account }: { account: string }) {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<ItemFilters>({ sort: "date" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reflect the open video in the URL (?v=<id>) — shareable + survives a reload.
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    if (v) setSelectedId(v);
  }, []);

  function openVideo(item: Item) {
    setSelectedId(item.postId);
    const url = new URL(window.location.href);
    url.searchParams.set("v", item.postId);
    window.history.replaceState(null, "", url.toString());
  }
  function closeVideo() {
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("v");
    window.history.replaceState(null, "", url.toString());
  }
  const { data: stats } = useStats(account);
  const total = stats?.counts.total ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={t("library.back")}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-heading text-lg font-semibold">
            {t("library.heading")} · <span className="text-primary">@{account}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("library.itemsInBase", { n: formatNumber(total, locale) })}
          </p>
        </div>
      </header>

      <SearchFilterBar value={filters} onChange={setFilters} />
      <LibraryGrid account={account} filters={filters} onSelect={openVideo} />

      <VideoDetailDialog
        account={account}
        postId={selectedId}
        open={selectedId !== null}
        onOpenChange={(o) => {
          if (!o) closeVideo();
        }}
      />
    </main>
  );
}
