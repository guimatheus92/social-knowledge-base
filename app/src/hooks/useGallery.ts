"use client";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { GalleryQuery } from "@/lib/types";

export const GALLERY_LIMIT = 48;

/** The Gallery's filter/sort state — same shape the server validates. */
export type GalleryFilters = GalleryQuery;

export function useGallery(f: GalleryFilters) {
  return useInfiniteQuery({
    queryKey: ["gallery", f],
    // Keep the current grid on screen while a filter change refetches (no flash).
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      if (f.q) sp.set("q", f.q);
      if (f.profile) sp.set("profile", f.profile);
      if (f.network) sp.set("network", f.network);
      if (f.category) sp.set("category", f.category);
      if (f.media) sp.set("media", f.media);
      if (f.origin) sp.set("origin", f.origin);
      sp.set("sort", f.sort ?? "date");
      sp.set("order", f.order ?? "desc");
      sp.set("limit", String(GALLERY_LIMIT));
      sp.set("offset", String(pageParam));
      return api.gallery(sp.toString());
    },
    getNextPageParam: (last, pages) =>
      last.items.length < GALLERY_LIMIT ? undefined : pages.length * GALLERY_LIMIT,
  });
}
