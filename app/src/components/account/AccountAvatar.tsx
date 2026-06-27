"use client";
import { cn } from "@/lib/utils";
import { networkMeta } from "@/lib/networks";

// Per-profile identity color, drawn from the brand spectrum so the wall of
// accounts isn't a sea of one color (the network is shown by the badge below).
const AVATAR_GRADIENTS = [
  "linear-gradient(140deg, var(--coral), var(--magenta))",
  "linear-gradient(140deg, var(--violet), var(--coral))",
  "linear-gradient(140deg, var(--cyan), var(--violet))",
  "linear-gradient(140deg, var(--amber), var(--coral))",
  "linear-gradient(140deg, var(--good), var(--cyan))",
  "linear-gradient(140deg, var(--magenta), var(--violet))",
  "linear-gradient(140deg, var(--coral), var(--amber))",
  "linear-gradient(140deg, var(--violet), var(--magenta))",
];

function avatarGradient(account: string): string {
  let h = 0;
  for (let i = 0; i < account.length; i++) h = (h * 31 + account.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

/** Account identity: a profile-colored initial with a small network-glyph badge. */
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
        style={{ background: avatarGradient(account) }}
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
