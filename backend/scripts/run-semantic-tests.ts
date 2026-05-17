import { SQLGenerationService } from '../src/services/sql-generation-service'
import { QueryExecutionService } from '../src/services/query-execution-service'
import * as fs from 'fs'
import * as path from 'path'

// Configura o dotenv para carregar as variáveis de ambiente (DB, chaves da API, etc)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

// ─────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────
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
  // Geração
  sqlGerado: string
  geracaoSucesso: boolean
  geracaoErro: string
  // Execução da IA
  execucaoIASucesso: boolean
  execucaoIARowCount: number   // rowCount com LIMIT (como executado)
  execucaoIARowCountSemLimit: number // rowCount sem LIMIT (total real)
  execucaoIAErro: string
  temLimit: boolean             // se o SQL gerado pela IA contém LIMIT
  // Execução do Gabarito
  execucaoGabaritoSucesso: boolean
  execucaoGabaritoRowCount: number
  execucaoGabaritoErro: string
  // Comparação semântica
  rowCountMatch: boolean
  rowCountDiff: number
  columnOverlap: number  // percentual de colunas em comum (0-100)
  dataMatchScore: number // score de similaridade dos dados (0-100)
  veredito: 'CORRETO' | 'PARCIAL' | 'INCORRETO' | 'ERRO_IA' | 'ERRO_GABARITO'
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function escapeCSV(text: string | undefined | null): string {
  if (!text) return ''
  return `"${String(text).replace(/"/g, '""')}"`
}

/**
 * Detecta se um SQL possui cláusula LIMIT
 */
function hasLimitClause(sql: string): boolean {
  return /\bLIMIT\s+\d+/i.test(sql)
}

/**
 * Remove a cláusula LIMIT (e OFFSET) de um SQL para obter o count total real.
 * Suporta queries simples, CTEs e subqueries.
 */
function removeLimitFromSQL(sql: string): string {
  // Remove LIMIT N e OFFSET N (opcionais) do final da query ou antes de OFFSET
  return sql
    .replace(/\s+LIMIT\s+\d+(\s+OFFSET\s+\d+)?\s*$/i, '')
    .trim()
}

/**
 * Normaliza um valor para comparação (lowercase, trim, remove zeros decimais desnecessários)
 */
function normalizeValue(val: any): string {
  if (val === null || val === undefined) return ''
  const s = String(val).trim().toLowerCase()
  // Normalizar números: "3.00" → "3", "0.50" → "0.5"
  const num = Number(s)
  if (!isNaN(num) && s !== '') return String(num)
  return s
}

/**
 * Converte rows (array de arrays) + columns para array de objetos
 */
function rowsToObjects(rows: any[][], columns: string[]): Record<string, any>[] {
  return rows.map(row => {
    const obj: Record<string, any> = {}
    columns.forEach((col, i) => {
      obj[col.toLowerCase()] = row[i]
    })
    return obj
  })
}

/**
 * Calcula o percentual de colunas do gabarito que existem no resultado da IA.
 * Para queries de agregação (1 coluna de COUNT/SUM), faz match por tipo semântico.
 */
function calcColumnOverlap(colsIA: string[], colsGabarito: string[], dataGabarito?: Record<string, any>[]): number {
  if (colsGabarito.length === 0) return 100
  if (colsIA.length === 0) return 0

  const iaSet = new Set(colsIA.map(c => c.toLowerCase()))
  const gabColsLower = colsGabarito.map(c => c.toLowerCase())

  // Match exato de nome
  let matches = gabColsLower.filter(c => iaSet.has(c)).length

  // Match semântico: se o gabarito tem coluna de agregação (count, total, sum, avg, max, min)
  // e a IA também tem, considerar como match (aliases podem diferir)
  const aggregatePatterns = ['count', 'total', 'sum', 'avg', 'max', 'min', 'media', 'quantidade', 'qt_']
  for (const gabCol of gabColsLower) {
    if (iaSet.has(gabCol)) continue // Já contabilizado acima
    const gabIsAggregate = aggregatePatterns.some(p => gabCol.includes(p))
    if (gabIsAggregate) {
      // Verificar se alguma coluna da IA também é agregada
      const iaHasAggregate = colsIA.some(c =>
        aggregatePatterns.some(p => c.toLowerCase().includes(p))
      )
      if (iaHasAggregate) matches++
    }
  }

  return Math.round((Math.min(matches, colsGabarito.length) / colsGabarito.length) * 100)
}

