# Configuração da Integração com Replicate

Este documento explica como configurar a integração com o Replicate para usar modelos especializados em SQL.

## Modelos Disponíveis

### 1. SQLCoder 7B (defog/sqlcoder-7b-2)
- **Especialidade**: Geração de consultas SQL
- **Descrição**: Modelo especializado em converter linguagem natural para SQL
- **Provider**: Replicate
- **Max Tokens**: 4096

### 2. CodeLlama 13B Instruct (meta/codellama-13b-instruct)
- **Especialidade**: Geração de código e SQL
- **Descrição**: Modelo de código da Meta otimizado para instruções
- **Provider**: Replicate
- **Max Tokens**: 4096

## Configuração

### 1. Obter API Token do Replicate

1. Acesse [replicate.com](https://replicate.com)
2. Crie uma conta ou faça login
3. Vá para [Account Settings](https://replicate.com/account/api-tokens)
4. Gere um novo API token

### 2. Configurar Variáveis de Ambiente

Adicione a seguinte variável ao seu arquivo `.env`:

```bash
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

### 3. Instalar Dependências

A dependência `replicate` já foi instalada automaticamente. Se precisar reinstalar:

```bash
cd backend
npm install replicate
```

### 4. Executar Seed do Banco

Para adicionar os novos modelos ao banco de dados:

```bash
cd backend
npm run prisma:seed
```

## Como Usar

### No Frontend

1. Os novos modelos aparecerão automaticamente no seletor de modelos
2. Eles terão o ícone de código (Code) e cor índigo
3. Selecione um dos modelos Replicate para usar

### Modelos Recomendados por Caso de Uso

- **SQLCoder 7B**: Melhor para consultas SQL simples e diretas
- **CodeLlama 13B**: Melhor para consultas SQL complexas e explicações detalhadas
- **Llama 3 70B (Groq)**: Melhor para conversas e explicações gerais

## Custos

- O Replicate cobra por uso (pay-per-use)
- Consulte a [página de preços](https://replicate.com/pricing) para valores atualizados
- SQLCoder e CodeLlama têm custos diferentes por token

## Troubleshooting

### Erro: "REPLICATE_API_TOKEN é obrigatória"
- Verifique se a variável está definida no arquivo `.env`
- Reinicie o servidor backend após adicionar a variável

### Erro: "Modelo Replicate não suportado"
- Verifique se o modelo está na lista de modelos suportados
- Confirme se o ID do modelo está correto

### Timeout ou Erro de Rede
- Modelos Replicate podem demorar mais para responder
- Verifique sua conexão com a internet
- Confirme se o token está válido

## Migração do ngrok

Esta implementação substitui completamente o uso do ngrok URL que estava sendo usado anteriormente. Os benefícios incluem:

- ✅ Não depende de URLs temporárias
- ✅ Melhor confiabilidade
- ✅ Múltiplos modelos especializados
- ✅ Integração nativa com a plataforma Replicate
- ✅ Melhor controle de custos e uso
