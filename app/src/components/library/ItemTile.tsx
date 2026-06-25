"use client";
import { useState } from "react";
import { Film, Play } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { Item } from "@/lib/types";

const ORIGIN_LABEL: Record<string, string> = {
  highlight: "Destaque",
  reel: "Reel",
  story: "Story",
  post: "Post",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ItemTile({ account, item }: { account: string; item: Item }) {
  const [broken, setBroken] = useState(false);

  async function open() {
    try {
      await api.openFile(account, item.postId);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      title="Abrir no player do sistema"
      className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-muted text-left ring-1 ring-border transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_var(--coral)] hover:ring-2 hover:ring-coral/60"
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

      {/* bottom scrim so the controls stay legible over any thumbnail */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent" />

      {/* origin (left) + file size (right) */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
        <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {ORIGIN_LABEL[item.origin] ?? item.origin}
        </span>
        {item.fileSize ? (
          <span className="rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-sm">
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
