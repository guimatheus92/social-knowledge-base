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
      className="group relative aspect-[9/16] overflow-hidden rounded-lg border bg-muted text-left"
    >
      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/accounts/${encodeURIComponent(account)}/items/${item.postId}/thumb`}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="size-full object-cover transition duration-200 group-hover:scale-105"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Film className="size-6" />
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5">
        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {ORIGIN_LABEL[item.origin] ?? item.origin}
        </span>
        {item.fileSize ? (
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
            {formatBytes(item.fileSize)}
          </span>
        ) : null}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
        <div className="rounded-full bg-black/60 p-2">
          <Play className="size-5 text-white" />
        </div>
      </div>
    </button>
  );
}
