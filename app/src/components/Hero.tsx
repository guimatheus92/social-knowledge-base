"use client";

import type { CSSProperties } from "react";
import { formatBytes, formatNumber } from "@/lib/format";
import type { AccountSummary } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";

// The signature element: a cinematic banner where the media itself is the
// backdrop. A wall of vertical (9:16) tiles bleeds in from the right and
// dissolves into the page; the display headline states what the library is for.
export function Hero({ accounts }: { accounts: AccountSummary[] | undefined }) {
  const { t, locale } = useI18n();
  const list = accounts ?? [];
  const videos = list.reduce((n, a) => n + (a.counts.byMedia.video ?? 0), 0);
  const images = list.reduce((n, a) => n + (a.counts.byMedia.image ?? 0), 0);
  const bytes = list.reduce((n, a) => n + (a.counts.bytesTotal ?? 0), 0);
  const downloading = list.some((a) => a.job?.status === "running");
  const empty = list.length === 0;
  const plural = (n: number, one: string, many: string) => t(n === 1 ? one : many);

  const eyebrow = empty
    ? t("hero.eyebrowEmpty")
    : downloading
      ? t("hero.eyebrowLive")
      : t("hero.eyebrowIdle");

  // Decorative media wall — vertical tiles tinted with the brand spectrum.
  const tints = [
    "from-coral/80 to-magenta/20",
    "from-violet/80 to-coral/20",
    "from-magenta/80 to-violet/20",
    "from-coral/70 to-violet/20",
    "from-violet/70 to-magenta/20",
    "from-magenta/70 to-coral/20",
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border">
      {/* ambient brand wash */}
      <div className="absolute inset-0 opacity-30 [background:radial-gradient(120%_140%_at_85%_-20%,var(--coral),transparent_45%),radial-gradient(120%_160%_at_100%_120%,var(--violet),transparent_50%)]" />

      {/* media wall (right), fading into the page */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-3/5 items-center justify-end gap-3 pr-6 [mask-image:linear-gradient(to_right,transparent,black_60%)] sm:flex"
        aria-hidden
      >
        {tints.map((tint, i) => (
          <div
            key={i}
            className={`hero-tile h-[78%] w-[14%] shrink-0 rounded-2xl bg-gradient-to-b ${tint} ring-1 ring-white/10`}
            style={{ "--y0": `${i % 2 ? 16 : -10}px`, animationDelay: `${i * 0.5}s` } as CSSProperties}
          />
        ))}
      </div>

      {/* legibility scrim */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />

      <div className="relative flex flex-col gap-3 p-7 sm:p-9">
        <span className="inline-flex w-fit items-center gap-2 text-xs font-medium tracking-[0.18em] text-coral uppercase">
          {downloading && <span className="animate-live size-2 rounded-full bg-coral" />}
          {eyebrow}
        </span>
        <h2 className="max-w-xl font-heading text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl">
          {t("hero.title")}
        </h2>
        <p className="font-mono text-sm text-muted-foreground">
          {empty
            ? t("hero.empty")
            : t("hero.summary", {
                videos: formatNumber(videos, locale),
                vw: plural(videos, "hero.wVideo", "hero.wVideos"),
                images: formatNumber(images, locale),
                iw: plural(images, "hero.wImage", "hero.wImages"),
                size: formatBytes(bytes),
                accounts: formatNumber(list.length, locale),
                aw: plural(list.length, "hero.wAccount", "hero.wAccounts"),
              })}
        </p>
      </div>
    </section>
  );
}
