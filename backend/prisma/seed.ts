import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando o seeding de dados...')

  const hashedPassword = await bcrypt.hash('admin123', 10)

  // 1. Criar um usuário administrador padrão
  const adminUser = await prisma.usuario.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      nome: 'Admin',
      email: 'admin@example.com',
      senha: hashedPassword,
      role: 'ADMIN',
      preferences: {},
      isActive: true,
    },
  })
  console.log(`Usuário admin criado com ID: ${adminUser.id}`)

  // 2. Criar modelos LLM (se ainda não existirem)
  const defaultModel = await prisma.lLMModel.upsert({
    where: { id: 'llama-3.3-70b-versatile' },
    update: {},
    create: {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3 70B',
      description: 'Modelo padrão para consultas SQL',
      provider: 'groq',
      maxTokens: 8192,
      isDefault: true,
    },
  })
  console.log(`Modelo LLM padrão criado com ID: ${defaultModel.id}`)

  // Modelo SQLCoder via Replicate (atualizado)
  const sqlCoderModel = await prisma.lLMModel.upsert({
    where: { id: 'nateraw/defog-sqlcoder-7b-2' },
    update: {},
    create: {
      id: 'nateraw/defog-sqlcoder-7b-2',
      name: 'SQLCoder 7B',
      description: 'Modelo especializado em geração de SQL via Replicate',
      provider: 'replicate',
      maxTokens: 4096,
      isDefault: false,
    },
  })
  console.log(`Modelo SQLCoder criado com ID: ${sqlCoderModel.id}`)

  // Modelo CodeLlama via Replicate (atualizado para 70B)
  const codeLlamaModel = await prisma.lLMModel.upsert({
    where: { id: 'meta/codellama-70b-instruct' },
    update: {},
    create: {
      id: 'meta/codellama-70b-instruct',
      name: 'CodeLlama 70B Instruct',
      description: 'Modelo de código da Meta via Replicate (70B parâmetros)',
      provider: 'replicate',
      maxTokens: 4096,
      isDefault: false,
    },
  })
  console.log(`Modelo CodeLlama criado com ID: ${codeLlamaModel.id}`)

  // 3. Criar uma sessão de chat para o usuário admin
  const newSession = await prisma.sessao.create({
    data: {
      titulo: 'Sessão de Exemplo Admin',
      usuarioId: adminUser.id,
      modeloId: defaultModel.id,
      isFavorita: true,
      tags: ['exemplo', 'admin'],
    },
  })
  console.log(`Sessão de exemplo criada com ID: ${newSession.id}`)

  // 4. Adicionar algumas mensagens a essa sessão
  const userMessage = await prisma.mensagem.create({
    data: {
      tipo: 'user',
      conteudo: 'Me mostre a quantidade de usuários por país.',
      sessaoId: newSession.id,
    },
  })

  const assistantMessage = await prisma.mensagem.create({
    data: {
      tipo: 'assistant',
      conteudo: 'Claro, aqui está a consulta SQL:',
      sqlQuery: 'SELECT country, COUNT(*) FROM users GROUP BY country;',
      sessaoId: newSession.id,
    },
  })
  console.log('Mensagens de exemplo adicionadas à sessão.')

  // 5. Adicionar uma avaliação de exemplo
  const newEvaluation = await prisma.evaluation.create({
    data: {
      sessionId: newSession.id,
      messageId: assistantMessage.id,
      evaluatorId: adminUser.id,
      evaluatorName: adminUser.nome,
      originalQuery: userMessage.conteudo,
      generatedSQL: assistantMessage.sqlQuery as string,
      queryResult: {}, // Substitua com um resultado JSON real se tiver
      overallScore: 4.5,
      overallComment: 'A consulta SQL gerada foi precisa.',
      isCorrect: true,
      needsReview: false,
      isApproved: true,
      criteriaEvaluations: {
        create: [
          { criteriaId: 'sql_accuracy', value: 5 },
          { criteriaId: 'relevance', value: 4 },
        ],
      },
    },
  })
  console.log(`Avaliação de exemplo criada com ID: ${newEvaluation.id}`)

  // 6. Adicionar um histórico de consulta
  await prisma.historico.create({
    data: {
      usuarioId: adminUser.id,
      sessaoId: newSession.id,
      consulta: userMessage.conteudo,
      sqlGerado: assistantMessage.sqlQuery as string,
      resultado: {},
      modeloUsado: defaultModel.name,
      isFavorito: false,
      tags: ['SQL', 'contagem'],
    },
  })
  console.log('Histórico de consulta adicionado.')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
