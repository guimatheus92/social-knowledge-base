# CLAUDE.md — social-knowledge-base

> Instructions for Claude Code in this repo. **Read before acting.**

## Project

Knowledge base built from Instagram videos (Reels, Stories, and **Highlights**) of one or more accounts. Opus **watches** (frames + OCR of what appears on screen) and **listens** (PT-BR transcription) to each video and records what it learned in markdown.

## Goal

Download ALL videos from an account (including "Highlights"), analyze each one, and turn the content into queryable knowledge — for **many** videos, in a **resumable** way (pause and continue without reprocessing).

## How it works (4 layers)

1. **Download** (Python / gallery-dl) — `scripts/download_instagram.py` (or the **app** in `app/`) downloads the videos to `downloads/<profile>/<tab>/` and records progress. Authenticates via a browser `cookies.txt` (instaloader is dead: its GraphQL web endpoint returns `401` since ~Jan/2025). Injects `ffmpeg` into PATH (otherwise the video comes out without audio).
2. **Bulk transcription** (GPU) — `scripts/transcribe_gpu.py` runs **faster-whisper `medium` on CUDA** (~16–24× real time) with a domain glossary, and writes sidecars: `downloads/<profile>/transcripts/<id>.{txt,json}` + an `<id>.vtt` **next to the video**. This is the step that **scales** (~9.6k videos in hours, not the ~150h on CPU).
3. **Notes** (Claude Code + Opus + MCP `video-analyzer`) — following `prompts/build-notes.md`, processes **1 video per iteration**: reads the transcription (the MCP reuses the `.vtt` as a sidecar, without re-running Whisper) and **watches** frames + OCR via MCP, writing `notes/<profile>/videos/<id>.md`.
4. **Synthesis + RAG** — `prompts/synthesize-overview.md` generates `notes/<profile>/OVERVIEW.md` (theme-by-theme summary); `scripts/index_transcripts.py` + `scripts/index_notes.py` + `scripts/query.py` provide search (the library becomes searchable **with the transcription alone**, even before the curated note). Script details: [`scripts/CLAUDE.md`](scripts/CLAUDE.md).

## What to do (agent workflow)

- Generate notes → follow `prompts/build-notes.md`. **Always 1 video at a time**; skip the ones that have `read_at != null` in `manifest.json`.
- Summary → follow `prompts/synthesize-overview.md`.
- **Never** reprocess a video that is already `read`. **Never** dump dozens of videos into the same context (it blows up and gets expensive).

## Definition of success (NEVER forget)

1. Every video in the account (incl. Highlights) has a corresponding `.md` note.
2. Each note captures what was **said** (transcription) **and shown** (OCR/visual) — not a generic summary.
3. **Resumable** process: `manifest.json` records what was downloaded/read and *when*; pausing and resuming neither duplicates nor reprocesses.
4. Readable transcription **in the audio's language** (auto-detected) — **faster-whisper `medium` on GPU** + domain glossary (proper nouns correct: Doha, Smiles, Iberia…), not the imprecise `tiny`/`small`.
5. There is a per-profile index **and** a `notes/<profile>/OVERVIEW.md` (theme-by-theme summary) with links back to the notes.
6. You can **query** later (RAG): `query.py "what did I learn about X?"` returns notes with a citation.

## Data & storage

Where everything lives — the single map. **All of it is local/personal state —
gitignored, NOT versioned** (the repo ships only code + prompts + docs; your
collection is yours).

| What | Where | Notes |
|---|---|---|
| Raw videos / images | `downloads/<profile>/<tab>/` | the download output |
| Thumbnails (posters) | `downloads/<profile>/.thumbs/<id>.jpg` | generated lazily via ffmpeg (cap 3), cached on disk |
| Transcripts | `downloads/<profile>/transcripts/<id>.{txt,json}` + an `<id>.vtt` **next to the video** | the MCP reuses the `.vtt` instead of re-running Whisper |
| Resume archive | `downloads/<profile>/.gdl-archive.sqlite3` | gallery-dl's "already downloaded" set |
| **Manifest (source of truth)** | `manifests/<account>.db` — **SQLite** (`node:sqlite`) | per-account progress/checkpoint |
| Manifest JSON export | `manifests/<account>.json` | snapshot of the DB |
| Legacy root manifest | `manifest.json` | **deprecated** (pre-SQLite) |
| Curated notes | `notes/<profile>/videos/<id>.md` (+ `<id>.meta.json` = token usage) | YAML frontmatter mandatory |
| Note index / overview | `notes/<profile>/README.md`, `OVERVIEW.md`, thematic guides | |
| RAG vector index | `.rag/` — ChromaDB | regenerable from transcripts/notes |
| LLM reading config | `manifests/analysis-config.json` (note language, detail, OCR…) + Whisper env in `.mcp.json` | `.mcp.json` IS versioned; the rest is local |
| Login cookies | the `cookies.txt` you point to (Docker: `./data/cookies.txt`) | a **credential** — the app stores only the *path* (`localStorage`), never the values; see [SECURITY.md](SECURITY.md) |

