#!/usr/bin/env python3
"""Convert an Instagram media id (pk) back into the clickable link.

The `id` used in the notes/guide is the media's **pk**; Instagram builds the URL
from the shortcode, which is the pk in base64 (custom alphabet). This is that
conversion.

Works for **reels and posts**. Stories and "Em Destaque" (Highlights) are
ephemeral — the link may not resolve (media expires / the highlight has its own
URL).

Usage:
    python scripts/video_url.py 3924652210327473259 [<id> ...]
"""

from __future__ import annotations

import sys

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"


def pk_to_shortcode(pk: int) -> str:
    s = ""
    while pk > 0:
        pk, r = divmod(pk, 64)
        s = ALPHABET[r] + s
    return s


def video_url(pk: str | int) -> str:
    """Public URL (use /p/, which works for both reels and posts)."""
    return f"https://www.instagram.com/p/{pk_to_shortcode(int(pk))}/"


def main() -> None:
    ids = sys.argv[1:]
    if not ids:
        sys.exit("Uso: python scripts/video_url.py <id> [<id> ...]")
    for pk in ids:
        try:
            print(f"{pk} -> {video_url(pk)}")
        except ValueError:
            print(f"{pk} -> (id inválido)", file=sys.stderr)


if __name__ == "__main__":
    main()
