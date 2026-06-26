# DESIGN.md — "Media Cinematic" theme

> The app's visual system (`app/`). The source of truth for the tokens is
> [`app/src/app/globals.css`](app/src/app/globals.css) (`@theme inline` +
> `:root/.dark`); the fonts live in [`app/src/app/layout.tsx`](app/src/app/layout.tsx).
> This doc explains **the why** and maps the mockup → app tokens.

## Chosen direction

Among the mockups we explored, we picked **Media Cinematic** (prototype:
`design-mockups/4-media-cinematic.html`, kept **gitignored** as a reference).
The idea: **the media is the hero**. A rich near-black background washed with
glows tinted by the color of the media, "glassy" surfaces floating on top, and a
band of warm colors (coral→magenta) with a violet spark — used **sparingly**, as
if "pulled" from the videos. Dark-only (`:root === .dark`).

## Typography

| Role | Font | Where | Variable |
|---|---|---|---|
| Display — titles, hero, @profiles | **Clash Display** (600/700) | headings, handles | `--font-clash` / `font-heading` |
| Text/UI — body, labels, buttons | **Hanken Grotesque** | `<html>` base | `--font-hanken` / `font-sans` |
| Data — numbers, durations, paths, ids | **JetBrains Mono** | metrics, paths | `--font-jetbrains` / `font-mono` |

Clash is self-hosted (Fontshare, `app/src/fonts/clash/*.woff2`) so it works
offline/in Docker; the others come from `next/font/google`.

## Palette

The brand "sparks" (coral/magenta/violet) appear on primary buttons, progress
bars, focus, and the brand separator — **never** as the background of large
areas. Green = success. The hex is the mockup's; the app uses the **oklch
equivalent** (wider gamut, mixes better).

| Token | Tailwind | Mockup (hex) | App (oklch) | Use |
|---|---|---|---|---|
| Coral | `coral` / `primary` | `#ff4d6d` | `oklch(0.665 0.214 12)` | primary accent, CTAs, focus, note links |
| Magenta | `magenta` | `#ff5ca8` | `oklch(0.69 0.205 350)` | middle of the gradient, "live" |
| Violet | `violet` | `#8b5cf6` | `oklch(0.62 0.205 285)` | cool spark, end of the gradient |
| Green | `good` | `#4ade80` | `oklch(0.78 0.16 152)` | done / success |
| Amber | `chart-5` | `#ffb84d` | `oklch(0.8 0.14 80)` | warnings / count in progress |
| Background | `background` | `#0b0a0e` | `oklch(0.145 0.012 295)` | near-black with a faint violet undertone |
| Card | `card` | `rgba(28,24,34,.55)` | `oklch(0.185 0.016 295)` | surfaces (with `.glass`) |
| Text | `foreground` | `#f2f0f5` | `oklch(0.955 0.006 300)` | main text |
| Faint text | `muted-foreground` | `#a59fb0` | `oklch(0.715 0.022 295)` | secondary |
| Line | `border` | `rgba(255,255,255,.08)` | `oklch(1 0 0 / 9%)` | neutral borders/dividers |

### Signature gradient

`coral → magenta → violet` (`linear-gradient(90deg, …)`). It paints the primary
button, the progress bar, and the **`BrandRule`** (the hairline that separates
sections — see [`app/src/components/BrandRule.tsx`](app/src/components/BrandRule.tsx)),
which fades out at both ends via `mask-image`.

## Surfaces and atmosphere

- **`.glass`** — `color-mix` of the card at 64% + `backdrop-filter: blur(20px) saturate(1.4)` + a `--border` border. This is how the panels "float".
- **`body` atmosphere** — two tinted `radial-gradient`s (coral top-right, violet left) over the black, `background-attachment: fixed`.
- **Radii** — base `--radius: 0.9rem`, scaled across `--radius-sm…4xl`.
- **Motion** — `animate-live` (the "live" pulse), `hero-tile` (the hero media-wall drift), the loading shimmer; all respect `prefers-reduced-motion`.

## Usage rules

1. Brand color is an **accent**, not a fill — large backgrounds stay black/`card`.
2. Numbers/paths/ids always in **mono** (they read as "machine output").
3. Titles and @profiles in **Clash**; everything else in Hanken.
4. Divider between sections = **`BrandRule`** (gradient); a neutral divider inside a card = a `--border` border.
5. Dark-only — there is no light theme.
