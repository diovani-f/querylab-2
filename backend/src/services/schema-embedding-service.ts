import { Pool } from 'pg'
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'

export class SchemaEmbeddingService {
  private static instance: SchemaEmbeddingService
  private pool: Pool
  private genAI: GoogleGenerativeAI
  private indexedCache: boolean | null = null

  private constructor() {
    this.pool = new Pool({ connectionString: process.env.POSTGRES_URL })
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  }

  static getInstance(): SchemaEmbeddingService {
    if (!SchemaEmbeddingService.instance) {
      SchemaEmbeddingService.instance = new SchemaEmbeddingService()
    }
    return SchemaEmbeddingService.instance
  }

  async isIndexed(): Promise<boolean> {
    if (this.indexedCache === true) return true
    try {
      const res = await this.pool.query(
        'SELECT COUNT(*)::int AS cnt FROM schema_table_embeddings'
      )
      const indexed = res.rows[0].cnt > 0
      if (indexed) this.indexedCache = true
      return indexed
    } catch {
      return false
    }
  }

  async findSimilarTables(
    question: string,
    topK: number = 12,
    distanceThreshold: number = 0.5
  ): Promise<{ tableName: string; schemaName: string }[]> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' })
    const result = await model.embedContent({
      content: { parts: [{ text: question }], role: 'user' },
      taskType: TaskType.RETRIEVAL_QUERY
    })
    const embeddingStr = `[${result.embedding.values.join(',')}]`

    const res = await this.pool.query<{ table_name: string; schema_name: string }>(
      `SELECT table_name, schema_name
       FROM (
         SELECT table_name, schema_name, embedding <=> $1::vector AS dist
         FROM schema_table_embeddings
         ORDER BY dist
         LIMIT $2
       ) t
       WHERE dist < $3`,
      [embeddingStr, topK, distanceThreshold]
    )
    return res.rows.map(r => ({ tableName: r.table_name, schemaName: r.schema_name }))
  }
}
