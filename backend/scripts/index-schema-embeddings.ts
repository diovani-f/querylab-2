import * as fs from 'fs'
import * as path from 'path'
import { Pool } from 'pg'
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env') })

const CESTA_TABLES = new Set([
  'uf_ibge',
  'idhms',
  'pibs_per_capita',
  'variaveis_pib_municipios_ibge',
  'ibge_demografia_municipios'
])

const appPool = new Pool({ connectionString: process.env.POSTGRES_URL })

const queryPool = new Pool({
  host: process.env.QUERY_DB_HOST,
  port: parseInt(process.env.QUERY_DB_PORT || '5432'),
  user: process.env.QUERY_DB_USER,
  password: process.env.QUERY_DB_PASSWORD,
  database: process.env.QUERY_DB_NAME,
  ssl: process.env.QUERY_DB_SSL === 'true' ? { rejectUnauthorized: false } : false
})

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const EMBEDDING_DIMS = 3072

async function setupTable(): Promise<void> {
  await appPool.query('CREATE EXTENSION IF NOT EXISTS vector')

  // Recriar se existir com dimensões erradas (ex: migração de 768 → 3072)
  try {
    const res = await appPool.query(`
      SELECT atttypmod FROM pg_attribute
      WHERE attrelid = 'schema_table_embeddings'::regclass
        AND attname = 'embedding'
    `)
    if (res.rows.length > 0) {
      const storedDims = res.rows[0].atttypmod - 4 // pgvector armazena N+4
      if (storedDims !== EMBEDDING_DIMS) {
        console.log(`🔄 Recriando tabela (${storedDims} → ${EMBEDDING_DIMS} dims)...`)
        await appPool.query('DROP TABLE IF EXISTS schema_table_embeddings CASCADE')
      }
    }
  } catch {
    // tabela ainda não existe, ok
  }

  await appPool.query(`
    CREATE TABLE IF NOT EXISTS schema_table_embeddings (
      id          SERIAL PRIMARY KEY,
      table_name  TEXT NOT NULL UNIQUE,
      schema_name TEXT NOT NULL,
      embedding   vector(${EMBEDDING_DIMS}),
      metadata    JSONB
    )
  `)
  // Índice HNSW suporta no máximo 2000 dims — para 34 tabelas, varredura sequencial é suficiente
}

async function sampleRows(tableName: string, schemaName: string): Promise<string> {
  try {
    const res = await queryPool.query(
      `SELECT * FROM ${schemaName}.${tableName} LIMIT 5`
    )
    if (!res.rows.length) return ''

    const cols = res.fields.slice(0, 10).map(f => f.name)
    const header = cols.join(' | ')
    const rows = res.rows.map(row =>
      cols.map(c => String(row[c] ?? '').substring(0, 30)).join(' | ')
    )
    return `${header}\n${rows.join('\n')}`
  } catch {
    return ''
  }
}

async function embedText(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })
  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    taskType: TaskType.RETRIEVAL_DOCUMENT
  })
  return result.embedding.values
}

async function upsert(
  tableName: string,
  schemaName: string,
  embedding: number[],
  metadata: object
): Promise<void> {
  const embeddingStr = `[${embedding.join(',')}]`
  await appPool.query(
    `INSERT INTO schema_table_embeddings (table_name, schema_name, embedding, metadata)
     VALUES ($1, $2, $3::vector, $4)
     ON CONFLICT (table_name) DO UPDATE SET
       schema_name = EXCLUDED.schema_name,
       embedding   = EXCLUDED.embedding,
       metadata    = EXCLUDED.metadata`,
    [tableName, schemaName, embeddingStr, JSON.stringify(metadata)]
  )
}

async function main(): Promise<void> {
  console.log('🔧 Configurando tabela schema_table_embeddings...')
  await setupTable()

  const currentPath = path.join(__dirname, '../data/schema-discovery/inep-schema-summary.json')
  const bkp2Path = path.join(__dirname, '../data/schema-discovery/bkp2/inep-schema-summary.json')

  const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'))
  const bkp2 = JSON.parse(fs.readFileSync(bkp2Path, 'utf8'))

  const bkp2Map = new Map<string, any>(bkp2.tables.map((t: any) => [t.name, t]))

  let indexed = 0
  let failed = 0

  for (const table of current.tables) {
    const schemaName = CESTA_TABLES.has(table.name) ? 'cesta' : 'inep'
    const bkp2Table = bkp2Map.get(table.name) || {}

    const cols = (table.columns as string[]).map(c => c.split(':')[0])
    const keywords: string[] = bkp2Table.keywords || []
    const description: string = bkp2Table.description || `Tabela ${table.name}`
    const category: string = bkp2Table.category || 'other'

    const samples = await sampleRows(table.name, schemaName)

    const parts = [
      `Tabela: ${table.name} (schema: ${schemaName})`,
      `Descrição: ${description}`,
      `Categoria: ${category}`,
      `Palavras-chave: ${keywords.join(', ')}`,
      `Colunas: ${cols.join(', ')}`,
    ]
    if (samples) parts.push(`Exemplos de dados:\n${samples}`)
    const embeddingText = parts.join('\n')

    try {
      process.stdout.write(`  Indexando ${table.name}... `)
      const embedding = await embedText(embeddingText)
      await upsert(table.name, schemaName, embedding, {
        description,
        category,
        keywords,
        columns: cols,
        schemaName
      })
      console.log('✅')
      indexed++
    } catch (e) {
      console.log('❌', e instanceof Error ? e.message : e)
      failed++
    }

    // Respeitar rate limit da API Gemini (free tier: ~60 req/min)
    await new Promise(r => setTimeout(r, 1100))
  }

  console.log(`\n✅ Indexados: ${indexed} | ❌ Falhas: ${failed}`)

  await appPool.end()
  await queryPool.end()
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
