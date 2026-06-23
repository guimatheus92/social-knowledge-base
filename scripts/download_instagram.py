#!/usr/bin/env python3
"""Baixa todos os vídeos de um perfil do Instagram (Reels, Stories, Em Destaque).

Envolve o `instaloader` e registra o progresso em manifest.json para a execução
ser retomável. Use uma CONTA DESCARTÁVEL no --login: highlights/stories exigem
login e o Instagram pode aplicar rate-limit/ban a scrapers.

Uso:
    python scripts/download_instagram.py <perfil> --login <sua_conta>

Primeira vez (cria a sessão reutilizável; pede senha):
    instaloader --login <sua_conta>
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = ROOT / "downloads"
MANIFEST = ROOT / "manifest.json"


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


def infer_origin(mp4: Path, profile_dir: Path) -> str:
    """Heurística: arquivos em subpasta provavelmente vêm de um Destaque."""
    rel = mp4.relative_to(profile_dir)
    if len(rel.parts) > 1:
        return f"highlight:{rel.parts[0]}"
    return "post/reel/story"


def run_instaloader(profile: str, login: str, args: argparse.Namespace) -> None:
    if shutil.which("instaloader") is None:
        sys.exit("instaloader não encontrado. Instale com: pip install -U instaloader")

    cmd = [
        "instaloader",
        "--no-pictures",
        "--no-video-thumbnails",
        "--login", login,
        "--dirname-pattern", str(DOWNLOADS / "{profile}"),
        "--request-timeout", "60",
    ]
    if not args.no_reels:
        cmd.append("--reels")
    if not args.no_stories:
        cmd.append("--stories")
    if not args.no_highlights:
        cmd.append("--highlights")
    if args.fast_update:
        cmd.append("--fast-update")
    cmd.append(profile)

    print("→", " ".join(cmd))
    subprocess.run(cmd, check=True)


def sync_manifest(profile: str) -> None:
    profile_dir = DOWNLOADS / profile
    if not profile_dir.exists():
        print(f"Nenhum download em {profile_dir}")
        return

    data = load_manifest(profile)
    videos = data["videos"]
    added = 0
    for mp4 in sorted(profile_dir.rglob("*.mp4")):
        key = mp4.relative_to(ROOT).as_posix()
        if key in videos:
            continue
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
    print(f"manifest.json: +{added} novos vídeos (total {len(videos)})")


def main() -> None:
    p = argparse.ArgumentParser(
        description="Baixa vídeos de um perfil do Instagram (incl. Em Destaque) e atualiza o manifest."
    )
    p.add_argument("profile", help="@perfil alvo (sem @)")
    p.add_argument("--login", required=True, help="sua conta (use uma descartável)")
    p.add_argument("--no-reels", action="store_true", help="não baixar a aba de reels")
    p.add_argument("--no-stories", action="store_true", help="não baixar stories")
    p.add_argument("--no-highlights", action="store_true", help="não baixar Em Destaque")
    p.add_argument("--fast-update", action="store_true",
                   help="para no primeiro já-baixado (retomada rápida)")
    p.add_argument("--skip-download", action="store_true",
                   help="só re-sincroniza o manifest com os arquivos já em downloads/")
    args = p.parse_args()

    DOWNLOADS.mkdir(exist_ok=True)
    if not args.skip_download:
        run_instaloader(args.profile, args.login, args)
    sync_manifest(args.profile)


if __name__ == "__main__":
    main()
