"use client";
import { cn } from "@/lib/utils";
import { networkMeta } from "@/lib/networks";

/** Account identity: a network-tinted initial with a small network-glyph badge. */
export function AccountAvatar({
  account,
  network,
  className,
}: {
  account: string;
  network?: string | null;
  className?: string;
}) {
  const net = networkMeta(network);
  const Icon = net.Icon;
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className="grid size-11 place-items-center rounded-xl font-heading text-lg font-semibold text-white shadow-[0_6px_18px_-8px_rgba(0,0,0,0.7)]"
        style={{ background: net.gradient }}
      >
        {account.charAt(0).toUpperCase()}
      </div>
      <span
        className="absolute -right-1.5 -bottom-1.5 grid size-5 place-items-center rounded-full ring-2 ring-background"
        style={{ background: net.gradient }}
        aria-label={net.label}
      >
        <Icon className="size-3 text-white" />
      </span>
    </div>
  );
}
