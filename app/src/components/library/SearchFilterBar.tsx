"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ItemFilters } from "@/hooks/useItems";
import { useT } from "@/i18n/I18nProvider";

export function SearchFilterBar({
  value,
  onChange,
}: {
  value: ItemFilters;
  onChange: (f: ItemFilters) => void;
}) {
  const t = useT();
  const [q, setQ] = useState(value.q ?? "");

  // Debounce the search (don't refetch on every keystroke).
  useEffect(() => {
    const t = setTimeout(() => onChange({ ...value, q: q || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const set = (p: Partial<ItemFilters>) => onChange({ ...value, ...p });

  // <SelectValue> can't resolve value→label without an "items" prop, so pass a
  // child function to map each value to its localized label.
  const v = (x: unknown) => String(x ?? "");
  const originLabel = (x: unknown) =>
    ({
      highlight: t("library.originHighlight"),
      reel: t("library.originReel"),
      story: t("library.originStory"),
      post: t("library.originPost"),
    })[v(x)] ?? t("library.originAll");
  const mediaLabel = (x: unknown) =>
    v(x) === "video" ? t("library.mediaVideo") : v(x) === "image" ? t("library.mediaImage") : t("library.mediaAll");
  const sortLabel = (x: unknown) => (v(x) === "size" ? t("library.sortSize") : t("library.sortDate"));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("library.searchPlaceholder")}
          className="pl-8"
        />
      </div>

      <Select value={value.origin ?? "all"} onValueChange={(v) => set({ origin: v && v !== "all" ? v : undefined })}>
        <SelectTrigger className="w-40">
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

      <Select value={value.media ?? "all"} onValueChange={(v) => set({ media: v && v !== "all" ? v : undefined })}>
        <SelectTrigger className="w-36">
          <SelectValue>{mediaLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("library.mediaAll")}</SelectItem>
          <SelectItem value="video">{t("library.mediaVideo")}</SelectItem>
          <SelectItem value="image">{t("library.mediaImage")}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.sort ?? "date"} onValueChange={(v) => v && set({ sort: v as "date" | "size" })}>
        <SelectTrigger className="w-40">
          <SelectValue>{sortLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">{t("library.sortDate")}</SelectItem>
          <SelectItem value="size">{t("library.sortSize")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
