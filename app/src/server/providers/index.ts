/**
 * Social network abstraction (the app is multi-network). Everything that **varies
 * per platform** in the download lives here; the engine (spawn/parse/upsert) and
 * the knowledge pipeline (transcription/analysis/RAG) are agnostic.
 *
 * Adding a network = adding a SourceProvider to the REGISTRY. Instagram is the
 * first; TikTok comes through the same gallery-dl. YouTube (yt-dlp) will be a
 * provider with its own engine in a later phase.
 */
export interface SourceProvider {
  /** stable id (becomes the account's `network` column). */
  id: string;
  label: string;
  /** Content types the provider downloads = subfolders/"tabs". */
  kinds: string[];
  /** Default tab (the 1st) and tabs enabled by default. */
  defaultKinds: string[];
  /** Profile URL to enumerate all of the account's content. */
  profileUrl(account: string): string;
  /** Extra gallery-dl args to restrict to a single tab (IG: `include=<tab>`). */
  kindArgs(kind: string): string[];
  /** Does this standalone media URL belong to this provider? */
  matchesUrl(url: string): boolean;
  /** Derives the tab/folder from a media URL (for download-by-link). */
  kindFromUrl(url: string): string;
}

const instagram: SourceProvider = {
  id: "instagram",
  label: "Instagram",
  kinds: ["highlights", "reels", "stories", "posts"],
  defaultKinds: ["highlights", "reels", "stories"],
  profileUrl: (a) => `https://www.instagram.com/${a.replace(/^@/, "")}/`,
  kindArgs: (kind) => ["-o", `include=${kind}`],
  matchesUrl: (u) => /(^|\.)instagram\.com\//i.test(u),
  kindFromUrl: (u) =>
    /\/reels?\//i.test(u) ? "reels" : /\/stories\//i.test(u) ? "stories" : "posts",
};

const tiktok: SourceProvider = {
  id: "tiktok",
  label: "TikTok",
  kinds: ["videos"],
  defaultKinds: ["videos"],
  profileUrl: (a) => `https://www.tiktok.com/@${a.replace(/^@/, "")}`,
  kindArgs: () => [], // gallery-dl downloads the whole profile; no "tabs"
  matchesUrl: (u) => /(^|\.)tiktok\.com\//i.test(u),
  kindFromUrl: () => "videos",
};

const REGISTRY: Record<string, SourceProvider> = { instagram, tiktok };
export const DEFAULT_PROVIDER = "instagram";

export function getProvider(id?: string | null): SourceProvider {
  return (id && REGISTRY[id]) || REGISTRY[DEFAULT_PROVIDER];
}

/** Finds the provider that owns a standalone media URL (download-by-link). */
export function providerForUrl(url: string): SourceProvider | null {
  return Object.values(REGISTRY).find((p) => p.matchesUrl(url)) ?? null;
}

export function listProviders(): SourceProvider[] {
  return Object.values(REGISTRY);
}
