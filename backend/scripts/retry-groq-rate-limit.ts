/**
 * Re-executa apenas os testes do groq que falharam por rate limit (429).
 * Atualiza o arquivo semantic_test_results_unified.json substituindo
 * apenas os registros afetados e recalculando o summary do groq.
 */
import { SQLGenerationService } from '../src/services/sql-generation-service'
import { QueryExecutionService } from '../src/services/query-execution-service'
import * as fs from 'fs'
import * as path from 'path'

require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

// IDs das perguntas que falharam por rate limit no groq
const RATE_LIMIT_IDS = ['P8', 'P9', 'P13', 'P14', 'P15', 'P18', 'P20', 'P21']

interface Pergunta {
  id: string
  dificuldade: string
  pergunta: string
  sql: string
}

interface ComparisonResult {
  questionId: string
  dificuldade: string
  pergunta: string
  provider: string
  model: string
  sqlGerado: string
  geracaoSucesso: boolean
  geracaoErro: string
  execucaoIASucesso: boolean
  execucaoIARowCount: number
  execucaoIARowCountSemLimit: number
  execucaoIAErro: string
  temLimit: boolean
  execucaoGabaritoSucesso: boolean
  execucaoGabaritoRowCount: number
  execucaoGabaritoErro: string
  rowCountMatch: boolean
  rowCountDiff: number
  columnOverlap: number
  dataMatchScore: number
  veredito: 'CORRETO' | 'PARCIAL' | 'INCORRETO' | 'ERRO_IA' | 'ERRO_GABARITO'
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function hasLimitClause(sql: string): boolean {
  return /\bLIMIT\s+\d+/i.test(sql)
}

function removeLimitFromSQL(sql: string): string {
  return sql.replace(/\s+LIMIT\s+\d+(\s+OFFSET\s+\d+)?\s*$/i, '').trim()
}

function normalizeValue(val: any): string {
  if (val === null || val === undefined) return ''
  const s = String(val).trim().toLowerCase()
  const num = Number(s)
  if (!isNaN(num) && s !== '') return String(num)
  return s
}

function rowsToObjects(rows: any[][], columns: string[]): Record<string, any>[] {
  return rows.map(row => {
    const obj: Record<string, any> = {}
    columns.forEach((col, i) => { obj[col.toLowerCase()] = row[i] })
    return obj
  })
}

function calcColumnOverlap(colsIA: string[], colsGabarito: string[]): number {
  if (colsGabarito.length === 0) return 100
  if (colsIA.length === 0) return 0

  const iaSet = new Set(colsIA.map(c => c.toLowerCase()))
  const gabColsLower = colsGabarito.map(c => c.toLowerCase())
  let matches = gabColsLower.filter(c => iaSet.has(c)).length

  const aggregatePatterns = ['count', 'total', 'sum', 'avg', 'max', 'min', 'media', 'quantidade', 'qt_']
  for (const gabCol of gabColsLower) {
    if (iaSet.has(gabCol)) continue
    const gabIsAggregate = aggregatePatterns.some(p => gabCol.includes(p))
    if (gabIsAggregate) {
      const iaHasAggregate = colsIA.some(c => aggregatePatterns.some(p => c.toLowerCase().includes(p)))
      if (iaHasAggregate) matches++
    }
  }

  return Math.round((Math.min(matches, colsGabarito.length) / colsGabarito.length) * 100)
}

function calcDataMatchScore(
  dataIA: Record<string, any>[],
  dataGabarito: Record<string, any>[],
  colsGabarito: string[],
  iaUsedLimit: boolean = false
): number {
  if (dataIA.length === 0 && dataGabarito.length === 0) return 100
  if (dataIA.length === 0 || dataGabarito.length === 0) return 0

  const gabCols = colsGabarito.map(c => c.toLowerCase())

  if (dataGabarito.length === 1 && dataIA.length === 1) {
    const gabRow = dataGabarito[0]
    const iaRow = dataIA[0]
    let matches = 0, total = 0

    for (const col of gabCols) {
      const gabVal = normalizeValue(gabRow[col])
      if (gabVal === '') continue
      total++
      const iaVals = Object.values(iaRow).map(normalizeValue)
      if (iaVals.includes(gabVal)) {
        matches++
      } else {
        const gabNum = Number(gabVal)
        if (!isNaN(gabNum) && gabNum !== 0) {
          const found = iaVals.some(v => {
            const n = Number(v)
            return !isNaN(n) && Math.abs(n - gabNum) / Math.abs(gabNum) < 0.05
          })
          if (found) matches++
        }
      }
    }
    return total > 0 ? Math.round((matches / total) * 100) : 0
  }

  const buildRowKey = (row: Record<string, any>): string =>
    Object.values(row).map(normalizeValue).sort().join('|')

  const gabRowKeys = new Set(dataGabarito.map(buildRowKey))

  if (iaUsedLimit) {
    const iaSample = dataIA.slice(0, Math.min(dataIA.length, 20))
    const iaMatchCount = iaSample.filter(row => gabRowKeys.has(buildRowKey(row))).length
    return iaSample.length > 0 ? Math.round((iaMatchCount / iaSample.length) * 100) : 0
  }

  const iaRowKeys = new Set(dataIA.map(buildRowKey))
  let matchCount = 0
  for (const gabKey of Array.from(gabRowKeys)) {
    if (iaRowKeys.has(gabKey)) matchCount++
  }
  return gabRowKeys.size > 0 ? Math.round((matchCount / gabRowKeys.size) * 100) : 0
}

function determineVerdict(result: Partial<ComparisonResult>): ComparisonResult['veredito'] {
  if (!result.execucaoGabaritoSucesso) return 'ERRO_GABARITO'
  if (!result.geracaoSucesso || !result.execucaoIASucesso) return 'ERRO_IA'

  const score = result.dataMatchScore || 0
  const rowMatch = result.rowCountMatch || false
  const colOverlap = result.columnOverlap || 0
  const temLimit = result.temLimit || false

  if (score >= 80 && colOverlap >= 60) {
    if (rowMatch || temLimit) return 'CORRETO'
  }
  if (score >= 80 && rowMatch) return 'CORRETO'
  if (score >= 40 || (colOverlap >= 50 && (result.rowCountDiff || 999) <= 5)) return 'PARCIAL'
  return 'INCORRETO'
}

function recalcSummary(results: ComparisonResult[]) {
  return ['gemini', 'groq', 'deepseek'].map(provider => {
    const provResults = results.filter(r => r.provider === provider)
    if (provResults.length === 0) return null

    return {
      provider,
      total: provResults.length,
      corretos: provResults.filter(r => r.veredito === 'CORRETO').length,
      parciais: provResults.filter(r => r.veredito === 'PARCIAL').length,
      incorretos: provResults.filter(r => r.veredito === 'INCORRETO').length,
      errosIA: provResults.filter(r => r.veredito === 'ERRO_IA').length,
      avgDataMatchScore: Math.round(
        provResults.reduce((s, r) => s + r.dataMatchScore, 0) / provResults.length * 10
      ) / 10,
      byDificuldade: ['facil', 'medio', 'dificil'].map(dif => {
        const d = provResults.filter(r => r.dificuldade === dif)
        if (d.length === 0) return null
        return {
          dificuldade: dif,
          total: d.length,
          corretos: d.filter(r => r.veredito === 'CORRETO').length,
          parciais: d.filter(r => r.veredito === 'PARCIAL').length,
          incorretos: d.filter(r => r.veredito === 'INCORRETO').length,
          errosIA: d.filter(r => r.veredito === 'ERRO_IA').length,
          avgDataMatchScore: Math.round(
            d.reduce((s, r) => s + r.dataMatchScore, 0) / d.length * 10
          ) / 10
        }
      }).filter(Boolean)
    }
  }).filter(Boolean)
}

async function main() {
  console.log('🔁 Re-executando testes groq com falha de rate limit...')
  console.log(`📋 Perguntas alvo: ${RATE_LIMIT_IDS.join(', ')}`)

  const perguntasPath = path.resolve(__dirname, 'perguntas_text_to_sql.json')
  const todasPerguntas: Pergunta[] = JSON.parse(fs.readFileSync(perguntasPath, 'utf8'))
  const perguntas = todasPerguntas.filter(p => RATE_LIMIT_IDS.includes(p.id))

  console.log(`📋 ${perguntas.length} perguntas carregadas para re-teste`)

  const sqlService = SQLGenerationService.getInstance()
  const queryExecService = QueryExecutionService.getInstance()

  const newGroqResults: ComparisonResult[] = []

  for (let i = 0; i < perguntas.length; i++) {
    const p = perguntas[i]
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`⏳ [${i + 1}/${perguntas.length}] ${p.id} (${p.dificuldade}): "${p.pergunta}"`)
    console.log(`${'═'.repeat(60)}`)

    // Executar gabarito
    let gabaritoData: Record<string, any>[] = []
    let gabaritoCols: string[] = []
    let gabaritoRowCount = 0
    let gabaritoSucesso = false
    let gabaritoErro = ''

    try {
      console.log('📖 Executando SQL do gabarito...')
      const gabResult = await queryExecService.executeWithTimeout(p.sql, { timeoutMs: 60000 })
      gabaritoSucesso = !!gabResult.success
      gabaritoRowCount = gabResult.rowCount || 0
      gabaritoCols = gabResult.columns || []
      gabaritoErro = gabResult.error || ''
      if (gabResult.rows && gabResult.columns) {
        gabaritoData = rowsToObjects(gabResult.rows, gabResult.columns)
      }
      console.log(`  ✅ Gabarito: ${gabaritoRowCount} rows, ${gabaritoCols.length} cols`)
    } catch (err: any) {
      gabaritoErro = err.message || String(err)
      console.error(`  ❌ Erro no gabarito: ${gabaritoErro}`)
    }

    // Gerar SQL com todas as IAs (groq vem junto)
    try {
      console.log('🤖 Gerando SQL (filtrando resultado do groq)...')
      const result = await sqlService.generateSQLParallel({
        question: p.pergunta,
        model: 'parallel',
        sessionId: `groq-retry-${p.id}`,
        conversationHistory: []
      })

      const groqResult = result.results?.find(r => r.provider === 'groq')

      if (!groqResult) {
        console.error('  ❌ Resultado do groq não encontrado')
        continue
      }

      const sqlGerado = groqResult.sql || ''
      const iaTemLimit = hasLimitClause(sqlGerado)

      const comparison: Partial<ComparisonResult> = {
        questionId: p.id,
        dificuldade: p.dificuldade,
        pergunta: p.pergunta,
        provider: groqResult.provider,
        model: groqResult.model,
        sqlGerado,
        geracaoSucesso: groqResult.success,
        geracaoErro: groqResult.error || '',
        execucaoIASucesso: !!groqResult.executionSuccess,
        execucaoIARowCount: groqResult.rowCount || 0,
        execucaoIARowCountSemLimit: groqResult.rowCount || 0,
        temLimit: iaTemLimit,
        execucaoIAErro: groqResult.executionError || '',
        execucaoGabaritoSucesso: gabaritoSucesso,
        execucaoGabaritoRowCount: gabaritoRowCount,
        execucaoGabaritoErro: gabaritoErro,
      }

      if (groqResult.executionSuccess && gabaritoSucesso && groqResult.data) {
        const iaData = groqResult.data || []
        const iaCols = iaData.length > 0 ? Object.keys(iaData[0]) : []
        const iaDataNorm = iaData.map((row: any) => {
          const obj: Record<string, any> = {}
          Object.entries(row).forEach(([k, v]) => { obj[k.toLowerCase()] = v })
          return obj
        })

        let iaRowCountReal = groqResult.rowCount || 0
        if (iaTemLimit) {
          try {
            const sqlSemLimit = removeLimitFromSQL(sqlGerado)
            console.log('    🔍 IA usou LIMIT — re-executando sem LIMIT...')
            const execSemLimit = await queryExecService.executeWithTimeout(sqlSemLimit, { timeoutMs: 60000 })
            if (execSemLimit.success) {
              iaRowCountReal = execSemLimit.rowCount || 0
              comparison.execucaoIARowCountSemLimit = iaRowCountReal
            }
          } catch (_) {}
        }

        comparison.rowCountMatch = iaRowCountReal === gabaritoRowCount
        comparison.rowCountDiff = Math.abs(iaRowCountReal - gabaritoRowCount)
        comparison.columnOverlap = calcColumnOverlap(iaCols, gabaritoCols)
        comparison.dataMatchScore = calcDataMatchScore(iaDataNorm, gabaritoData, gabaritoCols, iaTemLimit)
      } else {
        comparison.rowCountMatch = false
        comparison.rowCountDiff = Math.abs((groqResult.rowCount || 0) - gabaritoRowCount)
        comparison.columnOverlap = 0
        comparison.dataMatchScore = 0
      }

      comparison.veredito = determineVerdict(comparison)
      const fullResult = comparison as ComparisonResult
      newGroqResults.push(fullResult)

      const icon = fullResult.veredito === 'CORRETO' ? '✅' :
                   fullResult.veredito === 'PARCIAL' ? '🟡' :
                   fullResult.veredito === 'ERRO_IA' ? '❌' :
                   fullResult.veredito === 'ERRO_GABARITO' ? '⚠️' : '🔴'

      console.log(`  ${icon} groq: ${fullResult.veredito} | DataMatch: ${fullResult.dataMatchScore}% | Rows IA: ${fullResult.execucaoIARowCount} vs Gab: ${gabaritoRowCount}`)

    } catch (error: any) {
      console.error(`  ❌ Erro geral: ${error.message}`)
      const errorResult: ComparisonResult = {
        questionId: p.id, dificuldade: p.dificuldade, pergunta: p.pergunta,
        provider: 'groq', model: 'llama-3.3-70b-versatile',
        sqlGerado: '', geracaoSucesso: false, geracaoErro: error.message,
        execucaoIASucesso: false, execucaoIARowCount: 0, execucaoIARowCountSemLimit: 0, temLimit: false, execucaoIAErro: '',
        execucaoGabaritoSucesso: gabaritoSucesso, execucaoGabaritoRowCount: gabaritoRowCount, execucaoGabaritoErro: gabaritoErro,
        rowCountMatch: false, rowCountDiff: gabaritoRowCount, columnOverlap: 0, dataMatchScore: 0,
        veredito: 'ERRO_IA'
      }
      newGroqResults.push(errorResult)
    }

    if (i < perguntas.length - 1) {
      console.log('⏳ Aguardando 15 segundos...')
      await delay(15000)
    }
  }

