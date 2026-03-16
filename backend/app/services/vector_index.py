"""FAISS-based vector index for graph nodes and commit messages."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from app.services.models import ProjectData


@dataclass
class IndexDocument:
    doc_type: str  # "node" | "commit" | "relationship"
    id: str
    text: str
    metadata: dict = field(default_factory=dict)


class VectorIndex:
    """Per-project FAISS vector index."""

    def __init__(self, embedding_model_name: str):
        self._model_name = embedding_model_name
        self._model = None
        self._index = None
        self._documents: list[IndexDocument] = []

    def _load_model(self):
        if self._model is not None:
            return
        from sentence_transformers import SentenceTransformer
        self._model = SentenceTransformer(self._model_name)

    def build_index(self, project_data: ProjectData) -> None:
        """Build the FAISS index from project data."""
        self._documents = []
        self._build_node_docs(project_data)
        self._build_relationship_docs(project_data)
        if project_data.history:
            self._build_commit_docs(project_data)

        if not self._documents:
            return

        self._load_model()
        texts = [d.text for d in self._documents]
        embeddings = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

        import faiss
        dim = embeddings.shape[1]
        self._index = faiss.IndexFlatIP(dim)
        self._index.add(np.array(embeddings, dtype=np.float32))

    def search(self, query: str, top_k: int = 10) -> list[IndexDocument]:
        """Search the index. Returns ranked documents."""
        if not self._index or not self._documents:
            return []

        self._load_model()
        q_embed = self._model.encode([query], normalize_embeddings=True)
        scores, indices = self._index.search(np.array(q_embed, dtype=np.float32), min(top_k, len(self._documents)))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or score < 0.1:
                continue
            doc = self._documents[idx]
            results.append(doc)
        return results

    @property
    def doc_count(self) -> int:
        return len(self._documents)

    @property
    def is_built(self) -> bool:
        return self._index is not None

    def _build_node_docs(self, data: ProjectData):
        for node in data.cytoscape_json.get("nodes", []):
            d = node["data"]
            parts = [f"{d['type']}: {d['label']}"]
            if d.get("file"):
                parts.append(f"in {d['file']}")
            if d.get("line") and d["line"] > 0:
                parts.append(f"line {d['line']}")
            if d.get("directory"):
                parts.append(f"(directory: {d['directory']})")
            if d.get("connections"):
                parts.append(f"with {d['connections']} connections")

            self._documents.append(IndexDocument(
                doc_type="node",
                id=d["id"],
                text=" ".join(parts),
                metadata={"type": d["type"], "file": d.get("file", ""), "label": d["label"]},
            ))

    def _build_relationship_docs(self, data: ProjectData):
        # Build a label lookup
        labels = {}
        for node in data.cytoscape_json.get("nodes", []):
            labels[node["data"]["id"]] = node["data"]["label"]

        # Group edges by source
        from collections import defaultdict
        grouped: dict[str, list] = defaultdict(list)
        for edge in data.cytoscape_json.get("edges", []):
            d = edge["data"]
            grouped[d["source"]].append(d)

        for source_id, edges in grouped.items():
            src_label = labels.get(source_id, source_id)
            parts = []
            for e in edges:
                tgt_label = labels.get(e["target"], e["target"])
                parts.append(f"{e['relationship']} {tgt_label}")

            if parts:
                text = f"{src_label} {', '.join(parts)}"
                self._documents.append(IndexDocument(
                    doc_type="relationship",
                    id=source_id,
                    text=text,
                    metadata={"source": source_id},
                ))

    def _build_commit_docs(self, data: ProjectData):
        if not data.history:
            return
        for commit in data.history.commits:
            files = ", ".join(commit.files_changed[:10])
            if len(commit.files_changed) > 10:
                files += f" (+{len(commit.files_changed) - 10} more)"
            text = (
                f"Commit {commit.short_sha} by {commit.author_name}: "
                f"{commit.message[:200]}. Files changed: {files}"
            )
            self._documents.append(IndexDocument(
                doc_type="commit",
                id=commit.sha,
                text=text,
                metadata={
                    "author": commit.author_name,
                    "timestamp": commit.timestamp,
                    "files": commit.files_changed,
                },
            ))


# Per-project index store
index_store: dict[str, VectorIndex] = {}


def get_or_build_index(project_id: str, project_data: ProjectData) -> VectorIndex:
    """Get existing index or build a new one."""
    from app.config import settings
    if project_id not in index_store:
        idx = VectorIndex(settings.embedding_model)
        idx.build_index(project_data)
        index_store[project_id] = idx
    return index_store[project_id]
