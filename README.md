# social-knowledge-base

Transforma os vídeos de um criador (Instagram hoje; **TikTok/YouTube em andamento**) numa base de conhecimento em markdown: o Opus **assiste** (frames + OCR) e **ouve** (transcrição PT-BR) cada vídeo e anota o que aprendeu — para muitos vídeos, de forma **retomável**. A UI é bilíngue (PT/EN).

> A leitura de vídeo é feita pelo MCP [`mcp-video-analyzer`](../mcp-video-analyzer) (build local). Pesquisa de mercado: nenhuma ferramenta open source faz o fluxo completo (download da conta inteira incl. Destaques → assistir + ouvir → base de conhecimento). As existentes só transcrevem áudio de um reel por vez.

## 🚀 Início rápido (subir o app)

**Opção A — Docker (recomendado; roda em qualquer lugar, sem instalar nada):**

```bash
mkdir -p data && cp /caminho/cookies.txt data/cookies.txt   # cookies de uma conta DESCARTÁVEL
docker compose up --build                                    # → http://localhost:3000
```

**Opção B — local (precisa Node 24):**

```bash
cd app && npm install && npm run dev                         # → http://localhost:3000
```

A UI é **bilíngue (PT/EN)** — alterne no botão de idioma no topo. No app: aponte o `cookies.txt`, **adicione uma conta** (ou cole o **link de um vídeo** → baixa só ele) e dê **Play** (progresso ao vivo). A transcrição/notas (camada de conhecimento) roda fora da UI — ver abaixo.

## Como funciona

1. **Download** — `scripts/download_instagram.py` (gallery-dl, autenticado por um `cookies.txt` do navegador) baixa os vídeos para `downloads/<perfil>/<aba>/`. (Ou pelo **app** em `app/`.)
2. **Transcrição (GPU)** — `scripts/transcribe_gpu.py` transcreve em lote com faster-whisper `medium` em CUDA (~16–24× tempo real) e grava sidecars `.vtt`/`.txt`/`.json` por vídeo. Retomável.
3. **Notas** — Claude Code + Opus, via `prompts/build-notes.md`, processam **1 vídeo por vez** (reusa a transcrição via `.vtt` + frames/OCR pelo MCP) e gravam `notes/<perfil>/videos/<video>.md`.
4. **Resumão + RAG** — `prompts/synthesize-overview.md` gera `notes/<perfil>/OVERVIEW.md` por tema; `scripts/index_transcripts.py` + `scripts/index_notes.py` + `scripts/query.py` dão busca (a biblioteca fica buscável só com a transcrição).

## Setup

```bash
# 1. Dependências Python (download + transcrição GPU + RAG)
pip install -r requirements.txt          # inclui faster-whisper (transcrição GPU)
# GPU (CUDA 12.8+, ex.: RTX 5060): pip install nvidia-cublas-cu12 nvidia-cudnn-cu12 nvidia-cuda-nvrtc-cu12 nvidia-cuda-runtime-cu12

# 2. ffmpeg — necessário pro DOWNLOAD (yt-dlp mescla vídeo+áudio; sem ele os vídeos vêm mudos)
winget install Gyan.FFmpeg

# 3. Buildar o MCP de leitura de vídeo
cd ../mcp-video-analyzer && npm run build && cd -

# 4. Exportar cookies.txt de uma sessão logada do IG (use uma CONTA DESCARTÁVEL)
#    Navegador -> extensão "Get cookies.txt LOCALLY" -> Export (formato Netscape). Salve fora do repo.
```

> O instaloader foi abandonado: o endpoint web GraphQL dele devolve `401 "Please wait a few minutes"` desde ~jan/2025, em qualquer conta/IP. O gallery-dl usa os cookies do navegador (rota da API mobile, que o IG ainda aceita).

O `.mcp.json` aponta o Claude Code para o build local do MCP (**v0.5.0**), com `WHISPER_MODEL`/`WHISPER_LANGUAGE`/`WHISPER_PROMPT` (glossário), `WHISPER_BIN` e `MCP_WRITE_SIDECARS=1`. A transcrição em massa, porém, é feita na **GPU** pelo `transcribe_gpu.py`; o MCP reusa esses `.vtt` e foca em frames/OCR.

> **Windows:** o `pip` instala o `whisper.exe` na pasta `Scripts/` do Python, que normalmente **não** está no PATH que o Claude Code herda — por isso o `.mcp.json` define `WHISPER_BIN` com o caminho completo. Confirme o seu com `python -c "import os,sys;print(os.path.join(os.path.dirname(sys.executable),'Scripts','whisper.exe'))"`. O **MCP** (transcrição) não precisa de ffmpeg no sistema — usa o `ffmpeg-static` embutido. Já o **download** (gallery-dl/yt-dlp) precisa do ffmpeg do sistema (passo 2 do Setup), senão os vídeos vêm **sem áudio**.

## Uso

