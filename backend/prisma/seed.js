"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Iniciando o seeding de dados...');
        const hashedPassword = yield bcryptjs_1.default.hash('admin123', 10);
        // 1. Criar um usuário administrador padrão
        const adminUser = yield prisma.usuario.upsert({
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
        });
        console.log(`Usuário admin criado com ID: ${adminUser.id}`);
        // 2. Criar um modelo LLM padrão (se ainda não existir)
        const defaultModel = yield prisma.lLMModel.upsert({
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
        });
        console.log(`Modelo LLM padrão criado com ID: ${defaultModel.id}`);
        // 3. Criar uma sessão de chat para o usuário admin
        const newSession = yield prisma.sessao.create({
            data: {
                titulo: 'Sessão de Exemplo Admin',
                usuarioId: adminUser.id,
                modeloId: defaultModel.id,
                isFavorita: true,
                tags: ['exemplo', 'admin'],
            },
        });
        console.log(`Sessão de exemplo criada com ID: ${newSession.id}`);
        // 4. Adicionar algumas mensagens a essa sessão
        const userMessage = yield prisma.mensagem.create({
            data: {
                tipo: 'user',
                conteudo: 'Me mostre a quantidade de usuários por país.',
                sessaoId: newSession.id,
            },
        });
        const assistantMessage = yield prisma.mensagem.create({
            data: {
                tipo: 'assistant',
                conteudo: 'Claro, aqui está a consulta SQL:',
                sqlQuery: 'SELECT country, COUNT(*) FROM users GROUP BY country;',
                sessaoId: newSession.id,
            },
        });
        console.log('Mensagens de exemplo adicionadas à sessão.');
        // 5. Adicionar uma avaliação de exemplo
        const newEvaluation = yield prisma.evaluation.create({
            data: {
                sessionId: newSession.id,
                messageId: assistantMessage.id,
                evaluatorId: adminUser.id,
                evaluatorName: adminUser.nome,
                originalQuery: userMessage.conteudo,
                generatedSQL: assistantMessage.sqlQuery,
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
        });
        console.log(`Avaliação de exemplo criada com ID: ${newEvaluation.id}`);
        // 6. Adicionar um histórico de consulta
        yield prisma.historico.create({
            data: {
                usuarioId: adminUser.id,
                sessaoId: newSession.id,
                consulta: userMessage.conteudo,
                sqlGerado: assistantMessage.sqlQuery,
                resultado: {},
                modeloUsado: defaultModel.name,
                isFavorito: false,
                tags: ['SQL', 'contagem'],
            },
        });
        console.log('Histórico de consulta adicionado.');
    });
}
main()
    .catch((e) => {
    console.error('❌ Erro no seeding:', e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
