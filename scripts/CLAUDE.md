# CLAUDE.md — `scripts/`

> Scripts Python standalone do pipeline. Cada um faz **uma** etapa e é **retomável**.
> Visão geral do projeto: [`../CLAUDE.md`](../CLAUDE.md). Template de nota: [`../prompts/build-notes.md`](../prompts/build-notes.md).

## Fluxo (ordem do pipeline)

```
1. BAIXAR        download_instagram.py   → downloads/<perfil>/<aba>/*.mp4   (+ manifest)
   (ou via app/, que grava manifests/<conta>.db)
2. TRANSCREVER   transcribe_gpu.py       → transcripts/*.{txt,json} + <video>.vtt   (GPU)
3. INDEXAR       index_transcripts.py    → .rag  (busca só com transcrição)
                 index_notes.py          → .rag  (busca nas notas curadas)
4. CONSULTAR     query.py "pergunta"     → trechos relevantes p/ citar
```

A escrita das **notas** (`notes/<perfil>/*.md`) é feita pelo agente (Opus), seguindo
`prompts/build-notes.md` — não há script para isso.

## Os scripts

### `download_instagram.py` — baixa um perfil
Baixa **todos** os vídeos de um perfil (Reels, Stories, Em Destaque, Posts) via **gallery-dl**
autenticado por `cookies.txt` (o instaloader morreu). Injeta o **ffmpeg no PATH** (sem ele o
vídeo vem **sem áudio**) e usa `--download-archive` para retomar sem re-baixar.
```
python scripts/download_instagram.py <perfil> --cookies C:\caminho\cookies.txt
                                     [--tabs highlights,reels,stories] [--range 1-50]
                                     [--include-images] [--skip-download]
```
- **Saída:** `downloads/<perfil>/<aba>/*.mp4` + registra em `manifest.json` (raiz, **legado** em PT).
- **Obs:** o caminho moderno de download é o **app** ([`../app/`](../app/)), que grava o manifest
  em **SQLite** `manifests/<conta>.db`. O `transcribe_gpu.py` lê **esse** SQLite — então, se você
  baixou só pela CLI, gere o SQLite com a migração do app (`app/src/server/migrate/importManifest.ts`).

### `transcribe_gpu.py` — transcreve em lote (GPU se disponível, senão CPU) ⭐
Transcrição em massa com **faster-whisper**: usa **GPU/CUDA quando há** (`--device auto`, ~16–24×
tempo real; ~9,6k vídeos em horas) e **cai pra CPU** automaticamente se não houver GPU (funciona em
qualquer máquina, só mais lento — em CPU use `--model small`). Lê o manifest SQLite
(`status='downloaded'`), pula o que já tem sidecar (**retomável**), e usa um **glossário de domínio**
(`initial_prompt`) p/ acertar nomes próprios (Doha, Smiles, Iberia…).
```
python scripts/transcribe_gpu.py <conta> [--limit N] [--category reel|highlight|story|post]
                                 [--model medium] [--device cuda] [--beam 1]
```
- **Saída:** `downloads/<conta>/transcripts/<post_id>.{txt,json}` (p/ as notas/RAG) **e**
  `downloads/<conta>/<aba>/<post_id>.vtt` **ao lado do vídeo** — o MCP `video-analyzer` lê esse
  `.vtt` como sidecar e **pula o Whisper**, fazendo só frames/OCR.
- **Gotcha Windows:** o preâmbulo do script chama `os.add_dll_directory()` nas pastas
  `nvidia/*/bin` do pip — sem isso dá `cublas64_12.dll cannot be loaded`. A **1ª** transcrição
  numa GPU Blackwell (sm_120) é lenta (JIT dos kernels); depois estabiliza em ~2s.
- **Glossário é por-conta:** o atual é de **milhas**. Para outra conta (ex.: culinária), troque a
  constante `GLOSSARY` ou ela contamina a transcrição com termos errados.

### `index_transcripts.py` — indexa transcrições no RAG
Adiciona os sidecars `.txt` à coleção Chroma `notes` (espaço **cosseno**), enriquecendo com
origem/legenda do manifest. Torna a biblioteca **inteira** buscável **só com a transcrição**,
antes de existir nota curada. Re-roda só o que mudou (hash).
```
python scripts/index_transcripts.py [conta]
```

### `index_notes.py` — indexa as notas no RAG
Indexa `notes/**/*.md` (exceto `OVERVIEW.md`/`README.md`) na mesma coleção `notes` (cosseno),
com embeddings multilíngues (bons p/ PT). Re-roda só as notas alteradas (hash).
```
python scripts/index_notes.py
```

### `query.py` — consulta a base (RAG)
Busca os trechos (notas **e** transcrições) mais relevantes p/ uma pergunta, com caminho p/ citar.
Para resposta em prosa, passe os trechos ao Opus.
```
python scripts/query.py "o que aprendi sobre Clube Turbo?" [-k 5]
```

### `video_url.py` — id da mídia → link do Instagram
O `id` (nome do arquivo / citação nas notas) é o **pk** da mídia; este script converte para o
**shortcode** e monta a URL clicável (`https://www.instagram.com/p/<shortcode>/`). Vale para
**reels/posts**; stories e Em Destaque são efêmeros e podem não resolver.
```
python scripts/video_url.py 3924652210327473259 [<id> ...]
```

## Convenções comuns
- **`PYTHONUTF8=1`** no Windows (evita `UnicodeEncodeError` cp1252 nos prints).
- **`.rag/`** = índice vetorial Chroma (gitignored). Apagar e re-rodar os `index_*` recria.
- Tudo é **retomável**: download (archive), transcrição (sidecar existente), índices (hash).
- **Dependências:** `pip install -r ../requirements.txt`; GPU: `faster-whisper` + wheels
  `nvidia-*-cu12` (CUDA 12.8+ p/ Blackwell). ffmpeg no PATH p/ download/extração de áudio.
