# Prompt: synthesize OVERVIEW.md (theme-by-theme summary)

Goal: generate/update `notes/<profile>/OVERVIEW.md`, consolidating the learnings from **all** notes, grouped by theme. Use **map-reduce** — don't try to read everything at once (there are many videos).

## Steps

1. **Map (cheap collection):** read only the **frontmatter** of every `notes/**/*.md` (fields `themes`, `video`, `profile`). Don't read the body yet. Group the notes by `theme`.
2. **Reduce per theme:** for each theme:
   - Read the bodies of that theme's notes. If there are many, summarize in **batches** (e.g. 20 at a time) and then combine the partial summaries.
   - Produce 3–7 **recurring takeaways** for the theme, each linking back to its source notes: `[file](notes/<profile>/videos/<file>.md)`.
3. **Assemble `notes/<profile>/OVERVIEW.md`:**
   - Top: a summary with the list of themes (anchor links) + count of processed videos.
   - One `## <theme>` section per theme, with the consolidated takeaways and links.
   - A final `## Gaps / open questions` section with whatever stayed ambiguous or contradictory across videos.
4. **Record the overview state:** save this run's timestamp (`date -Iseconds`) and the number of notes covered, so the next run can be incremental (the app keeps this in the SQLite `overview_state` table; in the CLI flow, track it yourself).

## Incremental (resumable)

If `OVERVIEW.md` already exists: re-synthesize **only** the themes whose notes changed since the last overview, preserving the other sections. This way the summary keeps up with new videos without redoing everything.

## After

- Update the RAG: `python scripts/index_notes.py`.
- Test the query: `python scripts/query.py "what did I learn about <theme>?"`.
