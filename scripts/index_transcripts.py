#!/usr/bin/env python3
"""Indexa os transcripts (sidecars da GPU) no mesmo vetor das notas (Chroma/RAG).

Torna a biblioteca consultável só com a transcrição — antes de existir nota
curada. Lê `downloads/<conta>/transcripts/<post_id>.txt`, enriquece com
origem/legenda do manifest SQLite e faz upsert na coleção "notes".
Re-rodar só (re)indexa o que mudou (hash).

Uso:
    python scripts/index_transcripts.py [conta]
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path
from sqlite3 import connect

import chromadb
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = ROOT / "downloads"
MANIFESTS = ROOT / "manifests"
DB = ROOT / ".rag"
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def meta_for(account: str) -> dict[str, tuple[str, str]]:
    """{post_id: (origin, caption)} do manifest, se existir."""
    path = MANIFESTS / f"{account}.db"
    if not path.exists():
        return {}
    db = connect(str(path))
    rows = db.execute("SELECT post_id, origin, COALESCE(caption,'') FROM item").fetchall()
    db.close()
    return {pid: (origin, cap) for pid, origin, cap in rows}


def main() -> None:
    only = sys.argv[1] if len(sys.argv) > 1 else None
    sidecars = sorted(DOWNLOADS.glob("*/transcripts/*.txt"))
    if only:
        sidecars = [f for f in sidecars if f.parts[-3] == only]
    if not sidecars:
        print("Nenhum transcript em downloads/<conta>/transcripts/. Rode transcribe_gpu.py.")
        return

    model = SentenceTransformer(MODEL_NAME)
    client = chromadb.PersistentClient(path=str(DB))
    col = client.get_or_create_collection("notes", metadata={"hnsw:space": "cosine"})

    meta_cache: dict[str, dict[str, tuple[str, str]]] = {}
    ids, docs, metas = [], [], []
    for f in sidecars:
        account, post_id = f.parts[-3], f.stem
        text = f.read_text(encoding="utf-8").strip()
        if not text:
            continue
        if account not in meta_cache:
            meta_cache[account] = meta_for(account)
        origin, caption = meta_cache[account].get(post_id, ("", ""))
        header = f"@{account} · {origin or 'vídeo'} · transcrição"
        if caption:
            header += f"\nLegenda: {caption[:200]}"
        doc = f"{header}\n\n{text}"
        digest = hashlib.sha1(doc.encode("utf-8")).hexdigest()
        nid = f"transcript:{account}/{post_id}"

        existing = col.get(ids=[nid])
        if existing["ids"] and existing["metadatas"][0].get("digest") == digest:
            continue

        ids.append(nid)
        docs.append(doc)
        metas.append({
            "path": f.relative_to(ROOT).as_posix(),
            "kind": "transcript",
            "account": account,
            "post_id": post_id,
            "origin": origin,
            "digest": digest,
        })

    if not ids:
        print("Tudo já indexado (nenhuma mudança).")
        return

    # Chroma limita o upsert a ~5.461 itens por chamada → indexa em lotes.
    BATCH = 5000
    total = len(ids)
    for i in range(0, total, BATCH):
        sl = slice(i, i + BATCH)
        emb = model.encode(docs[sl], normalize_embeddings=True, batch_size=128).tolist()
        col.upsert(ids=ids[sl], documents=docs[sl], embeddings=emb, metadatas=metas[sl])
        print(f"  {min(i + BATCH, total)}/{total} indexados", flush=True)
    print(f"Indexados/atualizados {total} transcripts em {DB}")


if __name__ == "__main__":
    main()
