# Prompt: sintetizar OVERVIEW.md (resumão por tema)

Objetivo: gerar/atualizar `notes/OVERVIEW.md` consolidando o aprendizado de **todas** as notas, agrupado por tema. Use **map-reduce** — não tente ler tudo de uma vez (são muitos vídeos).

## Passos

1. **Map (coleta barata):** leia só o **frontmatter** de todas as `notes/**/*.md` (campos `temas`, `video`, `perfil`). Não leia o corpo ainda. Agrupe as notas por `tema`.
2. **Reduce por tema:** para cada tema:
   - Leia os corpos das notas daquele tema. Se forem muitas, resuma em **lotes** (ex.: 20 por vez) e depois combine os resumos parciais.
   - Produza 3-7 **aprendizados recorrentes** do tema, cada um com link para as notas-fonte: `[arquivo](notes/<perfil>/<arquivo>.md)`.
3. **Montar `notes/OVERVIEW.md`:**
   - Topo: sumário com a lista de temas (links âncora) + contagem de vídeos processados.
   - Uma seção `## <tema>` por tema, com os aprendizados consolidados e links.
   - Seção final `## Lacunas / dúvidas` com o que ficou ambíguo ou contraditório entre vídeos.
4. **Atualizar `manifest.json.sintese`:** `ultimo_overview_em` = timestamp ISO (`date -Iseconds`); `videos_no_ultimo_overview` = nº de vídeos com `lido_em != null`.

## Incremental (retomável)

Se `OVERVIEW.md` já existe: re-sintetize **apenas** os temas cujas notas mudaram desde `sintese.ultimo_overview_em` (compare com `lido_em` das notas), preservando as demais seções. Assim o resumão acompanha a entrada de novos vídeos sem refazer tudo.

## Depois

- Atualize o RAG: `python scripts/index_notes.py`.
- Teste a consulta: `python scripts/query.py "o que aprendi sobre <tema>?"`.
