#!/usr/bin/env python3
"""OPCIONAL: extrai a faixa de áudio de cada vídeo para audio/<perfil>/.

NÃO é necessário para o pipeline de notas — o MCP transcreve o áudio do vídeo
direto. Use só se você também quiser arquivos de áudio soltos para ouvir.
Requer ffmpeg no PATH.

Uso:
    python scripts/extract_audio.py <perfil> [--format m4a|mp3|wav]
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = ROOT / "downloads"
AUDIO = ROOT / "audio"


def main() -> None:
    p = argparse.ArgumentParser(description="Extrai áudio dos vídeos baixados (opcional).")
    p.add_argument("profile")
    p.add_argument("--format", default="m4a", choices=["m4a", "mp3", "wav"])
    args = p.parse_args()

    if shutil.which("ffmpeg") is None:
        sys.exit("ffmpeg não encontrado no PATH.")

    src = DOWNLOADS / args.profile
    out = AUDIO / args.profile
    out.mkdir(parents=True, exist_ok=True)

    count = 0
    for mp4 in sorted(src.rglob("*.mp4")):
        dst = out / f"{mp4.stem}.{args.format}"
        if dst.exists():
            continue
        cmd = ["ffmpeg", "-y", "-i", str(mp4), "-vn"]
        if args.format == "mp3":
            cmd += ["-q:a", "0"]
        elif args.format == "m4a":
            cmd += ["-c:a", "aac", "-b:a", "192k"]
        else:  # wav 16k mono — bom p/ STT
            cmd += ["-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1"]
        cmd.append(str(dst))
        subprocess.run(cmd, check=True)
        count += 1
        print("✓", dst.name)

    print(f"{count} áudios extraídos em {out}")


if __name__ == "__main__":
    main()
