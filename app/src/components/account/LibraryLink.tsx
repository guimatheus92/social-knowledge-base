"use client";
import { Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";

/**
 * The "Library" entry on an account card. Navigates via an onClick that assigns
 * `window.location` rather than an `<a>`/Next `<Link>`: a click inside this card
 * has its default prevented somewhere up the tree in the production build, which
 * silently swallows anchor navigation — but the onClick handler still fires, and
 * a direct location assignment isn't subject to it. Disabled when the account is
 * empty (nothing to browse).
 */
export function LibraryLink({ account, hasMedia }: { account: string; hasMedia: boolean }) {
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={!hasMedia}
      title={hasMedia ? t("card.libraryTooltip") : t("card.libraryEmptyTooltip")}
      onClick={() => window.location.assign(`/library/${encodeURIComponent(account)}`)}
    >
      <Images className="size-4" />
      {t("card.library")}
    </Button>
  );
}
