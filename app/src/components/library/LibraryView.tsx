"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CheckCheck, CheckSquare, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { SearchFilterBar } from "@/components/library/SearchFilterBar";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { VideoDetailDialog } from "@/components/library/VideoDetailDialog";
import { DeleteMediaButton } from "@/components/library/DeleteMediaButton";
import { Button } from "@/components/ui/button";
import { useStats } from "@/hooks/useAccounts";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";
import type { ItemFilters } from "@/hooks/useItems";
import type { Item } from "@/lib/types";

export function LibraryView({ account }: { account: string }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ItemFilters>({ sort: "date" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectingAll, setSelectingAll] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  // Reflect the open video in the URL (?v=<id>) — shareable + survives a reload.
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the open video from the URL on mount (client-only)
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

  // "Select all" reaches every item matching the current filter — not just the
  // pages already loaded into the grid — by pulling the full id list from the API.
  async function selectAll() {
    const sp = new URLSearchParams();
    if (filters.q) sp.set("q", filters.q);
    if (filters.status) sp.set("status", filters.status);
    if (filters.media) sp.set("media", filters.media);
    if (filters.origin) sp.set("origin", filters.origin);
    setSelectingAll(true);
    try {
      const { ids } = await api.itemIds(account, sp.toString());
      setSelected(new Set(ids));
    } catch (e) {
      console.error("[selectAll] failed", e);
      toast.error(t("delete.selectAllFailed"));
    } finally {
      setSelectingAll(false);
    }
  }

  // Cross-cutting invalidations after items are deleted or freed.
  function afterMutate() {
    exitSelect();
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["stats", account] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["gallery"] });
  }

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

      {selectMode ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("delete.selectedCount", { n: selected.size })}</span>
          <Button variant="ghost" size="sm" onClick={selectAll} disabled={selectingAll}>
            {selectingAll ? <Loader2 className="animate-spin" /> : <CheckCheck />}
            {t("delete.selectAll")}
          </Button>
          {selected.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              {t("delete.clearSel")}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <DeleteMediaButton account={account} postIds={[...selected]} keepNotes onDeleted={afterMutate} />
                <DeleteMediaButton
                  account={account}
                  postIds={[...selected]}
                  variant="destructive"
                  onDeleted={afterMutate}
                />
              </>
            )}
            <Button variant="ghost" size="sm" onClick={exitSelect}>
              <X />
              {t("delete.selectDone")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
            <CheckSquare />
            {t("delete.select")}
          </Button>
        </div>
      )}

      <LibraryGrid
        account={account}
        filters={filters}
        onSelect={openVideo}
        selectMode={selectMode}
        selected={selected}
        onToggleSelect={toggleSelect}
      />

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
