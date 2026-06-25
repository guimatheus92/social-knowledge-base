#!/usr/bin/env python3
"""BATCH-transcribe an account's videos on the GPU (faster-whisper + CUDA).

~20x faster than the openai-whisper CLI on CPU. Writes per-video sidecars
(`downloads/<conta>/transcripts/<post_id>.{txt,json}`) — resumable (skips the
ones that already have a sidecar). The notes phase (Opus) reads these sidecars.

Usage:
    python scripts/transcribe_gpu.py <conta> [--limit N] [--category reel|highlight|story]
                                              [--model medium] [--device cuda]
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import site
import sys
import time
from pathlib import Path

# CUDA DLLs from pip (cublas/cudnn/cudart/nvrtc) onto the DLL search path (Windows).
for _sp in set(site.getsitepackages() + [site.getusersitepackages()]):
    for _b in glob.glob(os.path.join(_sp, "nvidia", "*", "bin")):
        try:
            os.add_dll_directory(_b)
        except OSError:
            pass
        os.environ["PATH"] = _b + os.pathsep + os.environ.get("PATH", "")

import av  # noqa: E402  (ships with faster-whisper; used to detect the audio track)
from faster_whisper import WhisperModel  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = ROOT / "downloads"
MANIFESTS = ROOT / "manifests"


def has_audio(path: Path) -> bool:
    """Some clips (slideshow/photo, silent video) have no audio track — and
    faster-whisper crashes with 'tuple index out of range' when looking for the
    stream. Detect it up front so we can skip cleanly."""
    try:
        with av.open(str(path)) as c:
            return any(s.type == "audio" for s in c.streams)
    except Exception:  # noqa: BLE001
        return False

GLOSSARY = (
    "Glossário de milhas e pontos: Doha, Smiles, Livelo, Esfera, Iberia, Qatar Airways, "
    "TAP, Latam, Latam Pass, Azul, Azul Fidelidade, Azul Viagens, Clube Turbo, milheiro, "
    "Close Friends, Amex Centurion, Santander Unlimited, BRB Dux, Seat Spy, Banco Inter, "
    "Booking, emissões, executiva, bônus de transferência."
)


def _vtt_ts(seconds: float) -> str:
    """Seconds -> 'HH:MM:SS.mmm' (WebVTT format)."""
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def to_vtt(segs: list[dict]) -> str:
    """WebVTT sidecar — the video-analyzer MCP reads <stem>.vtt and skips Whisper."""
    lines = ["WEBVTT", ""]
    for s in segs:
        lines.append(f"{_vtt_ts(s['start'])} --> {_vtt_ts(s['end'])}")
        lines.append(s["text"])
        lines.append("")
    return "\n".join(lines)


def items_to_do(account: str, category: str | None, limit: int | None) -> list[tuple[str, str]]:
    from sqlite3 import connect  # node:sqlite is Node's; here we use Python's sqlite3

    db = connect(str(MANIFESTS / f"{account}.db"))
    q = "SELECT post_id, rel_path FROM item WHERE status='downloaded' AND media_type='video'"
    args: list = []
    if category:
        q += " AND origin=?"
        args.append(category)
    q += " ORDER BY post_id DESC"
    rows = db.execute(q, args).fetchall()
    db.close()
    out = []
    tdir = DOWNLOADS / account / "transcripts"
    for post_id, rel in rows:
        if (tdir / f"{post_id}.txt").exists():
            continue  # already transcribed (resumable)
        out.append((post_id, rel))
        if limit and len(out) >= limit:
            break
    return out


def main() -> None:
    p = argparse.ArgumentParser(description="Transcrição em lote na GPU (faster-whisper).")
    p.add_argument("account")
    p.add_argument("--limit", type=int)
    p.add_argument("--category", choices=["reel", "highlight", "story", "post"])
    p.add_argument("--model", default=os.environ.get("WHISPER_GPU_MODEL", "medium"))
    p.add_argument("--device", default="cuda")
    p.add_argument("--beam", type=int, default=1)
    args = p.parse_args()

    todo = items_to_do(args.account, args.category, args.limit)
    if not todo:
        print("Nada a transcrever (tudo já tem sidecar).")
        return
    tdir = DOWNLOADS / args.account / "transcripts"
    tdir.mkdir(parents=True, exist_ok=True)

    compute = "float16" if args.device == "cuda" else "int8"
    t0 = time.time()
    model = WhisperModel(args.model, device=args.device, compute_type=compute)
    print(f"Modelo {args.model} em {args.device}/{compute} carregado em {time.time() - t0:.1f}s. "
          f"{len(todo)} vídeos a transcrever.")

    done = 0
    silent = 0
    audio_total = 0.0
    wall0 = time.time()
    for post_id, rel in todo:
        video = ROOT / rel
        if not video.exists():
            continue
        if not has_audio(video):
            # silent clip (no audio track) -> mark as processed (empty .txt) and move on
            (tdir / f"{post_id}.txt").write_text("", encoding="utf-8")
            silent += 1
            continue
        try:
            t = time.time()
            segments, info = model.transcribe(
                str(video), language="pt", initial_prompt=GLOSSARY, beam_size=args.beam,
            )
            segs = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments]
        except Exception as e:  # noqa: BLE001
            print(f"  ERRO {post_id}: {e}", file=sys.stderr)
            continue
        (tdir / f"{post_id}.json").write_text(
            json.dumps({"duration": info.duration, "segments": segs}, ensure_ascii=False, indent=1),
            encoding="utf-8",
        )
        (tdir / f"{post_id}.txt").write_text(
            "\n".join(f"[{s['start']:.0f}] {s['text']}" for s in segs), encoding="utf-8",
        )
        # .vtt NEXT TO the video -> the MCP (findSidecarTranscript) reuses it and skips Whisper
        if segs:
            (video.parent / f"{post_id}.vtt").write_text(to_vtt(segs), encoding="utf-8")
        done += 1
        audio_total += info.duration or 0
        if done % 10 == 0 or done == len(todo):
            wall = time.time() - wall0
            print(f"  {done}/{len(todo)} | {audio_total / max(wall, 1):.0f}x tempo real "
                  f"| {wall:.0f}s decorridos", flush=True)

    print(f"Pronto: {done} transcritos, {silent} mudos (sem áudio) em {time.time() - wall0:.0f}s "
          f"(~{audio_total / max(time.time() - wall0, 1):.0f}x tempo real). Sidecars em {tdir}")


if __name__ == "__main__":
    main()
