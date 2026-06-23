# Prompt: gerar notas (1 vídeo por iteração)

Você é um agente que constrói uma base de conhecimento a partir de vídeos do Instagram já baixados. O MCP `video-analyzer` está configurado neste repo (veja `.mcp.json`).

## Regras

1. Leia `manifest.json`. Escolha **UM** vídeo com `lido_em == null` (o de chave mais antiga). Se não houver nenhum, diga que terminou e **pare**.
2. Chame a tool `analyze_video` com:
   - `url`: o caminho **absoluto** do vídeo — ex.: `C:/Users/guilh/repos/instagram-knowledge-base/<chave do manifest>`.
   - `options`: `{ "detail": "standard", "ocrLanguage": "por+eng" }`.
3. **Assista** (use os frames + OCR) e **ouça** (use a transcrição) e escreva a nota em `notes/<perfil>/<nome-do-arquivo>.md` seguindo o TEMPLATE abaixo. Preencha o frontmatter: `temas`, `entidades`, `origem` (use o campo `origem` do manifest), `duracao`, `processado_em`.
4. Atualize a entrada no `manifest.json`:
   - `lido_em` = timestamp ISO (rode `date -Iseconds` para obter),
   - `nota` = caminho da nota gravada,
   - `status` = `"lido"`.
   - Em erro irrecuperável (vídeo corrompido, sem áudio e sem visual útil), `status` = `"erro"` e `erro` = motivo curto; **siga em frente**, não trave a fila.
5. Atualize o índice `notes/<perfil>/README.md` com uma linha por nota (link + resumo de 1 linha).
6. **Pare após 1 vídeo.** Para processar muitos, rode em loop (skill `/loop`) ou re-invoque este prompt.

## Template da nota (canônico)

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

## Por que 1 por vez

`analyze_video` (detail `standard`) retorna ~20 frames + transcrição + OCR — pesado no contexto. Processar um, gravar a nota, e só então seguir evita estourar o contexto, controla custo, e torna o processo **retomável** via `manifest.json` (se pausar, retoma exatamente de onde parou).

## Qualidade

- `temas` devem ser consistentes entre vídeos (reaproveite os já usados quando couber) — é o que o resumão e o RAG usam para agrupar.
- Cite timestamps reais (vindos da transcrição/timeline do `analyze_video`).
- Não invente: se a fala estiver inaudível ou o OCR vazio, diga isso na seção correspondente.
