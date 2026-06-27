"use client";
import { Input } from "@/components/ui/input";
import { capitalize } from "@/lib/format";
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

/** Free-text category field with preset suggestions; first letter is auto-capitalized. */
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
  const listId = `${id}-list`;
  const options = [...new Set([...suggestions, ...PRESETS])];
  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(capitalize(e.target.value))}
        placeholder={t("category.placeholder")}
        autoComplete="off"
        maxLength={40}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
