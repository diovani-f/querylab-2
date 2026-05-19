# Plano: RAG no Schema

Substituir a seleção heurística de tabelas do `SmartSchemaReducer` por busca semântica vetorial.

**Motivação:** O SmartSchemaReducer usa keyword matching hardcoded e falha com sinônimos não previstos. RAG semântico resolve isso.

---

## Passos de implementação

### 1. Verificar pgvector

```sql
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

Se ausente:

```bash
sudo apt install postgresql-<version>-pgvector
```

---

### 2. Migration no querylab_app

Criar `backend/prisma/migrations/<ts>_add_schema_embeddings/migration.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE schema_table_embeddings (
  id          SERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL UNIQUE,
  schema_name TEXT NOT NULL,
  embedding   vector(768),
  metadata    JSONB
);

CREATE INDEX ON schema_table_embeddings
  USING hnsw (embedding vector_cosine_ops);
```

Registrar e atualizar Prisma:

```bash
prisma migrate resolve --applied <migration_name>
```

Adicionar ao `schema.prisma`:

```prisma
model SchemaTableEmbedding {
  id         Int                    @id @default(autoincrement())
  tableName  String                 @unique @map("table_name")
  schemaName String                 @map("schema_name")
  embedding  Unsupported("vector(768)")?
  metadata   Json?
}
```

```bash
prisma generate
```

---

### 3. Novo serviço — `schema-embedding-service.ts`

Arquivo: `backend/src/services/schema-embedding-service.ts`

- Singleton
- Usa `@google/generative-ai` (já instalado), model `text-embedding-004`, 768 dims
- `TaskType.RETRIEVAL_QUERY` para buscas, `RETRIEVAL_DOCUMENT` para indexação
- Pool `pg` separado conectado ao `POSTGRES_URL`

Métodos principais:

```ts
isIndexed(): Promise<boolean>
findSimilarTables(question: string, topK: number): Promise<string[]>
```

Query de busca:

```sql
SELECT table_name
FROM schema_table_embeddings
ORDER BY embedding <=> $1::vector
LIMIT $2
```

---

### 4. Script de indexação

Arquivo: `backend/scripts/index-schema-embeddings.ts`

- Merge de `inep-schema-summary.json` (colunas ativas) + `bkp2/inep-schema-summary.json` (description, keywords, category)
- Embedda com `TaskType.RETRIEVAL_DOCUMENT`
- Upsert idempotente

Formato do texto embeddado por tabela:

```
Tabela: {name}
Descrição: {description}
Categoria: {category}
Palavras-chave: {keywords}
Colunas: {primeiras 30 colunas sem tipo}
```

Adicionar ao `package.json`:

```json
"embed:index": "ts-node --skip-project scripts/index-schema-embeddings.ts"
```

Rodar:

```bash
npm run embed:index
```

---

### 5. Novo método no SmartSchemaReducer

Adicionar `reduceSchemaFromSeed(seedTableNames: string[], schemaName: string, includeRelationships: boolean)`:

- Recebe seeds vindos do RAG
- Chama `buildReducedSchema` (privado, mesma classe) que aplica FK expansion + core tables guarantee
- Retorna `SmartSchemaReductionResult`

---

### 6. Integração no SQLGenerationService

Modificar `getReducedSchema()` ([sql-generation-service.ts:407-502](backend/src/services/sql-generation-service.ts#L407)):

1. Extrair formatação de texto como helper `formatSchemaToText()`
2. Tentar RAG primeiro → fallback para keyword se RAG falhar ou não estiver indexado

---

### 7. Verificação

Rodar testes semânticos antes e depois:

```bash
ts-node scripts/run-semantic-tests.ts
```

Testar sinônimos críticos:

| Pergunta usa        | Tabela correta usa  |
|---------------------|---------------------|
| "estabelecimento"   | "instituição"       |
| "docente"           | "professor"         |
| "idhm"              | (indireto)          |

---

## Decisões de arquitetura

| Decisão                        | Escolha                                                                 |
|-------------------------------|-------------------------------------------------------------------------|
| Onde guardar embeddings       | `querylab_app` (Prisma DB, `POSTGRES_URL`) — **não** no banco INEP      |
| Modelo de embedding           | `text-embedding-004` (Gemini, já tem chave, zero custo extra)           |
| Novos pacotes npm             | Nenhum — `pg` e `@google/generative-ai` já estão instalados            |
| O que NÃO muda                | FK graph expansion, core tables guarantee, formatação do schema, fallback para schema completo |
