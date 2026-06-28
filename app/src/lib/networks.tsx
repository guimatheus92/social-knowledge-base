/**
 * UI metadata for the supported source networks. The provider *behavior* lives
 * server-side in `server/providers`; this is the client-safe view (label, brand
 * glyph, colors, availability) shared by the avatar, the add dialog, etc.
 * Adding a network = one entry here + a SourceProvider in the server registry.
 *
 * Brand glyphs are inline SVGs on purpose: lucide-react keeps removing brand
 * icons (Instagram/YouTube/… are gone), so we don't depend on them.
 */
import type { ComponentType } from "react";

type IconProps = { className?: string };

function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 14 2h-3v13.18a2.6 2.6 0 1 1-2.6-2.6c.27 0 .53.04.78.12V9.6a5.65 5.65 0 1 0 4.87 5.58V9.2a7.2 7.2 0 0 0 4.25 1.36V7.5a4.27 4.27 0 0 1-1.7-1.68z" />
    </svg>
  );
}

function YouTubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export interface NetworkMeta {
  id: string;
  label: string;
  Icon: ComponentType<IconProps>;
  /** CSS gradient for the account avatar / badge. */
  gradient: string;
  /** Whether downloading from this network is wired up yet. */
  available: boolean;
}

export const NETWORKS: NetworkMeta[] = [
  {
    id: "instagram",
    label: "Instagram",
    Icon: InstagramIcon,
    gradient: "linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf)",
    available: true,
  },
  {
    id: "tiktok",
    label: "TikTok",
    Icon: TikTokIcon,
    gradient: "linear-gradient(135deg,#25f4ee,#1c1c1e,#fe2c55)",
    available: false,
  },
  {
    id: "youtube",
    label: "YouTube",
    Icon: YouTubeIcon,
    gradient: "linear-gradient(135deg,#ff4e45,#c4302b)",
    available: false,
  },
];

export const DEFAULT_NETWORK = "instagram";

export function networkMeta(id?: string | null): NetworkMeta {
  return NETWORKS.find((n) => n.id === id) ?? NETWORKS[0];
}

/** Public URL of a handle's profile on its network (opens the creator's page). */
export function profileUrl(network: string | null | undefined, account: string): string {
  const a = encodeURIComponent(account);
  switch (network) {
    case "tiktok":
      return `https://www.tiktok.com/@${a}`;
    case "youtube":
      return `https://www.youtube.com/@${a}`;
    case "instagram":
    default:
      return `https://www.instagram.com/${a}/`;
  }
}
