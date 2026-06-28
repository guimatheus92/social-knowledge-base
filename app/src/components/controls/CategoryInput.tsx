"use client";
import { Input } from "@/components/ui/input";
import { capitalize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

/** Broad starting presets; the user can also type any custom category. */
const PRESETS = [
  "Travel",
  "Tech",
  "Finance",
  "Food",
  "Fitness",
  "Education",
  "Business",
  "News",
  "Gaming",
  "Music",
  "Health",
  "Sports",
  "Fashion",
  "Lifestyle",
];

/**
 * Free-text category field: type anything (first letter auto-capitalized) or
 * pick one of the suggestion chips below. Chips instead of a native <datalist>
 * so it stays on-brand and never opens a clipped/misaligned browser popup.
 */
export function CategoryInput({
  id,
  value,
  onChange,
  suggestions = [],
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  suggestions?: string[];
}) {
  const t = useT();
  const options = [...new Set([...suggestions, ...PRESETS])];
  const current = value.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(capitalize(e.target.value))}
        placeholder={t("category.placeholder")}
        autoComplete="off"
        maxLength={40}
      />
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = current === o.toLowerCase();
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(active ? "" : o)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition",
                active
                  ? "border-coral/50 bg-coral/15 text-foreground"
                  : "border-border text-muted-foreground hover:border-coral/40 hover:text-foreground",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
