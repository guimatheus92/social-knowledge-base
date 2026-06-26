# Security

`social-knowledge-base` is a **single-user, local-first tool**. It downloads
your own media library and reads/writes files on the machine it runs on. Like a
desktop app, it has **no authentication by design** — it trusts whoever can reach it.

## Supported versions

Fast-moving personal project: only the latest commit on `main` (and the `dev`
working branch) is supported. There are no backports to older revisions — pull
the latest before reporting.

## Threat model

- **Intended:** runs on `localhost`, used by one person (you). The Docker compose
  binds to `127.0.0.1` for this reason.
- **NOT intended:** exposed to the internet or an untrusted LAN. If you expose it,
  anyone who can reach the port can download with your cookies, browse your
  library, and open files/folders on the host. **Put it behind auth / a reverse
  proxy / a VPN before exposing it.**

## What counts as a credential

- **`cookies.txt`** — a logged-in session for a **disposable** Instagram account.
  Treat it like a password. It is gitignored (`*cookies*.txt`, plus `/data` in
  Docker) and **never sent to the browser**: the server reads the file; the UI
  only ever sees a path and a validity badge (derived from the cookie's expiry).

## Responsible use

This tool downloads media that is **publicly visible** on the source platform,
using **your own** logged-in session (the cookies). That is a real action with
real obligations:

- **Respect the platform's Terms of Service and copyright.** The videos and their
  content belong to their creators, not to you. Use this for **personal,
  educational, or research** purposes — archiving and studying content you are
  allowed to access — not for republishing, reselling, or redistributing others' work.
- **Use a throwaway account** for the cookies, never your main one. Logged-in
  scraping can get an account rate-limited or banned.
- **Don't hammer the platform.** The downloader already spaces requests (~10s) and
  the parallelism is capped (default 2, max 4) on purpose — leave it there.
- **You are responsible** for what you download and what you do with it. The MIT
  license disclaims warranty and liability (see [LICENSE](LICENSE)).

## Hardening in place

- **No secrets in the repo or frontend.** No API keys; cookie *values* never leave
  the server. `notes/`, `manifests/`, `downloads/`, `.rag/` and cookie files are
  gitignored.
- **Path traversal guarded.** `account` / `postId` segments are validated against a
  conservative allow-list before they touch the filesystem (`assertSafeSegment`).
- **No shell injection.** Every subprocess (gallery-dl, yt-dlp, `query.py`,
  Explorer, the PowerShell folder picker) is spawned with an **argv array, never a
  shell string**. The picker also single-quote-escapes interpolated paths.
- **Parameterized SQL** everywhere (`node:sqlite` prepared statements; no string
  concatenation of user input into queries).
- **Input validation** on writes (zod schemas); error responses do not leak stack
  traces.
- **Constrained fetching.** Download-by-link only accepts URLs that a known
  provider (Instagram/TikTok) claims, so the downloader can't be pointed at
  arbitrary hosts.
- **Baseline headers** (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy`).
- **Markdown is sanitized** (react-markdown renders no raw HTML and strips
  `javascript:` URLs); notes/transcripts are your own content.

## Known / accepted

- **No rate limiting.** Fine for a localhost single user; add one if you expose it.
- **Windows "open file/folder" endpoints** launch the OS opener — powerful, and
  another reason not to expose the port.
- **`postcss` advisory (GHSA-qx2v-qp2m-jg93)** comes transitively from Next's own
  bundle; the only audit "fix" downgrades Next to 9.x (breaking), so we wait for
  Next to bump it. It is build-time only and low impact here.

## Reporting

Found a vulnerability? Report it **privately** — don't open a public issue. Use
GitHub's **"Report a vulnerability"** (the repo's *Security* tab → *Advisories*).
Never include real cookies, session ids, or other secrets in a report. You'll
get a response as soon as the maintainer can (this is a side project).
