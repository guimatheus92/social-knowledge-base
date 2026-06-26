#!/usr/bin/env python3
"""Query the knowledge base (RAG, retrieval).

Prints the most relevant notes for the question, with the path for citation.
For a prose answer, pass these excerpts to Opus/Claude Code.

Usage:
    python scripts/query.py "what did I learn about paid traffic?" [-k 5]
"""

from __future__ import annotations

import argparse
import json
import sys
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
    p.add_argument("--json", action="store_true", help="saída JSON (para integração)")
    args = p.parse_args()

    if not DB.exists():
        print("[]" if args.json else "Nada indexado ainda. Rode: python scripts/index_notes.py")
        return

    model = SentenceTransformer(MODEL_NAME)
    client = chromadb.PersistentClient(path=str(DB))
    col = client.get_or_create_collection("notes", metadata={"hnsw:space": "cosine"})

    q = model.encode([args.question], normalize_embeddings=True).tolist()
    res = col.query(query_embeddings=q, n_results=args.k)

    docs = res["documents"][0]
    metas = res["metadatas"][0]
    dists = res["distances"][0]
    if not docs:
        print("[]" if args.json else "Nada indexado ainda. Rode: python scripts/index_notes.py")
        return

    hits = []
    for doc, meta, dist in zip(docs, metas, dists):
        # cosine distance (0 = identical) -> approximate score
        score = max(0.0, 1.0 - dist)
        # skip the YAML frontmatter to show a useful excerpt
        body = doc.split("---", 2)[-1].strip() if doc.startswith("---") else doc
        hits.append({"path": meta.get("path", ""), "score": round(score, 3), "excerpt": body[:400].strip()})

    if args.json:
        json.dump(hits, sys.stdout, ensure_ascii=False)
        return

    print(f"\nTop {len(hits)} notas para: {args.question}\n")
    for h in hits:
        print(f"### {h['path']}  (score {h['score']:.2f})")
        print(h["excerpt"])
        print()


if __name__ == "__main__":
    main()
