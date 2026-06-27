"use client";
import { useState } from "react";
import { Check, Film, Play } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";
import type { Item } from "@/lib/types";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ItemTile({
  account,
  item,
  onSelect,
  handle,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  account: string;
  item: Item;
  onSelect: () => void;
  /** When set (the global Gallery), shows which profile this media belongs to. */
  handle?: string;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const t = useT();
  const [broken, setBroken] = useState(false);

  return (
    <button
      type="button"
      onClick={selectMode ? onToggleSelect : onSelect}
      title={selectMode ? t("delete.select") : t("tile.openDetail")}
      className={cn(
        "group relative aspect-[9/16] overflow-hidden rounded-xl bg-muted text-left ring-1 transition duration-200",
        selected
          ? "ring-2 ring-coral"
          : "ring-border hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_var(--coral)] hover:ring-2 hover:ring-coral/60",
      )}
    >
      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/accounts/${encodeURIComponent(account)}/items/${item.postId}/thumb`}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="size-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-b from-violet/25 to-coral/10 text-muted-foreground">
          <Film className="size-6" />
        </div>
      )}

      {selectMode && (
        <span
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center transition",
            selected ? "bg-coral/25" : "bg-black/30 opacity-0 group-hover:opacity-100",
          )}
        >
          <span
            className={cn(
              "grid size-8 place-items-center rounded-full border-2 backdrop-blur-sm transition",
              selected ? "border-coral bg-coral text-white" : "border-white/80 text-transparent",
            )}
          >
            <Check className="size-5" />
          </span>
        </span>
      )}

      {/* bottom scrim so the controls stay legible over any thumbnail */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent" />

      {/* [@handle] origin (left) + file size (right) */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-1 p-2">
        <span className="flex min-w-0 items-center gap-1">
          {handle ? (
            <span className="truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              @{handle}
            </span>
          ) : null}
          <span className="shrink-0 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {t(`origin.${item.origin}`)}
          </span>
        </span>
        {item.fileSize ? (
          <span className="shrink-0 rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-sm">
            {formatBytes(item.fileSize)}
          </span>
        ) : null}
      </div>

      {/* play affordance (left) + duration (right) */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-2">
        <span className="grid size-7 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur-md transition group-hover:bg-coral group-hover:ring-coral">
          <Play className="size-3.5 fill-white text-white" />
        </span>
        {item.durationS ? (
          <span className="rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm">
            {formatDuration(item.durationS)}
          </span>
        ) : null}
      </div>
    </button>
  );
}
