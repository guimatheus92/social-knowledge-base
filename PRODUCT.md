# Product

## Register

product

## Users

A single technical owner running the app **locally** (Windows, at their desk). A power user / developer who collects a creator's short videos (Instagram today; TikTok/YouTube coming) and turns them into a searchable knowledge base. Their context is long-running and operational: they add many profiles, kick off downloads/transcriptions that run for hours, watch live progress, and browse/curate/query the resulting notes. The primary job on any screen is **"see and control a large, resumable batch"** — start/stop work, know exactly what's done vs pending, and find what a video taught.

## Product Purpose

Download **all** of a creator's videos (incl. Highlights) and turn what they teach into **queryable markdown knowledge** — transcription + frames/OCR + curated notes + RAG search. It exists because no open-source tool does the full flow (whole-account download → watch + listen → knowledge base); existing tools only transcribe one reel at a time. Success: every video has a note; "what did I learn about X?" returns cited answers; and the whole process survives pause/resume without re-processing.

## Brand Personality

**Cinematic, precise, calm-under-load.** Voice is confident and technical without fuss; numbers, sizes, durations and ids read as honest **machine output** (monospace), never dressed up. The media (the creators' videos) is the hero — the chrome recedes behind it. Dark and glassy with a restrained warm accent. The emotional goal: the user feels **in command of a big, slow operation**, never overwhelmed by it or by the UI.

## Anti-references

- **Generic AI gradient UI** — coral/magenta (pink/purple) sprayed on every button, toggle, and bar. The accent must be *earned*, not the default surface treatment.
- **Corporate SaaS dashboard** — identical card grids, the hero-metric template, corporate-blue chrome.
- **Neon / gamer dark theme** — over-saturated glow, everything lit up.

## Design Principles

1. **The media is the hero.** Chrome recedes so the creators' content (thumbnails, posters, the media wall) leads; the UI frames it, it doesn't compete.
2. **Color is earned, not sprayed.** Surfaces stay near-black; the warm accent marks the *one* primary action and live/data signals — not every interactive element. (Directly counters "too pink".)
3. **Honest about long-running work.** Live progress, resumability, and per-item state are always legible; never hide that something is downloading or transcribing for hours.
4. **Calm density.** Many profiles, thousands of videos — information-dense but unhurried; no decorative noise competing for attention.
5. **Machine-truthful data.** Counts, sizes, durations, ids, and paths read as precise machine output (mono), never rounded into marketing.

## Accessibility & Inclusion

Dark-only by design, but body text must clear **WCAG AA** (≥4.5:1) on the near-black surfaces — no light-gray "for elegance". Status is never color-only (icon + label + color together). Honor `prefers-reduced-motion` (already wired). Single local user on Windows, keyboard + mouse; bilingual UI (PT/EN).
