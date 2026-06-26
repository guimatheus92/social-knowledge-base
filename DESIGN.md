# DESIGN.md — tema "Media Cinematic"

> O sistema visual do app (`app/`). A fonte da verdade dos tokens é
> [`app/src/app/globals.css`](app/src/app/globals.css) (`@theme inline` +
> `:root/.dark`); as fontes ficam em [`app/src/app/layout.tsx`](app/src/app/layout.tsx).
> Este doc explica **o porquê** e mapeia o mockup → tokens do app.

## Direção escolhida

Entre os mockups explorados, escolhemos **Media Cinematic** (protótipo:
`design-mockups/4-media-cinematic.html`, mantido **gitignored** como referência).
A ideia: **a mídia é a heroína**. Fundo preto-rico com brilhos tingidos pela cor
das mídias, superfícies "glassy" flutuando por cima, e uma faixa de cores
quentes (coral→magenta) com uma fagulha violeta — usadas **com parcimônia**, como
se fossem "puxadas" dos vídeos. Dark-only (`:root === .dark`).

## Tipografia

| Papel | Fonte | Onde | Variável |
|---|---|---|---|
| Display — títulos, hero, @perfis | **Clash Display** (600/700) | headings, handles | `--font-clash` / `font-heading` |
| Texto/UI — corpo, labels, botões | **Hanken Grotesque** | base do `<html>` | `--font-hanken` / `font-sans` |
| Dados — números, durações, caminhos, ids | **JetBrains Mono** | métricas, paths | `--font-jetbrains` / `font-mono` |

Clash é self-hosted (Fontshare, `app/src/fonts/clash/*.woff2`) pra funcionar
offline/Docker; as outras vêm do `next/font/google`.

## Paleta

"Sparks" da marca (coral/magenta/violet) aparecem em botões primários, barras de
progresso, foco, e no separador de marca — **nunca** como cor de fundo de áreas
grandes. Verde = sucesso. O hex é o do mockup; o app usa o **equivalente em
oklch** (gamut maior, mistura melhor).

| Token | Tailwind | Mockup (hex) | App (oklch) | Uso |
|---|---|---|---|---|
| Coral | `coral` / `primary` | `#ff4d6d` | `oklch(0.665 0.214 12)` | acento primário, CTAs, foco, links em notas |
| Magenta | `magenta` | `#ff5ca8` | `oklch(0.69 0.205 350)` | meio do gradiente, "ao vivo" |
| Violet | `violet` | `#8b5cf6` | `oklch(0.62 0.205 285)` | fagulha fria, fim do gradiente |
| Verde | `good` | `#4ade80` | `oklch(0.78 0.16 152)` | concluído / sucesso |
| Âmbar | `chart-5` | `#ffb84d` | `oklch(0.8 0.14 80)` | avisos / contagem em andamento |
| Fundo | `background` | `#0b0a0e` | `oklch(0.145 0.012 295)` | preto com leve fundo violeta |
| Card | `card` | `rgba(28,24,34,.55)` | `oklch(0.185 0.016 295)` | superfícies (com `.glass`) |
| Texto | `foreground` | `#f2f0f5` | `oklch(0.955 0.006 300)` | texto principal |
| Texto fraco | `muted-foreground` | `#a59fb0` | `oklch(0.715 0.022 295)` | secundário |
| Linha | `border` | `rgba(255,255,255,.08)` | `oklch(1 0 0 / 9%)` | bordas/divisores neutros |

### Gradiente de assinatura

`coral → magenta → violet` (`linear-gradient(90deg, …)`). É o que pinta o botão
primário, a barra de progresso, e o **`BrandRule`** (o filete que separa seções
— ver [`app/src/components/BrandRule.tsx`](app/src/components/BrandRule.tsx)),
que desbota nas pontas via `mask-image`.

## Superfícies e atmosfera

- **`.glass`** — `color-mix` do card a 64% + `backdrop-filter: blur(20px) saturate(1.4)` + borda `--border`. É como os painéis "flutuam".
- **Atmosfera do `body`** — dois `radial-gradient` tingidos (coral no topo-direita, violet à esquerda) sobre o preto, `background-attachment: fixed`.
- **Raios** — base `--radius: 0.9rem`, escalado em `--radius-sm…4xl`.
- **Movimento** — `animate-live` (pulso do "ao vivo"), `hero-tile` (deriva do mural do hero), shimmer de loading; tudo respeita `prefers-reduced-motion`.

## Regras de uso

1. Cor da marca é **acento**, não preenchimento — fundos grandes ficam no preto/`card`.
2. Números/caminhos/ids sempre em **mono** (parecem "saída de máquina").
3. Títulos e @perfis em **Clash**; resto em Hanken.
4. Divisor entre seções = **`BrandRule`** (gradiente); divisor neutro dentro de um card = borda `--border`.
5. Dark-only — não há tema claro.
