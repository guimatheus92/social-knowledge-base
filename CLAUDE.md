# CLAUDE.md — instagram-knowledge-base

> Instruções para o Claude Code neste repo. **Leia antes de agir.**

## Projeto

Base de conhecimento construída a partir de vídeos do Instagram (Reels, Stories e **Em Destaque**) de uma ou mais contas. O Opus **assiste** (frames + OCR do que aparece na tela) e **ouve** (transcrição em PT-BR) cada vídeo e grava o que aprendeu em markdown.

## Objetivo

Baixar TODOS os vídeos de uma conta (incluindo "Em Destaque"), analisar cada um, e transformar o conteúdo em conhecimento consultável — para **muitos** vídeos, de forma **retomável** (pausar e continuar sem reprocessar).

## Como funciona (3 camadas)

1. **Download** (Python / instaloader) — `scripts/download_instagram.py` baixa os vídeos para `downloads/<perfil>/` e registra cada um em `manifest.json`.
2. **Análise + notas** (Claude Code + Opus + MCP `video-analyzer`) — seguindo `prompts/build-notes.md`, processa **1 vídeo por iteração**, grava `notes/<perfil>/<video>.md` e marca o progresso em `manifest.json`.
3. **Síntese** — `prompts/synthesize-overview.md` gera `notes/OVERVIEW.md` (resumão por tema); `scripts/index_notes.py` + `scripts/query.py` dão busca/RAG.

O MCP `video-analyzer` (configurado em `.mcp.json`) **já transcreve a faixa de áudio** do `.mp4` — não há passo separado de áudio.

## O que fazer (workflow do agente)

- Gerar notas → siga `prompts/build-notes.md`. **Sempre 1 vídeo por vez**; pule os que têm `lido_em != null` no `manifest.json`.
- Resumão → siga `prompts/synthesize-overview.md`.
- **Nunca** reprocesse um vídeo já `lido`. **Nunca** jogue dezenas de vídeos no mesmo contexto (estoura e fica caro).

## Definição de sucesso (NUNCA esquecer)

1. Todo vídeo da conta (incl. Em Destaque) tem uma nota `.md` correspondente.
2. Cada nota captura o que foi **dito** (transcrição) **e mostrado** (OCR/visual) — não um resumo genérico.
3. Processo **retomável**: `manifest.json` registra o que foi baixado/lido e *quando*; pausar e retomar não duplica nem reprocessa.
4. Transcrição em **português** legível (Whisper `small` + `pt`), não o `tiny` impreciso.
5. Existe um índice por perfil **e** um `notes/OVERVIEW.md` (resumão por tema) com links de volta às notas.
6. Dá para **consultar** depois (RAG): `query.py "o que aprendi sobre X?"` retorna notas com citação.

## Convenções

- `downloads/<perfil>/` — vídeos brutos (gitignored). `audio/` — opcional (gitignored).
- `notes/<perfil>/*.md` — uma nota por vídeo (frontmatter YAML obrigatório). `notes/<perfil>/README.md` — índice. `notes/OVERVIEW.md` — resumão.
- `manifest.json` — estado/checkpoint (fonte da verdade do progresso). Versionado.
- `prompts/` — prompts dos agentes. `scripts/` — download + RAG (Python).
- Timestamps em ISO 8601 (UTC) — use `date -Iseconds`.

## Setup

- `pip install -r requirements.txt` **e** `pip install -U openai-whisper` (a transcrição roda dentro do MCP, que chama o comando `whisper`).
- Buildar o MCP: em `../mcp-video-analyzer`, rodar `npm run build` (o `.mcp.json` aponta para o `dist/`).
- Download exige login — use **conta descartável**: `instaloader --login <conta>` uma vez para criar a sessão.

O template da nota é canônico em [`prompts/build-notes.md`](prompts/build-notes.md).
