"use client";
import { ChevronRight } from "lucide-react";
import { networkMeta } from "@/lib/networks";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";
import type { AccountSummary } from "@/lib/types";

/** Overview entry for a social network — click to drill into its accounts. */
export function NetworkCard({
  network,
  accounts,
  onEnter,
}: {
  network: string;
  accounts: AccountSummary[];
  onEnter: () => void;
}) {
  const { t, locale } = useI18n();
  const meta = networkMeta(network);
  const Icon = meta.Icon;
  const videos = accounts.reduce((s, a) => s + (a.counts.byMedia.video ?? 0), 0);
  const accountWord = accounts.length === 1 ? t("hero.wAccount") : t("hero.wAccounts");

  return (
    <button
      type="button"
      onClick={onEnter}
      className="glass group flex w-full items-center gap-4 rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)]"
    >
      <div
        className="grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-[0_8px_22px_-8px_rgba(0,0,0,0.7)]"
        style={{ background: meta.gradient }}
      >
        <Icon className="size-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-heading text-lg font-semibold">{meta.label}</div>
        <div className="text-sm text-muted-foreground">
          {accounts.length} {accountWord} · {formatNumber(videos, locale)} {t("hero.wVideos")}
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  );
}
