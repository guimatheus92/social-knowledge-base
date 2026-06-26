"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GalleryFilterBar } from "@/components/gallery/GalleryFilterBar";
import { ItemTile } from "@/components/library/ItemTile";
import { VideoDetailDialog } from "@/components/library/VideoDetailDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGallery, type GalleryFilters } from "@/hooks/useGallery";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";
import type { GalleryItem } from "@/lib/types";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

/** The global Gallery: every profile's media in one grid, with rich filters/sort. */
export function GalleryView() {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<GalleryFilters>({ sort: "date", order: "desc" });
  const [selected, setSelected] = useState<{ account: string; postId: string } | null>(null);

  // Reflect the open video in the URL (?a=<account>&v=<id>).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const a = sp.get("a");
    const v = sp.get("v");
    if (a && v) setSelected({ account: a, postId: v });
  }, []);

  // Warm any missing posters in the background so the grid fills in over time.
  useEffect(() => {
    void api.warmThumbnails().catch(() => {});
  }, []);
  function openItem(it: GalleryItem) {
    setSelected({ account: it.account, postId: it.postId });
    const url = new URL(window.location.href);
    url.searchParams.set("a", it.account);
    url.searchParams.set("v", it.postId);
    window.history.replaceState(null, "", url.toString());
  }
  function close() {
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("a");
    url.searchParams.delete("v");
    window.history.replaceState(null, "", url.toString());
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGallery(filters);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

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
          <h1 className="font-heading text-lg font-semibold">{t("gallery.heading")}</h1>
          <p className="text-xs text-muted-foreground">
            {t("gallery.subtitle", { n: formatNumber(total, locale) })}
          </p>
        </div>
      </header>

      <GalleryFilterBar value={filters} onChange={setFilters} />

      {isLoading ? (
        <div className={GRID}>
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("library.empty")}</p>
      ) : (
        <>
          <div className={GRID}>
            {items.map((it) => (
              <ItemTile
                key={`${it.account}/${it.postId}`}
                account={it.account}
                item={it}
                handle={it.account}
                onSelect={() => openItem(it)}
              />
            ))}
          </div>
          <div ref={sentinel} className="flex justify-center py-6 text-xs text-muted-foreground">
            {isFetchingNextPage ? (
              <Loader2 className="size-5 animate-spin" />
            ) : hasNextPage ? (
              <span>{t("library.loadMore")}</span>
            ) : (
              <span>{t("library.end", { n: formatNumber(items.length, locale) })}</span>
            )}
          </div>
        </>
      )}

      <VideoDetailDialog
        account={selected?.account ?? null}
        postId={selected?.postId ?? null}
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      />
    </main>
  );
}