`audio/` is an optional extra (gitignored). The Python scripts that write several
of these are documented in [`scripts/CLAUDE.md`](scripts/CLAUDE.md).

## Conventions

- `prompts/` — agent prompts. `scripts/` — download, GPU transcription, and RAG (Python); see [`scripts/CLAUDE.md`](scripts/CLAUDE.md).
- Notes: one per video at `notes/<profile>/videos/<id>.md` (YAML frontmatter mandatory); `notes/<profile>/README.md` is the index, `OVERVIEW.md` the theme summary.
- Timestamps in ISO 8601 (UTC) — use `date -Iseconds`.

## Setup

- `pip install -r requirements.txt`. **Bulk transcription:** `faster-whisper` — uses **GPU/CUDA if available** (`nvidia-*-cu12` wheels, CUDA 12.8+ for Blackwell/RTX 5060; on Windows with a GPU it injects the CUDA DLLs via `os.add_dll_directory`, otherwise `cublas64_12.dll cannot be loaded`) and **falls back to CPU** automatically if there is no GPU (slower; on CPU consider `--model small`).
- Build the MCP: in `../mcp-video-analyzer`, run `npm run build` (the `.mcp.json` points to `dist/`). Current version **v0.5.0**.
- Download requires **cookies** from a logged-in session — use a **throwaway account**: export a `cookies.txt` (Netscape) from the browser (the "Get cookies.txt LOCALLY" extension) and run `python scripts/download_instagram.py <profile> --cookies <path>`.
- System `ffmpeg` is required **for download** (yt-dlp merges video+audio): `winget install Gyan.FFmpeg`. The MCP, on the other hand, uses an embedded `ffmpeg-static`.

The note template is canonical in [`prompts/build-notes.md`](prompts/build-notes.md).

## App (UI) — `app/`

There is a **Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui (Base UI)** app in [`app/`](app/) that gives a UI to the download: add multiple accounts, choose media, hit Play, watch live progress (SSE), size, time, browse the collection, **manage it** (select/delete in bulk, or **free up space** — delete a video while keeping its note as a re-downloadable **note-only** item), and **filter profiles by category**. It is a **single app** — Node calls the CLIs (`gallery-dl`/`yt-dlp`/`ffmpeg`) via `child_process` (no Python backend).

- **Manifest:** migrated from `manifest.json` (root, PT) to **per-account SQLite** in [`manifests/<account>.db`](manifests/) (via `node:sqlite`), with JSON export `manifests/<account>.json` (local state — **gitignored**). Schema/repo in `app/src/server/db/`. Migration: `cd app && npx tsx src/server/migrate/importManifest.ts` (reconciles with the disk).
- **Engine:** `app/src/server/engine/` — `galleryDl.ts` (spawn `python -m gallery_dl`, parse stdout, **seedArchive** to resume without re-downloading), `ffmpeg.ts` (injects ffmpeg into PATH), `jobManager.ts` (per-account jobs, tabs in parallel, serialization by cookies, SSE).
- **Run:** `cd app && npm run dev` → http://localhost:3000. The login account's cookies live in `localStorage` (credential; do not version).
- **Runs as a Node server** (`next start`/`next dev`, node runtime — NOT edge/serverless) because of the child processes + SSE.
- **Theme/Design:** **Media Cinematic** direction (dark, glassy, coral→magenta→violet accent, Clash Display + Hanken + JetBrains Mono). Palette and tokens documented in [`DESIGN.md`](DESIGN.md); the source of truth for the tokens is `app/src/app/globals.css`. The section separator is the `BrandRule` (brand gradient).

## MCP — video reading (frames + OCR + transcription)

Reading is done by the MCP **[`guimatheus92/mcp-video-analyzer`](../mcp-video-analyzer)** (in `.mcp.json`), via `analyze_video`/`analyze_videos`.

- **Current version: v0.5.0** — all the bugs/feature-requests we had reported **have already been implemented and verified**: frames in a static video (uniform sampling when there is no scene cut), OCR with preprocessing (grayscale/2×/sharpen), `model`/`language`/`initialPrompt` per call, batch `analyze_videos`, **GPU faster-whisper** backend (`WHISPER_DEVICE`/`WHISPER_COMPUTE`), `MCP_WRITE_SIDECARS`, word-timestamps, and a silent-clip label. **No open gaps** (the feature-requests doc was removed for this reason).
- `.mcp.json` defines `WHISPER_PROMPT` (glossary) and `MCP_WRITE_SIDECARS=1`. The MCP **reads** the `.vtt` that `transcribe_gpu.py` writes next to the video → it does not re-run Whisper, it only does frames/OCR. Changes to `.mcp.json` take effect **on the next restart** of Claude Code.
