# CLAUDE.md — social-knowledge-base

> Instruções para o Claude Code neste repo. **Leia antes de agir.**

## Projeto

Base de conhecimento construída a partir de vídeos do Instagram (Reels, Stories e **Em Destaque**) de uma ou mais contas. O Opus **assiste** (frames + OCR do que aparece na tela) e **ouve** (transcrição em PT-BR) cada vídeo e grava o que aprendeu em markdown.

## Objetivo

Baixar TODOS os vídeos de uma conta (incluindo "Em Destaque"), analisar cada um, e transformar o conteúdo em conhecimento consultável — para **muitos** vídeos, de forma **retomável** (pausar e continuar sem reprocessar).

## Como funciona (4 camadas)

1. **Download** (Python / gallery-dl) — `scripts/download_instagram.py` (ou o **app** em `app/`) baixa os vídeos para `downloads/<perfil>/<aba>/` e registra o progresso. Autentica por um `cookies.txt` do navegador (o instaloader morreu: o endpoint web GraphQL dele dá `401` desde ~jan/2025). Injeta o `ffmpeg` no PATH (senão o vídeo vem sem áudio).
2. **Transcrição em massa** (GPU) — `scripts/transcribe_gpu.py` roda **faster-whisper `medium` em CUDA** (~16–24× tempo real) com glossário de domínio, e grava sidecars: `downloads/<perfil>/transcripts/<id>.{txt,json}` + um `<id>.vtt` **ao lado do vídeo**. É a etapa que **escala** (~9,6k vídeos em horas, não nas ~150h do CPU).
3. **Notas** (Claude Code + Opus + MCP `video-analyzer`) — seguindo `prompts/build-notes.md`, processa **1 vídeo por iteração**: lê a transcrição (o MCP reusa o `.vtt` como sidecar, sem re-rodar Whisper) e **assiste** frames + OCR via MCP, gravando `notes/<perfil>/videos/<id>.md`.
4. **Síntese + RAG** — `prompts/synthesize-overview.md` gera `notes/<perfil>/OVERVIEW.md` (resumão por tema); `scripts/index_transcripts.py` + `scripts/index_notes.py` + `scripts/query.py` dão busca (a biblioteca fica buscável **só com a transcrição**, antes mesmo da nota curada). Detalhes dos scripts: [`scripts/CLAUDE.md`](scripts/CLAUDE.md).

## O que fazer (workflow do agente)

- Gerar notas → siga `prompts/build-notes.md`. **Sempre 1 vídeo por vez**; pule os que têm `lido_em != null` no `manifest.json`.
- Resumão → siga `prompts/synthesize-overview.md`.
- **Nunca** reprocesse um vídeo já `lido`. **Nunca** jogue dezenas de vídeos no mesmo contexto (estoura e fica caro).

## Definição de sucesso (NUNCA esquecer)

1. Todo vídeo da conta (incl. Em Destaque) tem uma nota `.md` correspondente.
2. Cada nota captura o que foi **dito** (transcrição) **e mostrado** (OCR/visual) — não um resumo genérico.
3. Processo **retomável**: `manifest.json` registra o que foi baixado/lido e *quando*; pausar e retomar não duplica nem reprocessa.
4. Transcrição em **português** legível — **faster-whisper `medium` na GPU** + glossário de domínio (nomes próprios certos: Doha, Smiles, Iberia…), não o `tiny`/`small` impreciso.
5. Existe um índice por perfil **e** um `notes/<perfil>/OVERVIEW.md` (resumão por tema) com links de volta às notas.
6. Dá para **consultar** depois (RAG): `query.py "o que aprendi sobre X?"` retorna notas com citação.

## Convenções

- `downloads/<perfil>/` — vídeos brutos (gitignored). `audio/` — opcional (gitignored).
- **`notes/<perfil>/` e `manifests/` são estado pessoal/gerado — gitignored, NÃO versionados.** O repo versiona só o que é genérico (código + prompts + docs); as notas e o manifest são específicos do seu acervo/uso.
- `notes/<perfil>/videos/<id>.md` — uma nota por vídeo (frontmatter YAML obrigatório). `notes/<perfil>/README.md` — índice. `notes/<perfil>/OVERVIEW.md` — resumão por tema (por conta). `notes/<perfil>/{GUIA-EMISSOES,SMILES,…}.md` — guias temáticos/por programa.
- `manifests/<conta>.db` — estado/checkpoint em **SQLite** (fonte da verdade do progresso) + export JSON `manifests/<conta>.json`. Ambos são **estado local (gitignored)**. O `manifest.json` da raiz é **legado** (idem, gitignored).
- `prompts/` — prompts dos agentes. `scripts/` — download, transcrição GPU e RAG (Python); ver [`scripts/CLAUDE.md`](scripts/CLAUDE.md). `downloads/<perfil>/transcripts/` — sidecars de transcrição.
- Timestamps em ISO 8601 (UTC) — use `date -Iseconds`.

