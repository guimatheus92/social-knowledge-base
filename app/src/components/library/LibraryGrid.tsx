"use client";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useItems, type ItemFilters } from "@/hooks/useItems";
import { ItemTile } from "@/components/library/ItemTile";
import { Skeleton } from "@/components/ui/skeleton";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

export function LibraryGrid({ account, filters }: { account: string; filters: ItemFilters }) {
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
          <Skeleton key={i} className="aspect-[9/16] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  if (items.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Nada encontrado.</p>;
  }

  return (
    <>
      <div className={GRID}>
        {items.map((it) => (
          <ItemTile key={it.postId} account={account} item={it} />
        ))}
      </div>
      <div ref={sentinel} className="flex justify-center py-6 text-xs text-muted-foreground">
        {isFetchingNextPage ? (
          <Loader2 className="size-5 animate-spin" />
        ) : hasNextPage ? (
          <span>Role para carregar mais…</span>
        ) : (
          <span>{items.length} itens · fim.</span>
        )}
      </div>
    </>
  );
}
