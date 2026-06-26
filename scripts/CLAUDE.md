# CLAUDE.md — `scripts/`

> Standalone Python scripts of the pipeline. Each one does **one** step and is **resumable**.
> Project overview: [`../CLAUDE.md`](../CLAUDE.md). Note template: [`../prompts/build-notes.md`](../prompts/build-notes.md).

## Flow (pipeline order)

```
1. DOWNLOAD      download_instagram.py   → downloads/<profile>/<tab>/*.mp4   (+ manifest)
   (or via app/, which writes manifests/<account>.db)
2. TRANSCRIBE    transcribe_gpu.py       → transcripts/*.{txt,json} + <video>.vtt   (GPU)
3. INDEX         index_transcripts.py    → .rag  (search with transcription alone)
                 index_notes.py          → .rag  (search the curated notes)
4. QUERY         query.py "question"     → relevant snippets to cite
```

Writing the **notes** (`notes/<profile>/*.md`) is done by the agent (Opus), following
`prompts/build-notes.md` — there is no script for that.

## The scripts

### `download_instagram.py` — downloads a profile
Downloads **all** the videos from a profile (Reels, Stories, Highlights, Posts) via **gallery-dl**
authenticated by `cookies.txt` (instaloader is dead). Injects **ffmpeg into PATH** (without it the
video comes out **without audio**) and uses `--download-archive` to resume without re-downloading.
```
python scripts/download_instagram.py <profile> --cookies C:\path\cookies.txt
                                     [--tabs highlights,reels,stories] [--range 1-50]
                                     [--include-images] [--skip-download]
```
- **Output:** `downloads/<profile>/<tab>/*.mp4` + records to `manifest.json` (root, **legacy** in PT).
- **Note:** the modern download path is the **app** ([`../app/`](../app/)), which writes the manifest
  to **SQLite** `manifests/<account>.db`. `transcribe_gpu.py` reads **that** SQLite — so, if you
  downloaded only via the CLI, generate the SQLite with the app's migration (`app/src/server/migrate/importManifest.ts`).

### `transcribe_gpu.py` — transcribes in batch (GPU if available, otherwise CPU) ⭐
Bulk transcription with **faster-whisper**: uses **GPU/CUDA when available** (`--device auto`, ~16–24×
real time; ~9.6k videos in hours) and **falls back to CPU** automatically if there is no GPU (works on
any machine, just slower — on CPU use `--model small`). Reads the SQLite manifest
(`status='downloaded'`), skips what already has a sidecar (**resumable**), and uses a **domain glossary**
(`initial_prompt`) to get proper nouns right (Doha, Smiles, Iberia…).
```
python scripts/transcribe_gpu.py <account> [--limit N] [--category reel|highlight|story|post]
                                 [--model medium] [--device cuda] [--beam 1]
```
- **Output:** `downloads/<account>/transcripts/<post_id>.{txt,json}` (for the notes/RAG) **and**
  `downloads/<account>/<tab>/<post_id>.vtt` **next to the video** — the MCP `video-analyzer` reads that
  `.vtt` as a sidecar and **skips Whisper**, doing only frames/OCR.
- **Windows gotcha:** the script's preamble calls `os.add_dll_directory()` on the pip
  `nvidia/*/bin` folders — without that you get `cublas64_12.dll cannot be loaded`. The **1st** transcription
  on a Blackwell GPU (sm_120) is slow (kernel JIT); afterwards it stabilizes at ~2s.
- **Glossary is per-account:** the current one is for **miles**. For another account (e.g., cooking), swap the
  `GLOSSARY` constant or it contaminates the transcription with wrong terms.

### `index_transcripts.py` — indexes transcriptions in the RAG
Adds the `.txt` sidecars to the Chroma `notes` collection (**cosine** space), enriching with
origin/caption from the manifest. Makes the **entire** library searchable **with the transcription alone**,
before a curated note exists. Re-runs only what changed (hash).
```
python scripts/index_transcripts.py [account]
```

### `index_notes.py` — indexes the notes in the RAG
Indexes `notes/**/*.md` (except `OVERVIEW.md`/`README.md`) into the same `notes` collection (cosine),
with multilingual embeddings (good for PT). Re-runs only the changed notes (hash).
```
python scripts/index_notes.py
```

### `query.py` — queries the base (RAG)
Searches for the most relevant snippets (notes **and** transcriptions) for a question, with a path to cite.
For a prose answer, pass the snippets to Opus.
```
python scripts/query.py "what did I learn about Clube Turbo?" [-k 5]
```

### `video_url.py` — media id → Instagram link
The `id` (file name / citation in the notes) is the media's **pk**; this script converts it to the
**shortcode** and builds the clickable URL (`https://www.instagram.com/p/<shortcode>/`). Works for
**reels/posts**; stories and Highlights are ephemeral and may not resolve.
```
python scripts/video_url.py 3924652210327473259 [<id> ...]
```

## Common conventions
- **`PYTHONUTF8=1`** on Windows (avoids `UnicodeEncodeError` cp1252 in prints).
- **`.rag/`** = Chroma vector index (gitignored). Deleting and re-running the `index_*` recreates it.
- Everything is **resumable**: download (archive), transcription (existing sidecar), indexes (hash).
- **Dependencies:** `pip install -r ../requirements.txt`; GPU: `faster-whisper` + `nvidia-*-cu12`
  wheels (CUDA 12.8+ for Blackwell). ffmpeg on PATH for download/audio extraction.
