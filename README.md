<p align="center">
  <img src="app/src/app/icon.svg" width="76" height="76" alt="Social Knowledge Base" />
</p>
<h1 align="center">Social Knowledge Base</h1>
<p align="center"><em>Turn a creator's short videos into a searchable knowledge base — watched, heard, and queryable.</em></p>

Turns a creator's videos (Instagram today; **TikTok/YouTube in progress**) into a markdown knowledge base: an LLM **watches** (frames + OCR) and **listens** (transcription) to each video and writes down what it learned — for many videos, in a **resumable** way. The UI is bilingual (PT/EN).

> **Two engines make it work.** **[gallery-dl](https://github.com/mikf/gallery-dl)** (with `yt-dlp` + `ffmpeg`) does the **downloading** — it's the library that actually pulls every Reel, Story, and Highlight from a public profile, authenticated by your browser cookies. Then the **[`mcp-video-analyzer`](https://github.com/guimatheus92/mcp-video-analyzer)** MCP does the **reading** — transcript + frames + OCR + timeline. **Both are required** (build them once — see [Setup](#setup)). The cookies are a credential — see [Security & cookies](#security--cookies).

> Market check: no open-source tool does the full flow (download a whole account incl. Highlights → watch + listen → knowledge base). The existing ones only transcribe one reel's audio at a time.

## 🚀 Quick start (run the app)

**Docker (recommended — runs anywhere, nothing to install):**

```bash
mkdir -p data && cp /path/to/cookies.txt data/cookies.txt   # cookies from a THROWAWAY account
docker compose up --build                                   # → http://localhost:3000
```

The image bundles **Node 24 + Python + gallery-dl + yt-dlp + ffmpeg**; the app calls those CLIs internally. The **`./data`** volume persists `downloads/` and the SQLite manifests on the host; the `cookies.txt` is **auto-detected** by the UI. **GPU (optional):** uncomment `gpus: all` in `docker-compose.yml` (needs the NVIDIA Container Toolkit).

**Local (needs Node 24):**

```bash
cd app && npm install && npm run dev                        # → http://localhost:3000
```

In the app: point to your `cookies.txt`, **add a profile** (or paste a **video link** → downloads just that one) and hit **Play** (live progress). Toggle PT/EN at the top. The transcription/notes (the knowledge layer) run outside the UI — see below.

## How it works

1. **Download** — `scripts/download_instagram.py` (gallery-dl, authenticated by a browser `cookies.txt`) downloads the videos to `downloads/<profile>/<tab>/`. (Or via the **app** in `app/`.)
2. **Transcription (GPU)** — `scripts/transcribe_gpu.py` transcribes in bulk with faster-whisper `medium` on CUDA (~16–24× real time) and writes `.vtt`/`.txt`/`.json` sidecars per video. It auto-detects the GPU and **falls back to CPU** when there isn't one. Resumable.
3. **Notes** — Claude Code (any capable LLM; Claude Opus recommended), via `prompts/build-notes.md`, processes **one video at a time** (reusing the transcript via `.vtt` + frames/OCR through the MCP) and writes `notes/<profile>/videos/<video>.md`. The note language is configurable (default **English**) — see [Note language](#note-language).
4. **Overview + RAG** — `prompts/synthesize-overview.md` generates `notes/<profile>/OVERVIEW.md` by theme; `scripts/index_transcripts.py` + `scripts/index_notes.py` + `scripts/query.py` provide search (the library is searchable with the transcription alone).

## Setup

```bash
# 1. Python deps (download + GPU transcription + RAG)
pip install -r requirements.txt
# GPU (CUDA 12.8+, e.g. RTX 5060): pip install nvidia-cublas-cu12 nvidia-cudnn-cu12 nvidia-cuda-nvrtc-cu12 nvidia-cuda-runtime-cu12

# 2. ffmpeg — required for DOWNLOAD (yt-dlp merges video+audio; without it videos come out muted)
winget install Gyan.FFmpeg

# 3. Build the video-reading MCP (required for the notes phase)
cd ../mcp-video-analyzer && npm run build && cd -

# 4. Export cookies.txt from a logged-in IG session (use a THROWAWAY account)
#    Browser -> "Get cookies.txt LOCALLY" extension -> Export (Netscape format). Save it outside the repo.
```

> instaloader was abandoned: its web GraphQL endpoint returns `401 "Please wait a few minutes"` since ~Jan/2025, on any account/IP. gallery-dl uses the browser cookies (the mobile API route, which IG still accepts).

`.mcp.json` points Claude Code at the local MCP build (**v0.5.0**), with `WHISPER_MODEL`/`WHISPER_PROMPT` (glossary), `WHISPER_BIN` and `MCP_WRITE_SIDECARS=1`. The transcription language is **auto-detected per video** (set a fixed `WHISPER_LANGUAGE` only to force one). Bulk transcription, however, runs on the **GPU** via `transcribe_gpu.py`; the MCP reuses those `.vtt`s and focuses on frames/OCR.

> **Windows:** `pip` installs `whisper.exe` into Python's `Scripts/` folder, usually **not** on the PATH Claude Code inherits — so `.mcp.json` sets `WHISPER_BIN` to the full path. Confirm yours with `python -c "import os,sys;print(os.path.join(os.path.dirname(sys.executable),'Scripts','whisper.exe'))"`. The **MCP** doesn't need system ffmpeg (it uses the embedded `ffmpeg-static`); the **download** (gallery-dl/yt-dlp) does (Setup step 2), otherwise videos come out **with no audio**.

## Usage (CLI)

```bash
# 1) Download all of a profile's videos (incl. Highlights)
python scripts/download_instagram.py <profile> --cookies C:\path\ig_cookies.txt

# 2) Transcribe in bulk (resumable) + index for search
python scripts/transcribe_gpu.py <profile>
python scripts/index_transcripts.py <profile>

# 3) Generate notes: open Claude Code IN THIS directory and run prompts/build-notes.md
#    (one video at a time; use /loop for a batch)

# 4) Theme overview (in Claude Code): prompts/synthesize-overview.md -> notes/<profile>/OVERVIEW.md

# 5) Search / RAG
python scripts/index_notes.py
python scripts/query.py "what did I learn about <theme>?"
```

## App (UI) — `app/`

A **web app** (Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui) in [`app/`](app/) that gives the download a UI — a visual alternative to the CLI:

```bash
cd app && npm install && npm run dev   # → http://localhost:3000
npm run test                           # Vitest (engine/parsers)
```

- **Single app** (no Python backend): Node calls `gallery-dl`/`yt-dlp`/`ffmpeg` via `child_process`. Runs as a **Node server** (`next dev`/`next start`, node runtime).
- **What works:** add multiple profiles; **download a single video by link** (the owner profile is created automatically); choose media (image/video); **Play → live progress (SSE)** with size/time; native Windows folder picker; auto-detected cookies; **library** (thumbnail grid + search/filters/sort, opens in the system player) with **select-all, bulk delete, and "free up space"** — delete the video but keep the note as a readable **note-only** item, **re-downloadable** on demand; **per-profile categories + a category filter**; **note generation via Claude Code** (per video + per profile, language picker, live progress); **LLM reading config** (Whisper model/language/detail/OCR → written to `.mcp.json`); disk management; tooltips and confirmation on sensitive actions.
- **Bilingual UI (PT/EN)** — language toggle at the top (lightweight i18n, no extra dependency).
- **Multi-network:** profiles are grouped under their network; a `SourceProvider` abstraction (Instagram + TikTok; YouTube via yt-dlp in progress) keeps the knowledge pipeline network-agnostic.
- **Theme:** "Media Cinematic" (dark, glassy, coral→magenta→violet accent) — see [DESIGN.md](DESIGN.md).
- **Manifest:** per-account **SQLite** in `manifests/<account>.db` (via `node:sqlite`) + a versionless JSON export `manifests/<account>.json`. Migration: `cd app && npx tsx src/server/migrate/importManifest.ts` (reconciles with the disk).

## Note language

The LLM-written notes have a configurable language. The **default is English**; the transcription itself is **auto-detected per video** by Whisper (e.g. `pt` for Portuguese audio), so a note can summarize Portuguese speech in English. Override the note default at three levels (most specific wins):

1. **Global default** — the analysis-settings panel (gear icon).
2. **Per profile** — the picker next to "Generate missing notes" on the profile card (remembered for that profile's batch).
3. **Per video** — the picker next to (Re)generate in the video dialog (a one-off for that note).

## Success criteria

1. Every video in the account (incl. Highlights) has a `.md` note.
2. Each note captures what was **said** (transcript) **and shown** (OCR/visual).
3. **Resumable** via the SQLite manifest (records what was downloaded/read and *when*).
4. Readable transcription in the audio's language (faster-whisper `medium` on GPU + a domain glossary); notes in the configured language.
5. A per-profile index **and** `notes/<profile>/OVERVIEW.md` (theme summary) with links back.
6. Later querying via RAG (`query.py`) with note citations.

## Note template

The canonical note template + quality rules live in **[`prompts/build-notes.md`](prompts/build-notes.md)** (frontmatter keys + sections). The notes phase reads it directly.

## Security & cookies

The `cookies.txt` is a **live credential** — a logged-in session from a
**throwaway** account (highlights/stories require login). Keep it private (it's
gitignored via `*cookies*.txt`), never commit it, and re-export it when it
expires (downloads start redirecting to login). The app reads it **server-side**
and **never sends cookie values to the browser**. gallery-dl already spaces
requests (~10s) to avoid rate-limits/bans.

For the full threat model, hardening, and **responsible use** — you're
downloading publicly-visible content with your own session, so respect each
platform's Terms of Service and copyright — see **[SECURITY.md](SECURITY.md)**.

## Contributing & license

- **Contribute:** see [CONTRIBUTING.md](CONTRIBUTING.md) (setup, checks, conventions) and the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Security:** report privately — see [SECURITY.md](SECURITY.md).
- **License:** [MIT](LICENSE) — covers this repository's code only. The tools it drives (gallery-dl, yt-dlp, ffmpeg, the MCP, faster-whisper, …) keep their own licenses; downloaded media belongs to its creators — see [SECURITY.md](SECURITY.md) ("Responsible use") before downloading or redistributing.
