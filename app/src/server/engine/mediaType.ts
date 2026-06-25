/** image|video classification by extension + gallery-dl filter generation. */
import { extname } from "node:path";
import type { MediaType } from "@/lib/types";

const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv", ".m4v"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".gif"]);

export function mediaTypeForFile(file: string): MediaType | null {
  const ext = extname(file).toLowerCase();
  if (VIDEO_EXT.has(ext)) return "video";
  if (IMAGE_EXT.has(ext)) return "image";
  return null;
}

/** Extensions (without the dot) for gallery-dl's `--filter`, by media type. */
const VIDEO_FILTER = ["mp4", "mov", "webm", "mkv", "m4v"];
const IMAGE_FILTER = ["jpg", "jpeg", "png", "webp", "heic"];

/**
 * `--filter` args for gallery-dl based on the chosen media types.
 * Both → no filter (downloads everything). Only one → restrict by extension.
 */
export function mediaFilterArgs(mediaTypes: MediaType[]): string[] {
  const wantVideo = mediaTypes.includes("video");
  const wantImage = mediaTypes.includes("image");
  if (wantVideo && wantImage) return [];
  const exts = wantVideo ? VIDEO_FILTER : wantImage ? IMAGE_FILTER : VIDEO_FILTER;
  const list = exts.map((e) => `'${e}'`).join(",");
  return ["--filter", `extension in (${list})`];
}
