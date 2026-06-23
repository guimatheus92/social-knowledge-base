#!/usr/bin/env python3
"""Indexa as notas markdown num vetor local (Chroma) para consulta/RAG.

Embeddings multilíngues (bons para português). Re-rodar só (re)indexa as notas
cujo conteúdo mudou (compara hash).

Uso:
    python scripts/index_notes.py
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parent.parent
NOTES = ROOT / "notes"
DB = ROOT / ".rag"
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

# Não indexar os arquivos de agregação (índice e resumão).
SKIP_NAMES = {"OVERVIEW.md", "README.md"}


def note_files() -> list[Path]:
    return [p for p in NOTES.rglob("*.md") if p.name not in SKIP_NAMES]


def main() -> None:
    files = note_files()
    if not files:
        print("Nenhuma nota em notes/. Rode o builder primeiro (prompts/build-notes.md).")
        return

    model = SentenceTransformer(MODEL_NAME)
    client = chromadb.PersistentClient(path=str(DB))
    col = client.get_or_create_collection("notes")

    ids, docs, metas = [], [], []
    for f in files:
        text = f.read_text(encoding="utf-8")
        digest = hashlib.sha1(text.encode("utf-8")).hexdigest()
        nid = f.relative_to(NOTES).as_posix()

        existing = col.get(ids=[nid])
        if existing["ids"] and existing["metadatas"][0].get("digest") == digest:
            continue  # já indexada e sem mudança

        ids.append(nid)
        docs.append(text)
        metas.append({"path": f.relative_to(ROOT).as_posix(), "digest": digest})

    if not ids:
        print("Tudo já indexado (nenhuma mudança).")
        return

    embeddings = model.encode(docs, show_progress_bar=True, normalize_embeddings=True).tolist()
    col.upsert(ids=ids, documents=docs, embeddings=embeddings, metadatas=metas)
    print(f"Indexadas/atualizadas {len(ids)} notas em {DB}")


if __name__ == "__main__":
    main()
