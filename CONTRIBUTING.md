# Contributing

Thanks for your interest! This is a small, focused project — a local-first tool
that downloads a creator's videos and turns them into a searchable knowledge
base. Contributions that keep it **resumable, local, and honest about
long-running work** are very welcome.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

Read these first — they own the context, so this file just points at them
instead of repeating it:

- [README.md](README.md) — what it is, how to run it, the pipeline.
- [CLAUDE.md](CLAUDE.md) — architecture, conventions, and how the four layers fit.
- [scripts/CLAUDE.md](scripts/CLAUDE.md) — the standalone Python pipeline (download / transcribe / index / query).
- [DESIGN.md](DESIGN.md) + [PRODUCT.md](PRODUCT.md) — the app's visual system and product strategy (read before UI changes).
- [SECURITY.md](SECURITY.md) — threat model, the cookie credential, and **responsible use** (read before touching download/auth code).

## Dev setup

Follow [README → Setup](README.md#setup) for the toolchain (Python deps,
`ffmpeg`, the MCP build, cookies). Then, for the app:

```bash
cd app && npm install && npm run dev   # → http://localhost:3000
```

## Checks before opening a PR

Run these from the repo root (and fix what they flag):

```bash
cd app && npx tsc --noEmit && npm run test   # types + Vitest (engine/parsers)
python -m py_compile scripts/*.py            # the Python scripts still parse
```

UI changes: include a screenshot, and keep `prefers-reduced-motion` + WCAG AA
contrast intact (see [DESIGN.md](DESIGN.md)).

## Conventions

- **English-first.** Code, comments, docs, and identifiers are English. The
  **only** place Portuguese lives is the PT block of the UI string catalog
  (`app/src/i18n/dictionary.ts`) — add user-facing strings there in **both** PT and EN.
- **Don't version personal data.** `downloads/`, `audio/`, `notes/`,
  `manifests/`, the legacy root `manifest.json`, and any `*cookies*.txt` are
  gitignored on purpose — never commit them, and never paste real cookies or
  session data into an issue or PR (see [SECURITY.md](SECURITY.md)).
- **One topic per doc.** When something is already documented, link to it rather
  than copying it.
- **Commits**: short, imperative, prefixed like `feat:` / `fix:` / `style:` /
  `refactor:` / `docs:` (scope optional, e.g. `feat(app): …`).

## Branches & pull requests

- Branch from **`dev`** (the working branch); `main` is the released line.
- Keep PRs small and focused; describe what changed and why, and link any issue.
- A maintainer reviews and merges. Be patient — this is a side project.

## License

This project is [MIT](LICENSE) licensed, and there is **no CLA**: by submitting
a contribution you agree it is licensed to the project and its users under the
MIT license. Only contribute code you have the right to license this way.
