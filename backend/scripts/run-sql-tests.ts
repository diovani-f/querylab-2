import { SQLGenerationService } from '../src/services/sql-generation-service'
import * as fs from 'fs'
import * as path from 'path'

// Configura o dotenv para carregar as variáveis de ambiente (DB, chaves da API, etc)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const questions = [
    "Liste o nome dos cursos e a respectiva sigla de suas instituições que possuem o conceito CPC máximo (5) segundo a avaliação mais recente da tabela dados_cpc.",
    "Quais são as descrições das categorias administrativas e a quantidade total de alunos matriculados em cursos de ensino a distância (EAD) em 2022, ordenado da maior para a menor quantidade?",
    "Qual é o total de vagas e o total de alunos ingressantes para os cursos que contenham a palavra 'Medicina' no nome em 2022, agrupados pela sigla da IES?",
    "Liste aleatoriamente os nomes de 10 cursos e o nome das instituições que estão localizadas ativamente na cidade de 'São Paulo'.",
    "Quantas instituições pertencentes à categoria administrativa 'Pública Federal' ou 'Pública Estadual' existem em cada UF no censo? Ordene pelas UFs com mais instituições.",
    "Qual é a média do conceito Enade Contínuo no ano de 2021 avaliado por grau acadêmico (ex: Bacharelado, Licenciatura)?",
    "Qual é o curso e a instituição de ensino que obteve o maior número possível de inscritos totais em processos seletivos no ano de 2022, mas que tenha um conceito CPC na faixa de 1 a 2? Exiba o nome do curso e da faculdade.",
    "Entre todas as UFs que formaram (concluintes) mais de 10.000 alunos no ano de 2022, quais são as 3 UFs que registram o maior percentual de mulheres concluintes em relação ao total?",
    "Quais são os 5 estados brasileiros com a maior quantidade de cursos de 'Sistemas de Informação' (considerando o nome do curso) oferecidos por instituições de ensino superior públicas",
    "Considerando estritamente os cursos de grau 'Bacharelado' em 'Sistemas de Informação', qual é a média de notas contínuas no ENADE por região do país? Ordene da maior para a menor",
    "Dentre todas as instituições de ensino localizadas no rio grande do sul, qual instituição possui a maior taxa de concorrência (total de inscritos dividido pelo total de vagas) para o curso de 'Sistemas de Informação'?",
    "Quais são os 10 cursos de 'Sistemas de Informação' mais bem avaliados de acordo com a nota contínua do CPC? Exiba o nome da instituição, a sigla do estado e a nota CPC",
    "Considerando a instituição cuja sigla é 'UFSM', qual é a média da taxa de conclusão acumulada para os cursos de 'Sistemas de Informação' e 'Ciência da Computação'? Apresente o nome de cada curso junto com a sua respectiva taxa média.",
    "Comparando os cursos de 'Sistemas de Informação' em todo o Brasil, qual categoria administrativa (Pública, Privada, etc.) possui a maior proporção de mulheres ingressantes? Calcule essa proporção dividindo o total de ingressantes do sexo feminino pelo total geral de ingressantes. Mostre no resultado apenas a descrição da categoria administrativa e a proporção calculada, ordenando para mostrar a maior proporção primeiro.",
]

// Evitar problemas com `"` no CSV
function escapeCSV(text: string | undefined | null): string {
    if (!text) return ''
    return `"${text.replace(/"/g, '""')}"`
}

async function runTests() {
    console.log('🚀 Iniciando script de testes de Geração SQL...')
    console.log(`📋 Total de perguntas: ${questions.length}`)

    const sqlService = SQLGenerationService.getInstance()

    // Cabeçalho do CSV
    let csvContent = `Pergunta;Provider;Prompt Enviado;SQL Gerado;Status Execucao;Erro\n`

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        console.log(`\n-----------------------------------`)
        console.log(`⏳ Testando pergunta ${i + 1}/${questions.length}: "${question}"`)

        try {
            // Chama o serviço diretamente para gerar o SQL paralelamente e testá-lo
            const result = await sqlService.generateSQLParallel({
                question,
                model: 'parallel',
                sessionId: 'test-session-id', // ID dummy para o teste
                conversationHistory: [] // Sem histórico para simplificar o teste isolado
            })

            if (result.results && result.results.length > 0) {
                for (const aiResult of result.results) {
                    const provider = aiResult.provider
                    const prompt = aiResult.prompt || 'Prompt não retornado'
                    const sql = aiResult.sql || ''
                    const error = aiResult.error || aiResult.executionError || (aiResult.executionSuccess === false ? 'Falha na execução do SQL' : '')
                    const execStatus = aiResult.executionSuccess ? 'SUCESSO' : 'ERRO'

                    // Adiciona linha no CSV
                    csvContent += `${escapeCSV(question)};${escapeCSV(provider)};${escapeCSV(prompt)};${escapeCSV(sql)};${escapeCSV(execStatus)};${escapeCSV(error)}\n`

                    console.log(`✅ ${provider}: ${execStatus} ${error ? `(Erro: ${error})` : ''}`)
                }
            } else {
                console.log('⚠️ Nenhum resultado retornado pelas IAs.')
                csvContent += `${escapeCSV(question)};ALL;N/A;N/A;ERRO;Nenhum resultado retornado\n`
            }

        } catch (error: any) {
            console.error(`❌ Erro ao testar pergunta: ${error.message}`)
            csvContent += `${escapeCSV(question)};ALL;N/A;N/A;ERRO;${escapeCSV(error.message)}\n`
        }

        // Espera antes da próxima pergunta para não sobrecarregar
        if (i < questions.length - 1) {
            console.log('⏳ Aguardando 50 segundos para não sobrecarregar as APIs...')
            await delay(50000)
        }
    }

    // Salva o CSV
    const now = new Date();
    // Formato: YYYY-MM-DD_HH-mm-ss (Ex: 2026-03-25_17-41-21)
    const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');

    const outputPath = path.resolve(__dirname, `../data/test-results-csvs/test_results_${timestamp}.csv`);
    fs.writeFileSync(outputPath, csvContent, 'utf8')
    console.log(`\n🎉 Testes concluídos! Resultados salvos em: ${outputPath}`)
}

runTests().catch(console.error)
