"use client";
import { useEffect, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAccounts } from "@/hooks/useAccounts";
import { networkMeta } from "@/lib/networks";
import type { GalleryFilters } from "@/hooks/useGallery";
import type { MediaType, Origin } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";

/** Rich filter/sort row for the global Gallery: profile, network, media, origin, sort, order. */
export function GalleryFilterBar({
  value,
  onChange,
}: {
  value: GalleryFilters;
  onChange: (f: GalleryFilters) => void;
}) {
  const t = useT();
  const { data: accounts } = useAccounts();
  const [q, setQ] = useState(value.q ?? "");

  useEffect(() => {
    const id = setTimeout(() => onChange({ ...value, q: q || undefined }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const set = (p: Partial<GalleryFilters>) => onChange({ ...value, ...p });
  const profiles = [...(accounts ?? [])].map((a) => a.account).sort();
  const networks = [...new Set((accounts ?? []).map((a) => a.network))];
  const categories = [...new Set((accounts ?? []).map((a) => a.category).filter(Boolean))] as string[];
  const order = value.order ?? "desc";

  // Base UI's <SelectValue> renders the raw value; map each to its localized label.
  const v = (x: unknown) => String(x ?? "");
  const profileLabel = (x: unknown) => (v(x) && v(x) !== "all" ? `@${v(x)}` : t("gallery.profileAll"));
  const networkLabel = (x: unknown) =>
    v(x) && v(x) !== "all" ? networkMeta(v(x)).label : t("gallery.networkAll");
  const categoryLabel = (x: unknown) => (v(x) && v(x) !== "all" ? v(x) : t("gallery.categoryAll"));
  const mediaLabel = (x: unknown) =>
    v(x) === "video" ? t("library.mediaVideo") : v(x) === "image" ? t("library.mediaImage") : t("library.mediaAll");
  const originLabel = (x: unknown) =>
    ({
      highlight: t("library.originHighlight"),
      reel: t("library.originReel"),
      story: t("library.originStory"),
      post: t("library.originPost"),
    })[v(x)] ?? t("library.originAll");
  const sortLabel = (x: unknown) =>
    v(x) === "size" ? t("library.sortSize") : v(x) === "duration" ? t("gallery.sortDuration") : t("library.sortDate");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("gallery.searchPlaceholder")}
          className="pl-8"
        />
      </div>

      <Select
        value={value.profile ?? "all"}
        onValueChange={(val) => set({ profile: val && val !== "all" ? val : undefined })}
      >
        <SelectTrigger size="sm" className="w-40">
          <SelectValue>{profileLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("gallery.profileAll")}</SelectItem>
          {profiles.map((p) => (
            <SelectItem key={p} value={p}>
              @{p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {networks.length > 1 && (
        <Select
          value={value.network ?? "all"}
          onValueChange={(val) => set({ network: val && val !== "all" ? val : undefined })}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue>{networkLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("gallery.networkAll")}</SelectItem>
            {networks.map((n) => (
              <SelectItem key={n} value={n}>
                {networkMeta(n).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {categories.length > 0 && (
        <Select
          value={value.category ?? "all"}
          onValueChange={(val) => set({ category: val && val !== "all" ? val : undefined })}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue>{categoryLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("gallery.categoryAll")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={value.media ?? "all"}
        onValueChange={(val) => set({ media: val && val !== "all" ? (val as MediaType) : undefined })}
      >
        <SelectTrigger size="sm" className="w-32">
          <SelectValue>{mediaLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("library.mediaAll")}</SelectItem>
          <SelectItem value="video">{t("library.mediaVideo")}</SelectItem>
          <SelectItem value="image">{t("library.mediaImage")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.origin ?? "all"}
        onValueChange={(val) => set({ origin: val && val !== "all" ? (val as Origin) : undefined })}
      >
        <SelectTrigger size="sm" className="w-36">
          <SelectValue>{originLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("library.originAll")}</SelectItem>
          <SelectItem value="highlight">{t("library.originHighlight")}</SelectItem>
          <SelectItem value="reel">{t("library.originReel")}</SelectItem>
          <SelectItem value="story">{t("library.originStory")}</SelectItem>
          <SelectItem value="post">{t("library.originPost")}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.sort ?? "date"} onValueChange={(val) => val && set({ sort: val as GalleryFilters["sort"] })}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue>{sortLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">{t("library.sortDate")}</SelectItem>
          <SelectItem value="size">{t("library.sortSize")}</SelectItem>
          <SelectItem value="duration">{t("gallery.sortDuration")}</SelectItem>
        </SelectContent>
      </Select>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t(order === "desc" ? "gallery.orderDesc" : "gallery.orderAsc")}
              onClick={() => set({ order: order === "desc" ? "asc" : "desc" })}
            >
              {order === "desc" ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
            </Button>
          }
        />
        <TooltipContent>{t(order === "desc" ? "gallery.orderDesc" : "gallery.orderAsc")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
