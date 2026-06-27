/**
 * Cross-account media listing for the global Gallery. Each profile has its own
 * SQLite manifest, so this merges them in memory, then filters / sorts /
 * paginates. Fine for a local single-user tool (a few thousand items); if a
 * collection ever dwarfs RAM, switch to ATTACH + a UNION query.
 */
import { getAccount, listAccountNames, listItems } from "@/server/db/repository";
import type { GalleryItem, GalleryQuery } from "@/lib/types";

export type GalleryOpts = GalleryQuery & { limit?: number; offset?: number };

export function listGallery(opts: GalleryOpts): { items: GalleryItem[]; total: number } {
  const names = opts.profile ? [opts.profile] : listAccountNames();
  const all: GalleryItem[] = [];
  for (const account of names) {
    const acc = getAccount(account);
    if (!acc) continue;
    if (opts.network && acc.network !== opts.network) continue;
    if (opts.category && (acc.category ?? "") !== opts.category) continue;
    const items = listItems(account, {
      q: opts.q,
      media: opts.media,
      origin: opts.origin,
      limit: 1_000_000,
    });
    for (const it of items) {
      if (!it.relPath) continue; // only media actually on disk
      all.push({ ...it, account, network: acc.network, category: acc.category ?? null });
    }
  }

  const dir = opts.order === "asc" ? 1 : -1;
  const sort = opts.sort ?? "date";
  all.sort((a, b) => {
    if (sort === "size") return ((a.fileSize ?? 0) - (b.fileSize ?? 0)) * dir;
    if (sort === "duration") return ((a.durationS ?? 0) - (b.durationS ?? 0)) * dir;
    // "date" = when it was added (downloaded); fall back to the chronological id.
    const at = a.downloadedAt ?? "";
    const bt = b.downloadedAt ?? "";
    if (at && bt && at !== bt) return (at < bt ? -1 : 1) * dir;
    const an = Number(a.postId);
    const bn = Number(b.postId);
    if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
    return a.postId.localeCompare(b.postId) * dir;
  });

  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(200, Math.max(1, opts.limit ?? 48));
  return { items: all.slice(offset, offset + limit), total: all.length };
}
