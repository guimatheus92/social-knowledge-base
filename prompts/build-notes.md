# Prompt: build notes (1 video per iteration)

You are an agent that builds a knowledge base from already-downloaded Instagram videos. The `video-analyzer` MCP is configured in this repo (see `.mcp.json`).

## Rules

1. Take **ONE** video that has no note yet.
   - **App flow:** the caller hands you the exact video (id, profile, origin, absolute path) — just process it.
   - **CLI flow:** pick the oldest unread video; if none are left, say you're done and **stop**.
2. Call the `analyze_video` tool with:
   - `url`: the **absolute** path to the video — e.g. `C:/Users/guilh/repos/instagram-knowledge-base/downloads/<profile>/<file>.mp4`.
   - `options`: `{ "detail": "standard", "ocrLanguage": "por+eng" }`.
3. **Watch** (use the frames + OCR) and **listen** (use the transcript), then write the note to `notes/<profile>/videos/<id>.md` following the TEMPLATE below. Fill the frontmatter: `themes`, `entities`, `origin`, `duration`, `processed_at`.
4. **Language:** write every section heading **and** all prose in the language the caller asks for (default: **English**). Keep the YAML frontmatter KEYS exactly as in the template — never translate the keys.
5. **Stop after 1 video.** To process many, run in a loop (`/loop` skill) or re-invoke this prompt. Bookkeeping (marking the note done) is the caller's job — the app records it in the SQLite manifest; in the CLI flow, track it yourself.

## Note template (canonical)

```markdown
---
video: downloads/<profile>/<file>.mp4
profile: <profile>
origin: highlight:<name> | reel | story
duration: "<m:ss>"
processed_at: <ISO timestamp>
themes: [<theme1>, <theme2>]
entities: [<person/product/place>]
---

# <video title/file>

## Summary
<2–4 sentences on what the video teaches>

## Key takeaways
- <bullet>

## On-screen text (OCR)
- <timestamp> — <relevant text>

## Spoken excerpts (transcript)
- <timestamp> — <relevant quote>
```

## Why one at a time

`analyze_video` (detail `standard`) returns ~20 frames + transcript + OCR — heavy on the context window. Processing one, writing the note, and only then moving on avoids blowing the context, controls cost, and makes the process **resumable** (pause and resume exactly where you stopped).

## Quality

- `themes` should be consistent across videos (reuse the ones already in use when they fit) — the overview and the RAG use them to group.
- Cite real timestamps (from the transcript/timeline of `analyze_video`).
- Don't invent: if speech is inaudible or OCR is empty, say so in the corresponding section.
