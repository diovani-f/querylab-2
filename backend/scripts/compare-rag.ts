import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env') })

import { SmartSchemaReducer } from '../src/services/smart-schema-reducer'
import { SchemaEmbeddingService } from '../src/services/schema-embedding-service'

async function compare(question: string) {
  console.log('\n' + '='.repeat(60))
  console.log('PERGUNTA:', question)
  console.log('='.repeat(60))

  const reducer = SmartSchemaReducer.getInstance()

  const kw = await reducer.reduceSchema({ question, schemaName: 'inep', maxTables: 15, includeRelationships: false })
  console.log('\nANTES (keyword) — tabelas selecionadas pelo heurístico:')
  kw.selectedTables?.forEach(t => console.log(' -', t))

  const rag = SchemaEmbeddingService.getInstance()
  const ragTables = await rag.findSimilarTables(question, 10)
  console.log('\nDEPOIS (RAG) — top-10 por similaridade semântica:')
  ragTables.forEach(t => console.log(' -', t))
}

async function main() {
  await compare('quantos estabelecimentos de ensino superior existem por estado?')
  await compare('qual o número de docentes por região?')
  process.exit(0)
}

main().catch(e => { console.error(e.message); process.exit(1) })
