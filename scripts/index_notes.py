#!/usr/bin/env python3
"""Indexes the markdown notes into a local vector store (Chroma) for querying/RAG.

Multilingual embeddings (good for Portuguese). Re-running only (re)indexes the notes
whose content changed (compares the hash).

Usage:
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

# Don't index the aggregation files (index and overview).
SKIP_NAMES = {"OVERVIEW.md", "README.md"}


def note_files() -> list[Path]:
    return [p for p in NOTES.rglob("*.md") if p.name not in SKIP_NAMES]


def main() -> None:
    files = note_files()
    if not files:
        print("No notes in notes/. Run the builder first (prompts/build-notes.md).")
        return

    model = SentenceTransformer(MODEL_NAME)
    client = chromadb.PersistentClient(path=str(DB))
    # cosine (not the default L2): with normalized embeddings, score = 1 - dist stays readable
    col = client.get_or_create_collection("notes", metadata={"hnsw:space": "cosine"})

    ids, docs, metas = [], [], []
    for f in files:
        text = f.read_text(encoding="utf-8")
        digest = hashlib.sha1(text.encode("utf-8")).hexdigest()
        nid = f.relative_to(NOTES).as_posix()

        existing = col.get(ids=[nid])
        if existing["ids"] and existing["metadatas"][0].get("digest") == digest:
            continue  # already indexed and unchanged

        ids.append(nid)
        docs.append(text)
        metas.append({"path": f.relative_to(ROOT).as_posix(), "digest": digest})

    if not ids:
        print("Everything already indexed (no changes).")
        return

    # Chroma caps the upsert at ~5,461 items per call -> index in batches.
    BATCH = 5000
    total = len(ids)
    for i in range(0, total, BATCH):
        sl = slice(i, i + BATCH)
        emb = model.encode(docs[sl], normalize_embeddings=True, batch_size=128).tolist()
        col.upsert(ids=ids[sl], documents=docs[sl], embeddings=emb, metadatas=metas[sl])
    print(f"Indexed/updated {total} notes in {DB}")


if __name__ == "__main__":
    main()