## Setup

- `pip install -r requirements.txt`. **Transcrição em massa:** `faster-whisper` — usa **GPU/CUDA se disponível** (wheels `nvidia-*-cu12`, CUDA 12.8+ p/ Blackwell/RTX 5060; no Windows com GPU injeta as DLLs CUDA via `os.add_dll_directory`, senão `cublas64_12.dll cannot be loaded`) e **cai pra CPU** automaticamente se não houver GPU (mais lento; em CPU considere `--model small`).
- Buildar o MCP: em `../mcp-video-analyzer`, rodar `npm run build` (o `.mcp.json` aponta para o `dist/`). Versão atual **v0.5.0**.
- Download exige **cookies** de uma sessão logada — use **conta descartável**: exporte um `cookies.txt` (Netscape) do navegador (extensão "Get cookies.txt LOCALLY") e rode `python scripts/download_instagram.py <perfil> --cookies <caminho>`.
- `ffmpeg` no sistema é necessário **pro download** (yt-dlp mescla vídeo+áudio): `winget install Gyan.FFmpeg`. O MCP, por outro lado, usa um `ffmpeg-static` embutido.

O template da nota é canônico em [`prompts/build-notes.md`](prompts/build-notes.md).

## App (UI) — `app/`

Há um app **Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui (Base UI)** em [`app/`](app/) que dá UI ao download: adicionar várias contas, escolher mídia, dar Play, ver progresso ao vivo (SSE), tamanho, tempo, e navegar o acervo. É um **app único** — o Node chama as CLIs (`gallery-dl`/`yt-dlp`/`ffmpeg`) via `child_process` (sem backend Python).

- **Manifest:** migrou de `manifest.json` (raiz, PT) para **SQLite por conta** em [`manifests/<conta>.db`](manifests/) (via `node:sqlite`), com export JSON `manifests/<conta>.json` (estado local — **gitignored**). Schema/repo em `app/src/server/db/`. Migração: `cd app && npx tsx src/server/migrate/importManifest.ts` (reconcilia com o disco).
- **Engine:** `app/src/server/engine/` — `galleryDl.ts` (spawn `python -m gallery_dl`, parse stdout, **seedArchive** pra retomar sem re-baixar), `ffmpeg.ts` (injeta o ffmpeg no PATH), `jobManager.ts` (jobs por conta, abas em paralelo, serialização por cookies, SSE).
- **Rodar:** `cd app && npm run dev` → http://localhost:3000. Cookies da conta de login ficam em `localStorage` (credencial; não versionar).
- **Roda como servidor Node** (`next start`/`next dev`, runtime node — NÃO edge/serverless) por causa dos processos filhos + SSE.
- **Tema/Design:** direção **Media Cinematic** (dark, glassy, acento coral→magenta→violet, Clash Display + Hanken + JetBrains Mono). Paleta e tokens documentados em [`DESIGN.md`](DESIGN.md); a fonte da verdade dos tokens é `app/src/app/globals.css`. O separador de seção é o `BrandRule` (gradiente da marca).

## MCP — leitura de vídeo (frames + OCR + transcrição)

A leitura é feita pelo MCP **[`guimatheus92/mcp-video-analyzer`](../mcp-video-analyzer)** (em `.mcp.json`), via `analyze_video`/`analyze_videos`.

- **Versão atual: v0.5.0** — todos os bugs/feature-requests que tínhamos relatado **já foram implementados e verificados**: frames em vídeo estático (amostragem uniforme quando não há corte de cena), OCR com pré-processo (grayscale/2×/sharpen), `model`/`language`/`initialPrompt` por chamada, batch `analyze_videos`, backend **GPU faster-whisper** (`WHISPER_DEVICE`/`WHISPER_COMPUTE`), `MCP_WRITE_SIDECARS`, word-timestamps e rótulo de clipe mudo. **Sem gaps abertos** (o doc de feature-requests foi removido por isso).
- `.mcp.json` define `WHISPER_PROMPT` (glossário) e `MCP_WRITE_SIDECARS=1`. O MCP **lê** o `.vtt` que o `transcribe_gpu.py` grava ao lado do vídeo → não re-roda Whisper, só faz frames/OCR. Mudanças no `.mcp.json` valem **no próximo restart** do Claude Code.