  // ── Atualizar o JSON unificado ──
  const unifiedPath = path.resolve(__dirname, '../data/test-results-csvs/semantic_test_results_unified.json')
  const unified = JSON.parse(fs.readFileSync(unifiedPath, 'utf8'))

  // Substituir as entradas groq das perguntas re-testadas
  const updatedResults: ComparisonResult[] = unified.results.map((r: ComparisonResult) => {
    if (r.provider === 'groq' && RATE_LIMIT_IDS.includes(r.questionId)) {
      const newResult = newGroqResults.find(nr => nr.questionId === r.questionId)
      if (newResult) {
        console.log(`🔄 Atualizando ${r.questionId} groq: ${r.veredito} → ${newResult.veredito}`)
        return newResult
      }
    }
    return r
  })

  const updatedUnified = {
    metadata: {
      ...unified.metadata,
      generatedAt: new Date().toISOString(),
      lastRun: new Date().toISOString(),
      groqRetryAt: new Date().toISOString(),
    },
    summary: recalcSummary(updatedResults),
    results: updatedResults
  }

  fs.writeFileSync(unifiedPath, JSON.stringify(updatedUnified, null, 2), 'utf8')
  console.log(`\n✅ JSON unificado atualizado: ${unifiedPath}`)

  // Sumário das mudanças
  console.log('\n' + '═'.repeat(60))
  console.log('📊 RESULTADO DO RE-TESTE GROQ')
  console.log('═'.repeat(60))
  for (const r of newGroqResults) {
    const icon = r.veredito === 'CORRETO' ? '✅' : r.veredito === 'PARCIAL' ? '🟡' : r.veredito === 'ERRO_IA' ? '❌' : '🔴'
    console.log(`${icon} ${r.questionId}: ${r.veredito} (DataMatch: ${r.dataMatchScore}%)`)
  }

  const groqSummary = updatedUnified.summary.find((s: any) => s.provider === 'groq')
  console.log('\n📈 Novo summary groq:', JSON.stringify(groqSummary, null, 2))
}

main().catch(console.error)
