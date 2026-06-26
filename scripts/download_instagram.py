#!/usr/bin/env python3
"""Downloads every video from an Instagram profile (Reels, Stories, Highlights, Posts).

Uses **gallery-dl** (instaloader stopped working: the web GraphQL endpoint it
uses now returns 401 "Please wait a few minutes" since ~jan/2025).
gallery-dl authenticates via the **browser cookies** (export a cookies.txt
in Netscape format from a logged-in session) and downloads through the mobile API
route, which Instagram still accepts.

Records progress in manifest.json so the run is resumable (and gallery-dl's
--download-archive avoids re-downloading what already came in).

Usage:
    python scripts/download_instagram.py <profile> --cookies C:\\path\\ig_cookies.txt

Prerequisites:
    pip install -U gallery-dl yt-dlp        # download + merge of video/audio
    ffmpeg on the PATH (or installed via winget Gyan.FFmpeg) — without it the videos
    come in WITHOUT audio and transcription breaks. This script tries to find it on its own.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# UTF-8 output even on Windows (avoids mojibake/cp1252 in the script's prints).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = ROOT / "downloads"
MANIFEST = ROOT / "manifest.json"

# Profile tabs that gallery-dl knows how to download, and the corresponding `origem` value in the note.
TAB_ORIGIN = {
    "highlights": "highlight",
    "reels": "reel",
    "stories": "story",
    "posts": "post",
}
# Default covers every video without duplicating: on a creator account, "posts" (feed)
# is almost entirely the same reels. "posts" stays optional via --tabs.
DEFAULT_TABS = ["highlights", "reels", "stories"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_manifest(profile: str) -> dict:
    data = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    if not data.get("perfil"):
        data["perfil"] = profile
    data.setdefault("videos", {})
    data.setdefault("sintese", {"ultimo_overview_em": None, "videos_no_ultimo_overview": 0})
    return data


def save_manifest(data: dict) -> None:
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def find_ffmpeg_dir() -> str | None:
    """ffmpeg is required for yt-dlp to merge video+audio. Finds the directory of the
    binary even if it isn't on this session's PATH yet (a common case on Windows
    right after installing via winget — the PATH only takes effect in new sessions)."""
    found = shutil.which("ffmpeg")
    if found:
        return str(Path(found).parent)
    # Fallback: typical winget installation (Gyan.FFmpeg).
    local = os.environ.get("LOCALAPPDATA", "")
    if local:
        candidates = sorted(Path(local).glob(
            "Microsoft/WinGet/Packages/Gyan.FFmpeg*/*/bin/ffmpeg.exe"))
        if candidates:
            return str(candidates[-1].parent)
    return None


def build_env() -> dict:
    """Subprocess environment with ffmpeg (and Python's scripts dir) on the PATH,
    and PYTHONUTF8=1 so it doesn't break on cp1252 on Windows."""
    env = dict(os.environ)
    env["PYTHONUTF8"] = "1"
    extra_paths = []
    ff = find_ffmpeg_dir()
    if ff:
        extra_paths.append(ff)
    else:
        print("WARNING: ffmpeg not found — videos may come in WITHOUT audio. "
              "Install it with: winget install Gyan.FFmpeg", file=sys.stderr)
    extra_paths.append(str(Path(sys.executable).parent / "Scripts"))
    env["PATH"] = os.pathsep.join(extra_paths + [env.get("PATH", "")])
    return env


def run_gallery_dl(profile: str, cookies: str, tab: str, rng: str | None,
                   include_images: bool, env: dict) -> None:
    archive = DOWNLOADS / profile / ".gdl-archive.sqlite3"
    dest = DOWNLOADS / profile / tab
    cmd = [
        sys.executable, "-m", "gallery_dl",
        "--cookies", cookies,
        "--download-archive", str(archive),
        "-o", "videos=true",
        "-o", f"include={tab}",
        "-D", str(dest),
    ]
    if not include_images:
        cmd += ["--filter", "extension == 'mp4'"]
    if rng:
        cmd += ["--range", rng]
    cmd.append(f"https://www.instagram.com/{profile}/")

    print(f"-> [{tab}] gallery-dl ({'everything' if include_images else 'video only'})"
          f"{' range=' + rng if rng else ''}")
    result = subprocess.run(cmd, env=env)
    if result.returncode != 0:
        # gallery-dl may return !=0 over isolated items; don't abort the whole run.
        print(f"WARNING: gallery-dl exited with code {result.returncode} on tab '{tab}'",
              file=sys.stderr)


def infer_origin(mp4: Path, profile_dir: Path) -> str:
    rel = mp4.relative_to(profile_dir)
    if len(rel.parts) > 1:
        return TAB_ORIGIN.get(rel.parts[0], rel.parts[0])
    return "post"


def sync_manifest(profile: str) -> None:
    profile_dir = DOWNLOADS / profile
    if not profile_dir.exists():
        print(f"No downloads in {profile_dir}")
        return

    data = load_manifest(profile)
    videos = data["videos"]
    # Dedup by video id (file name): the same video can appear in
    # more than one tab (e.g. a reel that's also in the feed). Records only the 1st occurrence.
    seen_ids = {Path(k).stem for k in videos}
    added = 0
    for mp4 in sorted(profile_dir.rglob("*.mp4")):
        if mp4.stem in seen_ids:
            continue
        seen_ids.add(mp4.stem)
        key = mp4.relative_to(ROOT).as_posix()
        videos[key] = {
            "origem": infer_origin(mp4, profile_dir),
            "baixado_em": now_iso(),
            "lido_em": None,
            "nota": None,
            "status": "baixado",
            "erro": None,
        }
        added += 1

    save_manifest(data)
    print(f"manifest.json: +{added} new videos (total {len(videos)})")


def main() -> None:
    p = argparse.ArgumentParser(
        description="Downloads videos from an Instagram profile (incl. Highlights) via gallery-dl.")
    p.add_argument("profile", help="target @profile (without @)")
    p.add_argument("--cookies", help="cookies.txt (Netscape) from a logged-in IG session")
    p.add_argument("--tabs", default=",".join(DEFAULT_TABS),
                   help=f"tabs to download, comma-separated (default: {','.join(DEFAULT_TABS)})")
    p.add_argument("--range", dest="rng", default=None,
                   help="limit items per tab, e.g.: 1-50 (handy for testing)")
    p.add_argument("--include-images", action="store_true",
                   help="also download photos (default: video only)")
    p.add_argument("--skip-download", action="store_true",
                   help="only re-sync the manifest with the .mp4 files already in downloads/")
    args = p.parse_args()

    DOWNLOADS.mkdir(exist_ok=True)

    if not args.skip_download:
        if not args.cookies:
            sys.exit("Missing --cookies <cookies.txt>. Export the browser cookies "
                     "(the 'Get cookies.txt LOCALLY' extension) from a logged-in IG session.")
        if not Path(args.cookies).exists():
            sys.exit(f"cookies.txt not found: {args.cookies}")
        env = build_env()
        tabs = [t.strip() for t in args.tabs.split(",") if t.strip()]
        for tab in tabs:
            if tab not in TAB_ORIGIN:
                print(f"WARNING: unknown tab '{tab}', skipping", file=sys.stderr)
                continue
            run_gallery_dl(args.profile, args.cookies, tab, args.rng,
                           args.include_images, env)

    sync_manifest(args.profile)


if __name__ == "__main__":
    main()
