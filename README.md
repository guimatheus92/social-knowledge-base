# instagram-knowledge-base

Transforma os vídeos de uma conta do Instagram (Reels, Stories e **Em Destaque**) numa base de conhecimento em markdown: o Opus **assiste** (frames + OCR) e **ouve** (transcrição PT-BR) cada vídeo e anota o que aprendeu — para muitos vídeos, de forma **retomável**.

> A leitura de vídeo é feita pelo MCP [`mcp-video-analyzer`](../mcp-video-analyzer) (build local). Este repo é só a orquestração específica do Instagram. Pesquisa de mercado: nenhuma ferramenta open source faz o fluxo completo (download da conta inteira incl. Destaques → assistir + ouvir → base de conhecimento). As existentes só transcrevem áudio de um reel por vez.

## Como funciona

1. **Download** — `scripts/download_instagram.py` (instaloader) baixa os vídeos para `downloads/<perfil>/` e registra cada um em `manifest.json`.
2. **Notas** — Claude Code + Opus, via `prompts/build-notes.md`, processam **1 vídeo por vez** (transcrição + frames + OCR pelo MCP) e gravam `notes/<perfil>/<video>.md`.
3. **Resumão** — `prompts/synthesize-overview.md` gera `notes/OVERVIEW.md` por tema; `scripts/index_notes.py` + `scripts/query.py` dão busca (RAG).

## Setup

```bash
# 1. Dependências Python (download + RAG)
pip install -r requirements.txt
pip install -U openai-whisper            # usado DENTRO do MCP p/ transcrição PT-BR

# 2. Buildar o MCP de leitura de vídeo
cd ../mcp-video-analyzer && npm run build && cd -

# 3. Criar a sessão do instaloader (uma vez) — use uma CONTA DESCARTÁVEL
instaloader --login <sua_conta>
```

O `.mcp.json` já aponta o Claude Code para o build local do MCP, com `WHISPER_MODEL=small`, `WHISPER_LANGUAGE=pt` e `WHISPER_BIN` (caminho do `whisper.exe`).

> **Windows:** o `pip` instala o `whisper.exe` na pasta `Scripts/` do Python, que normalmente **não** está no PATH que o Claude Code herda — por isso o `.mcp.json` define `WHISPER_BIN` com o caminho completo. Confirme o seu com `python -c "import os,sys;print(os.path.join(os.path.dirname(sys.executable),'Scripts','whisper.exe'))"`. Não é preciso instalar ffmpeg: o MCP usa o `ffmpeg-static` embutido.

## Uso

```bash
# 1) Baixar todos os vídeos do perfil (incl. Em Destaque)
python scripts/download_instagram.py <perfil_alvo> --login <sua_conta>

# 2) Gerar as notas: abra o Claude Code NESTE diretório e rode o prompt
#    prompts/build-notes.md — processa 1 vídeo por vez (use /loop para lote).

# 3) Resumão por tema (no Claude Code): prompts/synthesize-overview.md  -> notes/OVERVIEW.md

# 4) Busca / RAG
python scripts/index_notes.py
python scripts/query.py "o que aprendi sobre <tema>?"
```

## Definição de sucesso

1. Todo vídeo da conta (incl. Em Destaque) tem uma nota `.md`.
2. Cada nota captura o que foi **dito** (transcrição) **e mostrado** (OCR/visual).
3. Processo **retomável** via `manifest.json` (registra o que foi baixado/lido e *quando*).
4. Transcrição em **português** legível (Whisper `small` + `pt`).
5. Índice por perfil **e** `notes/OVERVIEW.md` (resumão por tema) com links de volta.
6. Consulta posterior por RAG (`query.py`) com citação das notas.

## Template da nota

```markdown
---
video: downloads/<perfil>/<arquivo>.mp4
perfil: <perfil>
origem: highlight:<nome> | reel | story
duracao: "<m:ss>"
processado_em: <ISO timestamp>
temas: [<tema1>, <tema2>]
entidades: [<pessoa/produto/lugar>]
---

# <título/arquivo do vídeo>

## Resumo
<2-4 frases do que o vídeo ensina>

## Principais aprendizados
- <bullet>

## Texto na tela (OCR)
- <timestamp> — <texto relevante>

## Trechos da fala (transcrição)
- <timestamp> — <citação relevante>
```

## Avisos

- Use uma **conta descartável** no `--login`: highlights/stories exigem login e o Instagram pode aplicar rate-limit ou ban a scrapers. Evite rodar em paralelo agressivo; o instaloader já aplica `--request-timeout`.
- `downloads/` e `audio/` não são versionados (pesados). `notes/` e `manifest.json` são — é a base de conhecimento + o progresso.
