"use client";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useItems, type ItemFilters } from "@/hooks/useItems";
import { ItemTile } from "@/components/library/ItemTile";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n/I18nProvider";
import type { Item } from "@/lib/types";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

export function LibraryGrid({
  account,
  filters,
  onSelect,
  selectMode = false,
  selected,
  onToggleSelect,
}: {
  account: string;
  filters: ItemFilters;
  onSelect: (item: Item) => void;
  selectMode?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (postId: string) => void;
}) {
  const t = useT();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useItems(
    account,
    filters,
  );
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 18 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[9/16] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  if (items.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t("library.empty")}</p>;
  }

  return (
    <>
      <div className={GRID}>
        {items.map((it) => (
          <ItemTile
            key={it.postId}
            account={account}
            item={it}
            onSelect={() => onSelect(it)}
            selectMode={selectMode}
            selected={selected?.has(it.postId) ?? false}
            onToggleSelect={() => onToggleSelect?.(it.postId)}
          />
        ))}
      </div>
      <div ref={sentinel} className="flex justify-center py-6 text-xs text-muted-foreground">
        {isFetchingNextPage ? (
          <Loader2 className="size-5 animate-spin" />
        ) : hasNextPage ? (
          <span>{t("library.loadMore")}</span>
        ) : (
          <span>{t("library.end", { n: items.length })}</span>
        )}
      </div>
    </>
  );
}
