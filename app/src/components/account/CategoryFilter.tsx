"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_CATEGORIES, NO_CATEGORY } from "@/lib/categoryFilter";
import { useT } from "@/i18n/I18nProvider";

/** Filter the profile list by category. Value is a category, or the ALL/NONE sentinels. */
export function CategoryFilter({
  categories,
  value,
  onChange,
  hasUncategorized,
}: {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
  hasUncategorized: boolean;
}) {
  const t = useT();
  const label = (v: string) =>
    v === ALL_CATEGORIES ? t("filter.allCategories") : v === NO_CATEGORY ? t("filter.noCategory") : v;

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? ALL_CATEGORIES)}>
      <SelectTrigger size="sm" className="w-[12rem]" aria-label={t("filter.category")}>
        <SelectValue>{(v) => label(String(v))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_CATEGORIES}>{t("filter.allCategories")}</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
        {hasUncategorized && <SelectItem value={NO_CATEGORY}>{t("filter.noCategory")}</SelectItem>}
      </SelectContent>
    </Select>
  );
}
