CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS schema_table_embeddings (
  id          SERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL UNIQUE,
  schema_name TEXT NOT NULL,
  embedding   vector(3072),
  metadata    JSONB
);

-- Índice HNSW suporta no máximo 2000 dims; para poucos schemas, varredura sequencial é suficiente