```bash
# 1) Baixar todos os vídeos do perfil (incl. Em Destaque)
python scripts/download_instagram.py <perfil_alvo> --cookies C:\caminho\ig_cookies.txt

# 2) Transcrever em lote na GPU (resumível) + indexar p/ busca
python scripts/transcribe_gpu.py <perfil_alvo>
python scripts/index_transcripts.py <perfil_alvo>

# 3) Gerar as notas: abra o Claude Code NESTE diretório e rode o prompt
#    prompts/build-notes.md — processa 1 vídeo por vez (use /loop para lote).

# 4) Resumão por tema (no Claude Code): prompts/synthesize-overview.md  -> notes/<perfil>/OVERVIEW.md

# 4) Busca / RAG
python scripts/index_notes.py
python scripts/query.py "o que aprendi sobre <tema>?"
```

## App (UI) — `app/`

Há um **app web** (Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui) em [`app/`](app/) que dá interface ao download — alternativa visual ao CLI:

```bash
cd app
npm install
npm run dev          # → http://localhost:3000
npm run test         # Vitest (engine/parsers)
```

- **App único** (sem backend Python): o Node chama `gallery-dl`/`yt-dlp`/`ffmpeg` via `child_process`. Roda como **servidor Node** (`next dev`/`next start`, runtime node).
- **Funciona:** adicionar várias contas; **baixar 1 vídeo só pelo link** (a conta dona é criada sozinha); escolher mídia (imagem/vídeo); **Play → progresso ao vivo (SSE)** com tamanho/tempo; seletor de pasta nativo do Windows; cookies auto-detectados; **biblioteca** (grid de thumbnails + busca/filtros/ordenação, abre no player do sistema); **config de leitura LLM** (Whisper model/idioma/detail/OCR → grava no `.mcp.json`); gestão de disco; tooltips e confirmação em ações sensíveis.
- **UI bilíngue (PT/EN)** — seletor de idioma no topo (i18n leve, sem dependência extra).
- **Multi-rede:** abstração `SourceProvider` (Instagram + TikTok; YouTube via yt-dlp em andamento) — o pipeline de conhecimento é agnóstico de rede.
- **Docker:** `docker compose up` → app pronto com Node + Python + gallery-dl/yt-dlp/ffmpeg embutidos (ver [Início rápido](#-início-rápido-subir-o-app)).
- **Manifest:** migrou de `manifest.json` (raiz, legado) para **SQLite por conta** em `manifests/<conta>.db` (via `node:sqlite`) + export JSON versionável `manifests/<conta>.json`. Migração: `cd app && npx tsx src/server/migrate/importManifest.ts` (reconcilia com o disco). O `manifest.json` da raiz fica como backup até você confirmar.

> O CLI Python (`scripts/download_instagram.py`) continua funcionando em paralelo. A camada de **transcrição** (GPU) e **notas (LLM)** roda fora da UI: `scripts/transcribe_gpu.py` + Claude Code/`prompts/build-notes.md` (ver [CLAUDE.md](CLAUDE.md) e [scripts/CLAUDE.md](scripts/CLAUDE.md)); integrar a leitura à UI é fase futura.

## Rodar com Docker (em qualquer lugar)

O jeito mais simples — sem instalar Node/Python/gallery-dl/ffmpeg na mão:

```bash
# 1. cookies.txt (Netscape, de uma conta descartável logada) no volume de dados
mkdir -p data && cp /caminho/cookies.txt data/cookies.txt
# 2. sobe tudo
docker compose up --build      # → http://localhost:3000
```

- A imagem já traz **Node 24 + Python + gallery-dl + yt-dlp + ffmpeg**; o app chama essas CLIs por dentro.
- O volume **`./data`** persiste `downloads/` e os manifests SQLite no host; o `cookies.txt` é **auto-detectado** pela UI.
- **GPU (opcional):** descomente `gpus: all` no `docker-compose.yml` (precisa do NVIDIA Container Toolkit). A transcrição em massa na GPU também roda no host via `scripts/transcribe_gpu.py`.

## Definição de sucesso

1. Todo vídeo da conta (incl. Em Destaque) tem uma nota `.md`.
2. Cada nota captura o que foi **dito** (transcrição) **e mostrado** (OCR/visual).
3. Processo **retomável** via `manifest.json` (registra o que foi baixado/lido e *quando*).
4. Transcrição em **português** legível (Whisper `small` + `pt`).
5. Índice por perfil **e** `notes/<perfil>/OVERVIEW.md` (resumão por tema) com links de volta.
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

- Use uma **conta descartável** pros cookies: highlights/stories exigem login e o Instagram pode aplicar rate-limit ou ban a scrapers. O gallery-dl já espaça os requests (~10s) sozinho. O `cookies.txt` é uma **credencial viva** — mantenha privado (gitignored via `*cookies*.txt`) e reexporte quando expirar (o download começa a redirecionar pro login).
- `downloads/` e `audio/` não são versionados (pesados). `notes/` e `manifest.json` são — é a base de conhecimento + o progresso.