/**
 * Compara os dados retornados pela IA com os dados do gabarito.
 * 
 * Estratégia:
 *  1. Se ambos retornam 0 rows → score 100
 *  2. Para queries de agregação (1 row), compara valores numéricos
 *  3. Para queries de listagem, verifica overlap dos valores-chave
 *     → Quando a IA usou LIMIT, verifica se as rows da IA são subset válido do gabarito
 */
function calcDataMatchScore(
  dataIA: Record<string, any>[],
  dataGabarito: Record<string, any>[],
  colsGabarito: string[],
  iaUsedLimit: boolean = false
): number {
  // Ambos vazios
  if (dataIA.length === 0 && dataGabarito.length === 0) return 100
  // Só um vazio
  if (dataIA.length === 0 || dataGabarito.length === 0) return 0

  const gabCols = colsGabarito.map(c => c.toLowerCase())

  // ── Caso 1: Agregação (1 row no gabarito) ──
  if (dataGabarito.length === 1 && dataIA.length === 1) {
    const gabRow = dataGabarito[0]
    const iaRow = dataIA[0]
    let matches = 0
    let total = 0

    for (const col of gabCols) {
      const gabVal = normalizeValue(gabRow[col])
      if (gabVal === '') continue
      total++

      // Procurar valor equivalente em qualquer coluna da IA
      const iaVals = Object.values(iaRow).map(normalizeValue)
      if (iaVals.includes(gabVal)) {
        matches++
      } else {
        // Tentar match numérico com margem de 5%
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

  // ── Caso 2: Listagem (múltiplas rows) ──
  // Usa assinatura composta (todos os valores normalizados, ordenados) para comparação robusta.
  // Isso funciona mesmo quando a IA usa nomes ou ordem de colunas diferentes do gabarito.
  const buildRowKey = (row: Record<string, any>): string =>
    Object.values(row).map(normalizeValue).sort().join('|')

  const gabRowKeys = new Set(dataGabarito.map(buildRowKey))

  if (iaUsedLimit) {
    // ── Caso 2a: IA usou LIMIT — verificar se as rows da IA são subset válido do gabarito ──
    const iaSample = dataIA.slice(0, Math.min(dataIA.length, 20))
    const iaMatchCount = iaSample.filter(row => gabRowKeys.has(buildRowKey(row))).length
    return iaSample.length > 0 ? Math.round((iaMatchCount / iaSample.length) * 100) : 0
  }

  // ── Caso 2b: Sem LIMIT — quantas rows do gabarito a IA também retornou ──
  const iaRowKeys = new Set(dataIA.map(buildRowKey))
  let matchCount = 0
  for (const gabKey of Array.from(gabRowKeys)) {
    if (iaRowKeys.has(gabKey)) matchCount++
  }

  return gabRowKeys.size > 0 ? Math.round((matchCount / gabRowKeys.size) * 100) : 0
}

/**
 * Determina o veredicto final da comparação
 * 
 * Nota: quando a IA usou LIMIT intencional, o rowCountMatch é calculado
 * comparando o rowCount SEM limit com o gabarito. Assim, o veredicto
 * é justo mesmo que a IA tenha adicionado LIMIT 50/100.
 */
function determineVerdict(result: Partial<ComparisonResult>): ComparisonResult['veredito'] {
  if (!result.execucaoGabaritoSucesso) return 'ERRO_GABARITO'
  if (!result.geracaoSucesso || !result.execucaoIASucesso) return 'ERRO_IA'

  const score = result.dataMatchScore || 0
  const rowMatch = result.rowCountMatch || false
  const colOverlap = result.columnOverlap || 0
  const temLimit = result.temLimit || false

  // Score alto + colunas compatíveis
  // Quando IA usa LIMIT intencional, o rowMatch já foi calculado com o count sem LIMIT
  // → score >= 80 e colOverlap >= 60 é suficiente (rowMatch como bônus)
  if (score >= 80 && colOverlap >= 60) {
    if (rowMatch || temLimit) return 'CORRETO'
  }
  // Para queries de agregação (1 row), se o dataMatch for alto, o colOverlap não é crítico
  // (aliases de COUNT/SUM podem diferir entre gabarito e IA)
  if (score >= 80 && rowMatch) return 'CORRETO'
  // Score razoável ou rowcount próximo
  if (score >= 40 || (colOverlap >= 50 && (result.rowCountDiff || 999) <= 5)) return 'PARCIAL'
  return 'INCORRETO'
}


// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function runSemanticTests() {
  console.log('🚀 Iniciando testes semânticos Text-to-SQL...')

  // Carregar perguntas
  const perguntasPath = path.resolve(__dirname, 'perguntas_text_to_sql.json')
  const perguntas: Pergunta[] = JSON.parse(fs.readFileSync(perguntasPath, 'utf8'))
  console.log(`📋 Total de perguntas carregadas: ${perguntas.length}`)

  // Parâmetros do CLI
  // Ex: npx ts-node scripts/run-semantic-tests.ts --start 0 --limit 5
  const args = process.argv.slice(2)
  let startIndex = 0
  let limit = perguntas.length

  const startIndexArg = args.findIndex(a => a === '--start')
  if (startIndexArg !== -1 && args[startIndexArg + 1]) {
    startIndex = parseInt(args[startIndexArg + 1], 10)
    if (isNaN(startIndex)) startIndex = 0
  }

  const limitArg = args.findIndex(a => a === '--limit')
  if (limitArg !== -1 && args[limitArg + 1]) {
    limit = parseInt(args[limitArg + 1], 10)
    if (isNaN(limit)) limit = perguntas.length
  }

  const perguntasToProcess = perguntas.slice(startIndex, startIndex + limit)
  console.log(`📋 Processando ${perguntasToProcess.length} perguntas (do índice ${startIndex} ao ${startIndex + perguntasToProcess.length - 1})`)

  const sqlService = SQLGenerationService.getInstance()
  const queryExecService = QueryExecutionService.getInstance()

  const allResults: ComparisonResult[] = []

  // Cabeçalho do CSV
  const csvHeaders = [
    'ID', 'Dificuldade', 'Pergunta', 'Provider', 'Modelo',
    'SQL Gerado', 'Geracao OK', 'Geracao Erro',
    'Exec IA OK', 'Exec IA Rows (c/ LIMIT)', 'Exec IA Rows (sem LIMIT)', 'Tem LIMIT', 'Exec IA Erro',
    'Exec Gabarito OK', 'Exec Gabarito Rows', 'Exec Gabarito Erro',
    'RowCount Match', 'RowCount Diff', 'Column Overlap %', 'Data Match %',
    'Veredito'
  ].join(';')

  let csvContent = csvHeaders + '\n'

  for (let i = 0; i < perguntasToProcess.length; i++) {
    const p = perguntasToProcess[i]
    const actualIndex = startIndex + i
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`⏳ [${i + 1}/${perguntasToProcess.length}] (Índice Orig: ${actualIndex}) ${p.id} (${p.dificuldade}): "${p.pergunta}"`)
    console.log(`${'═'.repeat(60)}`)

    // ── 1. Executar o SQL do gabarito ──
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

    try {
      console.log('🤖 Gerando SQL com as 4 IAs...')
      const result = await sqlService.generateSQLParallel({
        question: p.pergunta,
        model: 'parallel',
        sessionId: `semantic-test-${p.id}`,
        conversationHistory: []
      })

      // ── 2. Gerar SQL com as 4 IAs ──
      if (result.results && result.results.length > 0) {
        for (const aiResult of result.results) {
          // ── Detectar LIMIT no SQL gerado ──
          const sqlGerado = aiResult.sql || ''
          const iaTemLimit = hasLimitClause(sqlGerado)

          const comparison: Partial<ComparisonResult> = {
            questionId: p.id,
            dificuldade: p.dificuldade,
            pergunta: p.pergunta,
            provider: aiResult.provider,
            model: aiResult.model,
            sqlGerado,
            geracaoSucesso: aiResult.success,
            geracaoErro: aiResult.error || '',
            execucaoIASucesso: !!aiResult.executionSuccess,
            execucaoIARowCount: aiResult.rowCount || 0,
            execucaoIARowCountSemLimit: aiResult.rowCount || 0, // será atualizado abaixo
            temLimit: iaTemLimit,
            execucaoIAErro: aiResult.executionError || '',
            execucaoGabaritoSucesso: gabaritoSucesso,
            execucaoGabaritoRowCount: gabaritoRowCount,
            execucaoGabaritoErro: gabaritoErro,
          }

          // ── 3. Comparar resultados ──
          if (aiResult.executionSuccess && gabaritoSucesso && aiResult.data) {
            const iaData = aiResult.data || []
            const iaCols = iaData.length > 0 ? Object.keys(iaData[0]) : []

            // Normalizar IA data para lowercase keys
            const iaDataNorm = iaData.map((row: any) => {
              const obj: Record<string, any> = {}
              Object.entries(row).forEach(([k, v]) => { obj[k.toLowerCase()] = v })
              return obj
            })

            // ── Se a IA usou LIMIT, re-executar sem LIMIT para comparar rowCount real ──
            let iaRowCountReal = aiResult.rowCount || 0
            if (iaTemLimit) {
              try {
                const sqlSemLimit = removeLimitFromSQL(sqlGerado)
                console.log(`    🔍 IA usou LIMIT — re-executando sem LIMIT para comparação de rowCount...`)
                const execSemLimit = await queryExecService.executeWithTimeout(sqlSemLimit, { timeoutMs: 60000 })
                if (execSemLimit.success) {
                  iaRowCountReal = execSemLimit.rowCount || 0
                  comparison.execucaoIARowCountSemLimit = iaRowCountReal
                  console.log(`    📊 Rows sem LIMIT: ${iaRowCountReal} | Rows c/ LIMIT: ${aiResult.rowCount} | Gabarito: ${gabaritoRowCount}`)
                }
              } catch (err: any) {
                console.warn(`    ⚠️ Não foi possível re-executar sem LIMIT: ${err.message}`)
              }
            }

            comparison.rowCountMatch = iaRowCountReal === gabaritoRowCount
            comparison.rowCountDiff = Math.abs(iaRowCountReal - gabaritoRowCount)
            comparison.columnOverlap = calcColumnOverlap(iaCols, gabaritoCols)
            comparison.dataMatchScore = calcDataMatchScore(iaDataNorm, gabaritoData, gabaritoCols, iaTemLimit)
          } else {
            comparison.rowCountMatch = false
            comparison.rowCountDiff = Math.abs((aiResult.rowCount || 0) - gabaritoRowCount)
            comparison.columnOverlap = 0
            comparison.dataMatchScore = 0
          }

          comparison.veredito = determineVerdict(comparison)

          const fullResult = comparison as ComparisonResult
          allResults.push(fullResult)

          const icon = fullResult.veredito === 'CORRETO' ? '✅' :
                       fullResult.veredito === 'PARCIAL' ? '🟡' :
                       fullResult.veredito === 'ERRO_IA' ? '❌' :
                       fullResult.veredito === 'ERRO_GABARITO' ? '⚠️' : '🔴'

          console.log(`  ${icon} ${aiResult.provider}: ${fullResult.veredito} | DataMatch: ${fullResult.dataMatchScore}% | ColOverlap: ${fullResult.columnOverlap}% | Rows IA: ${fullResult.execucaoIARowCount} vs Gab: ${gabaritoRowCount}`)

          // Linha CSV
          csvContent += [
            escapeCSV(p.id),
            escapeCSV(p.dificuldade),
            escapeCSV(p.pergunta),
            escapeCSV(aiResult.provider),
            escapeCSV(aiResult.model),
            escapeCSV(sqlGerado),
            escapeCSV(String(aiResult.success)),
            escapeCSV(aiResult.error || ''),
            escapeCSV(String(!!aiResult.executionSuccess)),
            escapeCSV(String(aiResult.rowCount || 0)),
            escapeCSV(String(fullResult.execucaoIARowCountSemLimit)),
            escapeCSV(String(iaTemLimit)),
            escapeCSV(aiResult.executionError || ''),
            escapeCSV(String(gabaritoSucesso)),
            escapeCSV(String(gabaritoRowCount)),
            escapeCSV(gabaritoErro),
            escapeCSV(String(fullResult.rowCountMatch)),
            escapeCSV(String(fullResult.rowCountDiff)),
            escapeCSV(String(fullResult.columnOverlap)),
            escapeCSV(String(fullResult.dataMatchScore)),
            escapeCSV(fullResult.veredito)
          ].join(';') + '\n'
        }
      } else {
        console.log('  ⚠️ Nenhum resultado retornado pelas IAs.')
        const errorResult: ComparisonResult = {
          questionId: p.id, dificuldade: p.dificuldade, pergunta: p.pergunta,
          provider: 'ALL', model: 'N/A',
          sqlGerado: '', geracaoSucesso: false, geracaoErro: 'Nenhum resultado retornado',
          execucaoIASucesso: false, execucaoIARowCount: 0, execucaoIARowCountSemLimit: 0, temLimit: false, execucaoIAErro: '',
          execucaoGabaritoSucesso: gabaritoSucesso, execucaoGabaritoRowCount: gabaritoRowCount, execucaoGabaritoErro: gabaritoErro,
          rowCountMatch: false, rowCountDiff: gabaritoRowCount, columnOverlap: 0, dataMatchScore: 0,
          veredito: 'ERRO_IA'
        }
        allResults.push(errorResult)

        csvContent += [
          escapeCSV(p.id), escapeCSV(p.dificuldade), escapeCSV(p.pergunta),
          escapeCSV('ALL'), escapeCSV('N/A'),
          escapeCSV(''), escapeCSV('false'), escapeCSV('Nenhum resultado'),
          escapeCSV('false'), escapeCSV('0'), escapeCSV('0'), escapeCSV('false'), escapeCSV(''),
          escapeCSV(String(gabaritoSucesso)), escapeCSV(String(gabaritoRowCount)), escapeCSV(gabaritoErro),
          escapeCSV('false'), escapeCSV(String(gabaritoRowCount)), escapeCSV('0'), escapeCSV('0'),
          escapeCSV('ERRO_IA')
        ].join(';') + '\n'
      }
    } catch (error: any) {
      console.error(`  ❌ Erro geral: ${error.message}`)
      const errorResult: ComparisonResult = {
        questionId: p.id, dificuldade: p.dificuldade, pergunta: p.pergunta,
        provider: 'ALL', model: 'N/A',
        sqlGerado: '', geracaoSucesso: false, geracaoErro: error.message,
        execucaoIASucesso: false, execucaoIARowCount: 0, execucaoIARowCountSemLimit: 0, temLimit: false, execucaoIAErro: '',
        execucaoGabaritoSucesso: gabaritoSucesso, execucaoGabaritoRowCount: gabaritoRowCount, execucaoGabaritoErro: gabaritoErro,
        rowCountMatch: false, rowCountDiff: gabaritoRowCount, columnOverlap: 0, dataMatchScore: 0,
        veredito: 'ERRO_IA'
      }
      allResults.push(errorResult)

      csvContent += [
        escapeCSV(p.id), escapeCSV(p.dificuldade), escapeCSV(p.pergunta),
        escapeCSV('ALL'), escapeCSV('N/A'),
        escapeCSV(''), escapeCSV('false'), escapeCSV(error.message),
        escapeCSV('false'), escapeCSV('0'), escapeCSV('0'), escapeCSV('false'), escapeCSV(''),
        escapeCSV(String(gabaritoSucesso)), escapeCSV(String(gabaritoRowCount)), escapeCSV(gabaritoErro),
        escapeCSV('false'), escapeCSV(String(gabaritoRowCount)), escapeCSV('0'), escapeCSV('0'),
        escapeCSV('ERRO_IA')
      ].join(';') + '\n'
    }

    // Espera entre perguntas para não sobrecarregar as APIs
    if (i < perguntasToProcess.length - 1) {
      console.log('⏳ Aguardando 50 segundos para não sobrecarregar as APIs...')
      await delay(50000)
    }
  }

  // ─────────────────────────────────────────────────────────
  // Sumário Final
  // ─────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60))
  console.log('📊 SUMÁRIO FINAL DOS TESTES SEMÂNTICOS')
  console.log('═'.repeat(60))

  const providers = ['gemini', 'groq', 'cloudflare', 'openrouter']

  for (const provider of providers) {
    const provResults = allResults.filter(r => r.provider === provider)
    if (provResults.length === 0) continue

    const corretos = provResults.filter(r => r.veredito === 'CORRETO').length
    const parciais = provResults.filter(r => r.veredito === 'PARCIAL').length
    const incorretos = provResults.filter(r => r.veredito === 'INCORRETO').length
    const errosIA = provResults.filter(r => r.veredito === 'ERRO_IA').length
    const errosGab = provResults.filter(r => r.veredito === 'ERRO_GABARITO').length
    const avgDataMatch = provResults.reduce((sum, r) => sum + r.dataMatchScore, 0) / provResults.length

    console.log(`\n🤖 ${provider.toUpperCase()}:`)
    console.log(`  ✅ Corretos:   ${corretos}/${provResults.length} (${Math.round(corretos / provResults.length * 100)}%)`)
    console.log(`  🟡 Parciais:   ${parciais}/${provResults.length}`)
    console.log(`  🔴 Incorretos: ${incorretos}/${provResults.length}`)
    console.log(`  ❌ Erros IA:   ${errosIA}/${provResults.length}`)
    if (errosGab > 0) console.log(`  ⚠️  Erros Gab:  ${errosGab}/${provResults.length}`)
    console.log(`  📈 Data Match Médio: ${avgDataMatch.toFixed(1)}%`)

    // Por dificuldade
    for (const dif of ['facil', 'medio', 'dificil']) {
      const difResults = provResults.filter(r => r.dificuldade === dif)
      if (difResults.length === 0) continue
      const difCorretos = difResults.filter(r => r.veredito === 'CORRETO').length
      const difAvg = difResults.reduce((sum, r) => sum + r.dataMatchScore, 0) / difResults.length
      console.log(`    └─ ${dif}: ${difCorretos}/${difResults.length} corretos (avg match: ${difAvg.toFixed(1)}%)`)
    }
  }

  // ── Salvar CSV ──
  const now = new Date()
  const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-')

  const outputDir = path.resolve(__dirname, '../data/test-results-csvs')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.resolve(outputDir, `semantic_test_results_${timestamp}.csv`)
  fs.writeFileSync(outputPath, csvContent, 'utf8')
  console.log(`\n🎉 Testes concluídos! Resultados salvos em: ${outputPath}`)

  // ── Salvar JSON com resultados detalhados ──
  const jsonOutputPath = path.resolve(outputDir, `semantic_test_results_${timestamp}.json`)
  fs.writeFileSync(jsonOutputPath, JSON.stringify({
    metadata: {
      timestamp: now.toISOString(),
      totalPerguntas: perguntasToProcess.length,
      totalResultados: allResults.length
    },
    summary: providers.map(provider => {
      const provResults = allResults.filter(r => r.provider === provider)
      if (provResults.length === 0) return null
      return {
        provider,
        total: provResults.length,
        corretos: provResults.filter(r => r.veredito === 'CORRETO').length,
        parciais: provResults.filter(r => r.veredito === 'PARCIAL').length,
        incorretos: provResults.filter(r => r.veredito === 'INCORRETO').length,
        errosIA: provResults.filter(r => r.veredito === 'ERRO_IA').length,
        avgDataMatchScore: Math.round(provResults.reduce((s, r) => s + r.dataMatchScore, 0) / provResults.length * 10) / 10,
        byDificuldade: ['facil', 'medio', 'dificil'].map(dif => {
          const d = provResults.filter(r => r.dificuldade === dif)
          return d.length === 0 ? null : {
            dificuldade: dif,
            total: d.length,
            corretos: d.filter(r => r.veredito === 'CORRETO').length,
            avgDataMatchScore: Math.round(d.reduce((s, r) => s + r.dataMatchScore, 0) / d.length * 10) / 10
          }
        }).filter(Boolean)
      }
    }).filter(Boolean),
    results: allResults
  }, null, 2), 'utf8')

  console.log(`📄 JSON detalhado salvo em: ${jsonOutputPath}`)
}

runSemanticTests().catch(console.error)
