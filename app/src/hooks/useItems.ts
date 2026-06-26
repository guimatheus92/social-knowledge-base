"use client";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const ITEMS_LIMIT = 36;

export interface ItemFilters {
  q?: string;
  status?: string;
  media?: string;
  origin?: string;
  sort?: "date" | "size";
}

export function useItems(account: string, f: ItemFilters) {
  return useInfiniteQuery({
    queryKey: ["items", account, f],
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      if (f.q) sp.set("q", f.q);
      if (f.status) sp.set("status", f.status);
      if (f.media) sp.set("media", f.media);
      if (f.origin) sp.set("origin", f.origin);
      sp.set("sort", f.sort ?? "date");
      sp.set("limit", String(ITEMS_LIMIT));
      sp.set("offset", String(pageParam));
      return api.items(account, sp.toString());
    },
    getNextPageParam: (last, pages) =>
      last.items.length < ITEMS_LIMIT ? undefined : pages.length * ITEMS_LIMIT,
  });
}
