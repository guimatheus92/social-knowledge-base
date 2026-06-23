#!/usr/bin/env python3
"""Consulta a base de conhecimento (RAG, recuperação).

Imprime as notas mais relevantes para a pergunta, com o caminho para citar.
Para uma resposta em prosa, passe esses trechos ao Opus/Claude Code.

Uso:
    python scripts/query.py "o que aprendi sobre tráfego pago?" [-k 5]
"""

from __future__ import annotations

import argparse
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / ".rag"
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def main() -> None:
    p = argparse.ArgumentParser(description="Consulta as notas (RAG).")
    p.add_argument("question", help="ex.: 'o que aprendi sobre X?'")
    p.add_argument("-k", type=int, default=5, help="quantas notas retornar")
    args = p.parse_args()

    if not DB.exists():
        print("Nada indexado ainda. Rode: python scripts/index_notes.py")
        return

    model = SentenceTransformer(MODEL_NAME)
    client = chromadb.PersistentClient(path=str(DB))
    col = client.get_or_create_collection("notes")

    q = model.encode([args.question], normalize_embeddings=True).tolist()
    res = col.query(query_embeddings=q, n_results=args.k)

    docs = res["documents"][0]
    metas = res["metadatas"][0]
    dists = res["distances"][0]
    if not docs:
        print("Nada indexado ainda. Rode: python scripts/index_notes.py")
        return

    print(f"\nTop {len(docs)} notas para: {args.question}\n")
    for doc, meta, dist in zip(docs, metas, dists):
        # distância cosseno (0 = idêntico) → score aproximado
        score = max(0.0, 1.0 - dist)
        # pula o frontmatter YAML para mostrar um trecho útil
        body = doc.split("---", 2)[-1].strip() if doc.startswith("---") else doc
        excerpt = body[:400].strip()
        print(f"### {meta['path']}  (score {score:.2f})")
        print(excerpt)
        print()


if __name__ == "__main__":
    main()
