# ADR-0002 — Internal source retrieval uses keyword/file search, not vector embeddings (v1)

Internal sources (Approved content + Knowledge uploads) are searched via simple keyword/file lookup in v1. We considered semantic retrieval via embeddings + a vector store (Pinecone, Supabase pgvector, or local) — which is the obvious modern choice for content retrieval — and explicitly deferred it.

Reasons:

1. For v1, the Brand's internal corpus is small (one company's worth of docs and past articles), and keyword search is good enough at that scale.
2. Embeddings introduce a chunking strategy, an embedding pipeline, a vector DB dependency, and a re-embedding step every time the Brand profile or content evolves — significant operational surface area for a non-technical Operator to inherit.

We will revisit when (a) a customer's corpus crosses ~500 documents, or (b) keyword search demonstrably misses relevant matches in real Planning sessions.
