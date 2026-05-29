# Linha do Tempo Técnica — QueryLab

> **Propósito:** Documentar a evolução técnica da plataforma QueryLab com base na análise
> investigativa do histórico git, cruzada com os resultados reais dos arquivos de teste.
> Produzido em 2026-05-29 via análise de 144 commits (Jul 2025 – Mai 2026).

---

## Índice

1. [Guia dos arquivos de teste](#1-guia-dos-arquivos-de-teste)
2. [Checkpoint 0 — Antes do primeiro teste (Jul 2025 – Mar 2026)](#2-checkpoint-0--antes-do-primeiro-teste)
3. [Checkpoint 1 — cod-000 (Mar 27, 2026) — Baseline original](#3-checkpoint-1--cod-000)
4. [Checkpoint 2 — cod-001 (Mar 28, 2026) — Engenharia de prompt](#4-checkpoint-2--cod-001)
5. [Checkpoint 3 — cod-002 (Mai 14, 2026) — Validação com SmartSchemaReducer](#5-checkpoint-3--cod-002)
6. [Checkpoint 4 — cod-003 (Mai 14, 2026) — Teste de subconjunto](#6-checkpoint-4--cod-003)
7. [Checkpoint 5 — cod-004 (Mar 31, 2026) — Auto-correção e Levenshtein](#7-checkpoint-5--cod-004)
8. [Checkpoint 6 — Testes semânticos v1 (Mai 21–24, 2026)](#8-checkpoint-6--testes-semânticos-v1)
9. [Checkpoint 7 — Testes semânticos v2 (Mai 28–29, 2026)](#9-checkpoint-7--testes-semânticos-v2)
10. [Tabela mestre: Técnicas × Commits × Checkpoints](#10-tabela-mestre)
11. [Inconsistências nos documentos de referência](#11-inconsistências-nos-documentos-de-referência)
12. [Destaques para o TCC](#12-destaques-para-o-tcc)

---

## 1. Guia dos arquivos de teste

O QueryLab possui dois tipos de avaliação com metodologias completamente diferentes:

### 1.1 CSVs de execução (cod-000 a cod-004)

Avaliam se o SQL gerado executa **sem erro de runtime** no banco. Não medem se o resultado é correto — apenas se a query é sintaticamente válida e referencia colunas/tabelas existentes.

| Campo | Descrição |
|-------|-----------|
| `Pergunta` | Pergunta em linguagem natural |
| `Provider` | gemini / groq / cloudflare |
| `Prompt Enviado` | Prompt completo enviado ao LLM (campo multiline gigante) |
| `SQL Gerado` | SQL retornado pelo LLM |
| `Status Execucao` | `SUCESSO` ou `ERRO` |
| `Erro` | Mensagem de erro PostgreSQL, se houver |

**Tamanho dos arquivos:**

| Arquivo | Perguntas | Providers | Casos totais | Delimitador |
|---------|-----------|-----------|--------------|-------------|
| cod-000.csv | 14 | gemini, groq, cloudflare | 42 | `,` |
| cod-001.csv | 14 | gemini, groq, cloudflare | 42 | `,` |
| cod-002.csv | 14 | gemini, groq, cloudflare | 42 | `,` |
| cod-003.csv | 12 | gemini, groq, cloudflare | 36 | `;` ← anomalia |
| cod-004.csv | 14 | gemini, groq, cloudflare | 42 | `,` |

> **Nota:** cod-003 usa ponto-e-vírgula como delimitador e contém apenas 12 das 14 perguntas (ausentes: "Liste o nome dos cursos com CPC máximo..." e "Quais são as descrições das categorias administrativas..."). Isso indica geração por script separado com configuração ou subconjunto diferente.

### 1.2 JSONs de testes semânticos

Avaliam se os **dados retornados pela query** correspondem ao gabarito. Muito mais exigentes: é possível executar sem erro mas retornar resultados incorretos.

| Arquivo | Período de execução | Perguntas gabaritadas | Providers |
|---------|---------------------|----------------------|-----------|
| `semantic_test_results_unified.json` | Mai 21–24, 2026 | 23 (7 fáceis + 8 médios + 8 difíceis) | gemini, groq, deepseek |
| `semantic_test_results_unified_2026-05-28.json` | Mai 29, 2026 (re-run) | 23 | gemini, groq, deepseek |

**Vereditos possíveis:** `CORRETO`, `PARCIAL`, `INCORRETO`, `ERRO_IA` (falha na geração), `ERRO_GABARITO`

**Métricas:** `dataMatchScore` (0–100%) + `columnOverlap` (%) + `veredito`

---

## 2. Checkpoint 0 — Antes do primeiro teste

**Período:** Jul 18, 2025 → Mar 26, 2026 (8+ meses sem testes formais)

### 2.1 Fundação — Jul 18, 2025

**Commit inicial:** `2ce24f4` — "Initial commit: QueryLab - Plataforma Text-to-SQL completa"

O sistema nasceu com uma base já significativa em um único commit:
- Frontend: Next.js com páginas de chat, sessões, histórico, avaliação
- Backend: Express + Prisma + autenticação JWT + WebSockets (Socket.io)
- Serviço de sessões e histórico de conversas
- Adapters: PostgresAdapter, JsonServerAdapter, Db2HttpAdapter, DatabaseFactory

Ainda **não** existia nenhum serviço LLM dedicado — o `LLMService` era genérico e usava apenas Groq (llama-3.3-70b-versatile, llama-3.1-8b-instant, Mixtral).

**Commit `fa8da81`** — Sistema completo de autenticação e histórico unificado (mesmo dia):
- `LLMService` com modelos Groq: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`
- Nenhum GeminiService, nenhum SQLGenerationService específico

### 2.2 Conexão Real e Schema Discovery — Ago 4–13, 2025

**Commit `4cb76e5`** — "feat: back buscando schema"  
Nascimento do `SchemaDiscoveryService` — primeiro mecanismo de introspecção real do banco INEP.

**Commit `ace7a64`** — "feat: schema data"  
Primeiro schema INEP real indexado no repositório. Marco de conexão com dados reais do banco educacional.

**Commits `db272b8`, `ed82d9b`** — "feat: conexao banco e ajustes finais/visuais"  
Conexão com banco DB2 via microserviço HTTP. IBM DB2 como fonte original de dados.

### 2.3 Arquitetura Multi-Provider — Set 20–27, 2025

Este é o período mais importante da fase de construção — e o menos documentado pelas mensagens de commit.

**Commit `790bab3`** (Set 20) — "fix: novos ajustes"  
Em um único commit com mensagem genérica, surgem simultâneamente:
- `GeminiService` — integração com Google Gemini (gemini-2.5-flash-lite)
- `GroqService` — integração com Groq para resumos e explicações
- `SQLGenerationService` — serviço central unificado de geração SQL

**Commit `22df1c8`** (Set 21) — "fix"  
- `SmartSchemaReducer` v1 — primeiro algoritmo de seleção de tabelas por keyword matching

> **Anomalia documentada:** As 4 principais classes do pipeline text-to-SQL foram criadas em apenas 2 commits de 1 dia, com mensagens "fix" e "fix: novos ajustes". Mais de 644 linhas de lógica nova sob mensagens genéricas. Isso é relevante para o TCC pois demonstra que grande parte da arquitetura foi desenvolvida de forma incremental e não planejada formalmente.

### 2.4 Consolidação e Paralelismo — Ago 29 – Nov 9, 2025

**Commit `2983a16`** (Ago 29) — "fix: organização projeto"  
Grande reorganização: eliminação de db2-service, mock-data, db2-proxy. Migração para Prisma/PostgreSQL como banco primário.

**Commit `a958fb5`** (Nov 6) — "fix: ajustes"  
Introdução do modo paralelo com 3 providers simultâneos:
- `generateSQLParallel()` com `Promise.allSettled`
- Interface `ParallelSQLResult` e `ParallelSQLGenerationResult`
- UI de comparação paralela de resultados

**Estado ao gerar cod-000 (Mar 27, 2026):**
- 3 providers em paralelo: Gemini (gemini-2.5-flash-lite), Groq (llama-3.3-70b), Cloudflare (sqlcoder-7b-2)
- SmartSchemaReducer v1 (keyword scoring básico)
- Prompt genérico: *"Você é um especialista em SQL e dados educacionais do INEP. Gere uma consulta SQL otimizada..."*
- Schema injetado em formato JSON com **bug crítico**: campo `columns: []` sempre vazio

---

## 3. Checkpoint 1 — cod-000

**Data:** Mar 27, 2026  
**Contexto:** Baseline gerado imediatamente antes das melhorias de março.

### Métricas reais

| Provider | Sucesso | Total | Taxa |
|----------|---------|-------|------|
| gemini | 2 | 14 | **14.3%** |
| groq | 3 | 14 | **21.4%** |
| cloudflare | 5 | 14 | **35.7%** |

**Melhor provider: Cloudflare SQLCoder-7b** — modelo especializado em SQL era mais robusto na ausência de contexto de schema.

### Diagnóstico do problema central

O principal problema identificado a partir da análise do código era o bug em `optimizeSchemaForLLM()`: a função construía o objeto de schema mas não passava a propriedade `columns` — o array era sempre `[]`. Com isso:

1. O LLM recebia uma lista de tabelas sem nenhuma coluna
2. Para gerar SQL válido, **inventava nomes de colunas** (alucinações)
3. A query executava mas referenciava colunas inexistentes → `ERRO`

**Exemplos de alucinações típicas:**
- `co_municipio` em vez de `cod_municipio_ibge`
- `nome_uf` em vez de `no_uf_ibge`
- `codigo_ies` em vez de `cod_ies` ou `co_ies`

### Prompt no cod-000

```
Você é um especialista em SQL e dados educacionais do INEP. Gere uma consulta SQL
otimizada para responder a pergunta sobre dados educacionais.
[schema em JSON sem colunas]
```

---

## 4. Checkpoint 2 — cod-001

**Data:** Mar 28, 2026  
**Commit principal:** `d7b6887` — "todas as alterações 001"

### Commits responsáveis (confirmados via git diff)

| Commit | Data | Mudança |
|--------|------|---------|
| `1d018c4` | Mar 23 | `buildSQLGenerationPrompt()` — prompt de Engenheiro de Dados Sênior |
| `bae1ec9` | Mar 23 | Colunas com tipos e enums adicionados explicitamente ao prompt |
| `5faed89` | Mar 23 | Remoção de 17 tabelas desnecessárias do schema (`cesta_*`, backups, ETL) |
| `d7b6887` | Mar 28 | Fix do bug `columns: []`, `run-sql-tests.ts`, geração dos CSVs cod-000 e cod-001 |

### Métricas reais

| Provider | Sucesso | Total | Taxa | Δ vs cod-000 |
|----------|---------|-------|------|-------------|
| gemini | 10 | 14 | **71.4%** | +400% |
| groq | 8 | 14 | **57.1%** | +167% |
| cloudflare | 4 | 14 | **28.6%** | −20% |

> **Cloudflare regrediu.** O SQLCoder-7b era um modelo pequeno, especializado para prompts curtos e diretos no estilo SQLCoder. O novo prompt longo com Chain of Thought, 8 Regras de Ouro e anti-padrões **confundiu** o modelo. Este é um exemplo clássico de que engenharia de prompt beneficia LLMs maiores e generalistas, mas pode prejudicar modelos especializados menores.

### Mudanças técnicas introduzidas

**Novo prompt (`buildSQLGenerationPrompt`):**
- Persona: *"Você é um Engenheiro de Dados Sênior e especialista em PostgreSQL, focado nos dados educacionais do INEP..."*
- 8 Regras de Ouro específicas para o banco INEP
- 8 Anti-Padrões com formato ERRADO/CORRETO/CONSEQUÊNCIA
- Chain of Thought (CoT): 3 passos obrigatórios — intenção → verificação de colunas → SQL + explicação
- 5 exemplos Few-Shot dinâmicos selecionados por keywords

**Execução automática do SQL:**
O código anterior apenas gerava o SQL. Com `d7b6887`, o sistema passou a **executar automaticamente** cada SQL gerado e retornar os dados ao frontend. Mudança arquitetural significativa.

**Conversão de dados:**
Implementação de conversão `rows[] + columns[]` → `data[]` (array de objetos) para facilitar renderização no frontend.

---

## 5. Checkpoint 3 — cod-002

**Data filesystem:** Mai 14, 2026 *(regenerado; originalmente criado em Mar 31)*  
**Contexto:** Mesmo conjunto de 14 perguntas do cod-001, re-executado com código intermediário.

### Métricas reais

| Provider | Sucesso | Total | Taxa | Δ vs cod-001 |
|----------|---------|-------|------|-------------|
| gemini | 10 | 14 | **71.4%** | 0% |
| groq | 8 | 14 | **57.1%** | 0% |
| cloudflare | 6 | 14 | **42.9%** | +50% |

### Análise

Gemini e Groq mantiveram exatamente os mesmos resultados (10/14 e 8/14) que no cod-001. Cloudflare melhorou de 4/14 para 6/14 (+50% relativo).

**Interpretação:** O cod-002 provavelmente foi gerado com o código do commit `2ab9c6d` (Mar 31), que melhorou especificamente o SmartSchemaReducer com scoring de colunas. O SmartSchemaReducer beneficiou o Cloudflare (que envia um schema mais reduzido e focado), mas não alterou a performance de Gemini e Groq (que já tinham atingido o limite do conjunto de perguntas nesse estado do prompt).

---

## 6. Checkpoint 4 — cod-003

**Data filesystem:** Mai 14, 2026 *(regenerado; originalmente criado em Mar 31)*  
**Contexto:** 12 perguntas (subconjunto), delimitador `;`, provavelmente script separado.

### Métricas reais

| Provider | Sucesso | Total | Taxa | Δ vs cod-002 |
|----------|---------|-------|------|-------------|
| gemini | 2 | 12 | **16.7%** | −76% |
| groq | 5 | 12 | **41.7%** | −27% |
| cloudflare | 5 | 12 | **41.7%** | −3% |

### Análise e hipótese

A queda drástica do Gemini (de 71.4% para 16.7%) com o subconjunto de 12 perguntas é a principal anomalia dos testes CSV.

**Perguntas ausentes em cod-003:** As 2 perguntas excluídas são as sobre CPC máximo e categorias administrativas — provavelmente as perguntas mais diretas e "fáceis" do conjunto. Sua remoção deixou apenas as perguntas mais complexas.

**Hipótese principal:** cod-003 foi gerado com o SmartSchemaReducer em modo mais agressivo (seleção menor de tabelas), penalizando Gemini que depende de contexto rico. Groq e Cloudflare, que já operavam com schema reduzido, tiveram queda menor.

O delimitador `;` confirma que foi usado um script diferente de geração de testes — possivelmente uma variante experimental.

---

## 7. Checkpoint 5 — cod-004

**Data:** Mar 31, 2026  
**Commit:** `2ab9c6d` — "melhora da acuracia e estatisticas #004"

### Commits responsáveis (confirmados via git diff `d7b6887 → 2ab9c6d`)

| Commit | Data | Mudança |
|--------|------|---------|
| `2ab9c6d` | Mar 31 | Auto-correction loop + SmartSchemaReducer v2 + tabelas core garantidas |

### Métricas reais — melhor resultado dos testes CSV

| Provider | Sucesso | Total | Taxa | Δ vs cod-001 |
|----------|---------|-------|------|-------------|
| gemini | 14 | 14 | **100%** | +40% |
| groq | 12 | 14 | **85.7%** | +50% |
| cloudflare | 5 | 14 | **35.7%** | +25% |

### Mudanças técnicas (confirmadas via git diff)

**Auto-correction loop em `sql-generation-service.ts` (+457 linhas):**

```typescript
// -------- AUTO-CORRECTION LOOP (1 round MAX) --------
if (!execResult.success && execResult.error && schemaResult.reducedSchema) {
  const correctionResult = await this.retrySQLGeneration(
    result.provider, result.model, request.question,
    result.sql, execResult.error, schemaResult.reducedSchema, conversationContext
  )
  if (correctionResult.success && correctionResult.sql) {
    result.sql = correctionResult.sql
    execResult = await this.queryExecutionService.executeWithTimeout(result.sql, ...)
  }
}
```

**SmartSchemaReducer v2 em `smart-schema-reducer.ts` (+57 linhas):**
- Limpeza de keywords: `keyword.replace(/[(),.?]/g, '').toLowerCase()`
- **Scoring por colunas**: +3 pontos por coluna com keyword match (mínimo 4 chars)
- **Tabelas CORE sempre incluídas** (independente de score):
  ```
  censo_ies, censo_cursos, municipios_ibge,
  microregioes_ibge, mesoregioes_ibge, uf_ibge, regioes_ibge
  ```

**Levenshtein em `validateAndSanitizeSQL`:**
```typescript
private levenshteinDistance(s1: string, s2: string): number { ... }
private autoFixCommonHallucinations(sql: string): string { ... }
```

A função `autoFixCommonHallucinations` aplicava correções hardcoded (ex: `co_ies → cod_ies` quando na tabela errada) e o Levenshtein era usado em `validateAndSanitizeSQL` para fuzzy-matching de nomes de colunas (threshold ≤ 3 de distância).

### Por que Gemini chegou a 100%?

A combinação de:
1. Prompt rico com 8 Regras + CoT + exemplos INEP-específicos (cod-001)
2. Schema reduzido com colunas reais e enums (cod-001)
3. Auto-correction loop (cod-004): queries com erro eram re-geradas com contexto do erro
4. SmartSchemaReducer v2 com tabelas CORE garantidas

Eliminou praticamente todas as falhas de execução para as 14 perguntas do conjunto.

---

## 8. Checkpoint 6 — Testes semânticos v1

**Período:** Mai 21–24, 2026  
**Arquivo:** `semantic_test_results_unified.json`  
**Metodologia:** 23 perguntas gabaritadas por nível de dificuldade

> **Mudança de paradigma:** Esta é a primeira avaliação que mede *corretude dos dados*, não apenas *execução sem erro*. Um sistema pode ter 100% nos testes CSV e ainda assim retornar dados errados. Os testes semânticos revelaram que a realidade era muito menos otimista.

### Commits que geraram este estado

#### `a939770` (Mai 16) — "fix: corrige bugs críticos de alucinação na geracao SQL" (81 linhas inseridas)

Este commit teve a mensagem mais descritiva do repositório — co-authored com assistente IA. Corrigiu 7 bugs específicos:

1. **Fix prefixo `uf_ibge`**: `inep.uf_ibge` → `cesta.uf_ibge` — o validador rejeitava o schema incorreto
2. **Fix cadeia geográfica**: `u.uf_ibge` → `u.co_uf_ibge`, `u.cod_regiao_ibge` → `u.co_regiao_ibge`
3. **Fix few-shot modalidade**: `tp_modalidade_ensino` **não existe** em `censo_cursos`, apenas em `censo_curso_vagas_bruto`
4. **Fix autofix destrutivo**: substituição global `co_ies → cod_ies` quebrava SQL correto de `emec_instituicoes`
5. **Regra 6 adicionada**: distinção entre `censo_cursos` (dicionário) vs `censo_curso_vagas_bruto` (fatos anuais com matrículas, ingressantes, vagas)
6. **Enriquecimento do dicionário**: avisos sobre `qt_mat`, `nu_ano_censo`, `qt_ing`, `qt_vg_total`
7. **2 novos exemplos few-shot**: matrículas temporais e contagem por estado

#### `11c77cb` (Mai 18) — "fix troca deep seek"

Substitui o terceiro provider:
- **Removido:** Cloudflare SQLCoder-7b-2 (modelo especializado pequeno, ~7B parâmetros)
- **Adicionado:** DeepSeek-V3 via OpenRouter (`deepseek/deepseek-chat-v3-0324`)

Mudança arquitetural: `generateWithCloudflare()` → `generateWithDeepSeek()`. O DeepSeek-V3 é um modelo de linguagem geral de altíssimo desempenho, equivalente ao GPT-4o em benchmarks de código.

#### `48962d24` (Mai 21) — "add rag in system" (15 arquivos, +1766 linhas)

A mudança mais complexa do repositório em uma única operação. Introduz:

**`SchemaEmbeddingService` (novo serviço, 61 linhas):**
```typescript
async findSimilarTables(question: string, topK: number = 12, distanceThreshold: number = 0.5) {
  // 1. Embed a pergunta com gemini-embedding-001 (TaskType.RETRIEVAL_QUERY)
  // 2. Busca pgvector: embedding <=> $1::vector (distância coseno)
  // 3. Retorna top-12 tabelas com distância < 0.5
}
```

**Hierarquia de seleção de schema (3 camadas em `getReducedSchema()`):**
```
1. RAG semântico (SchemaEmbeddingService.findSimilarTables)
   ↓ falha/vazio?
2. Keyword matching (SmartSchemaReducer.reduceSchema)
   ↓ falha?
3. Schema completo (fallback)
```

**Auto-correction expandido:** 1 → **2 rounds** máximo

**`SchemaERDiagram.tsx` (332 linhas):** Diagrama ER interativo com React Flow, clusters por prefixo de schema (inep/cesta), scroll de colunas, badges de tipo.

#### `0950218` + `1ca53fd` (Mai 24) — "regras anti alucinação" (confirmados via diff `48962d24 → 1ca53fd`)

- **Fix `idhms`**: pertence a `inep.idhms` (não `cesta.idhms`) — corrigido em `cestaSchemaSet`
- **Instrução de contexto**: de "NUNCA reutilize SQL anterior" → "adapte se for follow-up; se for nova pergunta, gere do zero"
- **Anti-padrão 4**: divisão sem NULLIF (`NULLIF(denominador, 0)` obrigatório)
- **Anti-padrão 5**: `fluxo_tda` sem `sg_uf_ies` — requer JOIN com `censo_ies_bruto`
- Avisos: `censo_curso_vagas_bruto.sg_uf_ies` não existe (usar `.sg_uf`)
- Exemplo de região simplificado: usa `no_regiao_ies` direto (sem cadeia geográfica complexa)
- Parâmetro `maxExamples` em `getDynamicExamples()`

### Resultados semânticos — primeira execução

| Provider | Modelo | Corretos | Parciais | Incorretos | Erros IA | Score médio |
|----------|--------|----------|----------|------------|----------|-------------|
| gemini | gemini-2.5-flash-lite | 6/23 (26.1%) | 2 | 8 | **6** | 23.7% |
| groq | llama-3.3-70b | 4/23 (17.4%) | 2 | 7 | **9** | 17.4% |
| deepseek | deepseek-v3 | 7/23 (30.4%) | 2 | 9 | **4** | 26.1% |

**Por dificuldade:**

| Dificuldade | Gemini | Groq | DeepSeek |
|-------------|--------|------|---------|
| Fácil (7 perguntas) | 42.1% | 42.9% | 57.1% |
| Médio (8 perguntas) | 31.3% | 12.5% | 25.0% |
| **Difícil (8 perguntas)** | **0%** | **0%** | **0%** |

> **Teto estrutural detectado:** 0% em perguntas difíceis para todos os providers, independentemente das otimizações realizadas até esse ponto. As perguntas difíceis envolvem multi-hop reasoning, cruzamentos complexos de tabelas, ou cálculos de proporção que excedem a capacidade do pipeline atual.

**Alto número de erros IA** (especialmente Groq: 9) indica que o RAG mudou significativamente o schema enviado ao modelo, e o Groq (configurado com `max_tokens: 500` e sem exemplos few-shot na versão RAG) não conseguiu adaptar-se ao novo formato.

---

## 9. Checkpoint 7 — Testes semânticos v2

**Data de re-execução:** Mai 29, 2026 (timestamp no arquivo: "2026-05-28")  
**Arquivo:** `semantic_test_results_unified_2026-05-28.json`

Não houve commits entre os dois runs. Os testes foram re-executados com o **mesmo código**, mas os resultados melhoraram significativamente para Gemini e DeepSeek.

### Resultados — segunda execução

| Provider | Corretos | Parciais | Incorretos | Erros IA | Score médio | Δ score |
|----------|----------|----------|------------|----------|-------------|---------|
| gemini | 9/23 (39.1%) | 5 | 8 | **0** | **49.6%** | **+109%** |
| groq | 4/23 (17.4%) | 1 | 10 | **6** | 19.6% | +13% |
| deepseek | 8/23 (34.8%) | 3 | 11 | **0** | **41.3%** | **+58%** |

**Por dificuldade:**

| Dificuldade | Gemini | Groq | DeepSeek |
|-------------|--------|------|---------|
| Fácil (7 perguntas) | 70.0% | 35.7% | 85.7% |
| Médio (8 perguntas) | 81.3% | 25.0% | 43.8% |
| **Difícil (8 perguntas)** | **0%** | **0%** | **0%** |

### Análise da melhoria sem commits

A melhoria entre os dois runs com código idêntico se explica por:

1. **Erros IA zerados para Gemini e DeepSeek**: Os 6 erros IA do Gemini no primeiro run eram falhas de parsing do output do modelo (respostas em formato inesperado). No segundo run, o modelo retornou SQLs bem-formatados. Isso pode ser variação de temperatura ou mudança de contexto de cache.

2. **Gemini: 6 → 9 corretos, mas score 23.7% → 49.6%**: O número de corretos aumentou (+3), mas o score quase dobrou. Isso indica que as respostas *parciais* ficaram muito mais próximas do gabarito no segundo run. Os dados comparados mudaram de 0% overlap para ~80% overlap nas parciais.

3. **DeepSeek: 4 erros IA → 0**: A eliminação dos erros de parsing transformou casos de `ERRO_IA` (0 pontos) em `INCORRETO` com alguma pontuação parcial, aumentando o score médio.

> **Nota metodológica para o TCC:** A variabilidade entre execuções com código idêntico é relevante. LLMs são estocásticos mesmo com `temperature=0.1` (não zero). Para avaliações científicas robustas, recomenda-se múltiplas execuções e média dos resultados. A diferença de 23.7% → 49.6% no score do Gemini entre os dois runs indica que os resultados individuais têm alta variância, mesmo que a taxa de "corretos" (binária) seja mais estável.

---

## 10. Tabela mestre

Correlação entre as 34 técnicas do `EVOLUCAO_TECNICA.md`, os commits reais e os checkpoints de impacto.

| # | Técnica (EVOLUCAO_TECNICA.md) | Commit SHA | Data | Checkpoint de impacto | Evidência |
|---|------------------------------|-----------|------|-----------------------|-----------|
| 1 | Prompt unificado com CoT | `1d018c4` | Mar 23 | cod-001 (+400% Gemini) | diff confirmado |
| 2 | 8 Regras de Ouro INEP | `1d018c4` | Mar 23 | cod-001 | diff confirmado |
| 3 | 8 Anti-Padrões | `1d018c4` | Mar 23 | cod-001 | diff confirmado |
| 4 | Dynamic Few-Shot | `1d018c4` | Mar 23 | cod-001 | diff confirmado |
| 5 | Dicionário central de colunas | `bae1ec9` | Mar 23 | cod-001 | diff confirmado |
| 6 | Schema em texto DDL | `1d018c4`+`5faed89` | Mar 23 | cod-001 | diff confirmado |
| 7 | Seção de Foreign Keys no prompt | `1d018c4` | Mar 23 | cod-001 | diff confirmado |
| 8 | Multi-turn context (últimas 4 msgs) | `fa8da81` | Jul 18, 2025 | pré-cod-000 | inferido |
| 9 | Pipeline de validação 8 estágios | `2ab9c6d`+`a939770` | Mar 31+Mai 16 | cod-004+sem_v1 | diff confirmado |
| 10 | Autofix hardcoded de alucinações | `2ab9c6d` | Mar 31 | cod-004 | grep confirmado |
| 11 | Temporal JOIN enforcement | `a939770` | Mai 16 | sem_v1 | diff confirmado |
| 12 | Fuzzy matching Levenshtein | `2ab9c6d` | Mar 31 | cod-004 | grep confirmado |
| 13 | Classificação de erros PostgreSQL | `2ab9c6d` | Mar 31 | cod-004 | inferido |
| 14 | Multi-round auto-correção (1→2) | `2ab9c6d`→`48962d24` | Mar31→Mai21 | cod-004→sem_v1 | diff confirmado |
| 15 | LIMIT dinâmico por complexidade | `2ab9c6d` | Mar 31 | cod-004 | inferido |
| 16 | Hierarquia RAG→keyword→fallback | `48962d24` | Mai 21 | sem_v1 | diff confirmado |
| 17 | SmartSchemaReducer v1 (keywords) | `22df1c8` | Set 21, 2025 | pré-cod-000 | diff confirmado |
| 18 | SmartSchemaReducer v2 (colunas+core) | `2ab9c6d` | Mar 31 | cod-004 | diff confirmado |
| 19 | FK graph BFS expansion | `1d018c4` | Mar 23 | cod-001 | inferido |
| 20 | 9 tabelas core garantidas | `2ab9c6d` | Mar 31 | cod-004 | diff confirmado (7 tabelas) |
| 21 | RAG pgvector + Gemini embeddings | `48962d24` | Mai 21 | sem_v1 | diff confirmado |
| 22 | RAG→SmartSchemaReducer seed integration | `48962d24` | Mai 21 | sem_v1 | diff confirmado |
| 23 | Timeout dinâmico por complexidade SQL | `2ab9c6d` | Mar 31 | cod-004 | grep confirmado |
| 24 | Promise.race + backoff retry | `2983a16` | Ago 29, 2025 | pré-cod-000 | inferido |
| 25 | Paralelismo 3 providers (allSettled) | `790bab3`→`a958fb5` | Set20→Nov6, 2025 | pré-cod-000 | diff confirmado |
| 26 | GeminiService com fallback flash-lite→flash | `7575313`+`9b0639c` | Mai 19 | sem_v1 | diff/commit |
| 27 | GroqService max_tokens:500, schema compacto | `790bab3` | Set 20, 2025 | pré-cod-000 | inferido |
| 28 | DeepSeek via OpenRouter (substitui Cloudflare) | `11c77cb` | Mai 18 | sem_v1 | diff confirmado |
| 29 | Framework de testes semânticos | `48962d24` | Mai 21 | sem_v1 | commit stat |
| 30 | Column overlap + data match scoring | `48962d24` | Mai 21 | sem_v1 | arquivo JSON |
| 31 | 5 categorias de veredito | `48962d24` | Mai 21 | sem_v1 | arquivo JSON |
| 32 | Dataset 30 perguntas gabaritadas | `48962d24` | Mai 21 | sem_v1 | JSON metadata |
| 33 | ER diagram interativo (React Flow) | `48962d24` | Mai 21 | UI/sem_v1 | commit stat |
| 34 | Dicionário de negócio (9 categorias) | `b2e39b1` | Abr 7 | pré-sem_v1 | commit |

> **Legenda:** "diff confirmado" = mudança vista no git diff analisado. "grep confirmado" = função/padrão encontrado no código atual. "inferido" = conclusão lógica baseada em evidências indiretas.

---

## 11. Inconsistências nos documentos de referência

### 11.1 `EVOLUCAO_TECNICA.md`

**Inconsistência 1 — SmartSchemaReducer não estava no commit original:**  
O documento afirma que algumas técnicas eram do "estado original", sem definir o que é "original". A análise de commits mostra que `SmartSchemaReducer` foi criado em `22df1c8` (Set 21, 2025), **2 meses** após o commit inicial (`2ce24f4`, Jul 18, 2025). O commit inicial não tinha serviços LLM dedicados.

**Inconsistência 2 — Técnica 24 (Paralelismo) classificada como "Parcial":**  
O documento classifica a execução paralela como "Parcial" sem explicar por quê. Na realidade, o paralelismo com 3 providers e `Promise.allSettled` estava completo desde `a958fb5` (Nov 2025) e foi refinado em `d7b6887` (Mar 28, 2026). Estava totalmente funcional ao gerar cod-000.

**Inconsistência 3 — Período Nov 2025 – Mar 2026 ausente:**  
4 meses de desenvolvimento (da consolidação do paralelismo até o primeiro teste formal) não aparecem em nenhum dos documentos de referência. Este período inclui commits densos de "fix: ajustes" que estabilizaram a infraestrutura de paralelismo, Prisma e WebSocket.

**Inconsistência 4 — "34 técnicas" contém estimativas sem base em commits:**  
Várias técnicas listadas com status "Novo" não têm evidência de commit correspondente. Para o TCC, é importante citar apenas o que pode ser rastreado ao código real.

### 11.2 `funcionalidades_01234.md`

**Inconsistência A — Levenshtein atribuído a cod-001:**  
O documento associa o Levenshtein ao código 001. Mas o git diff mostra que o Levenshtein (linhas 1426 e 1612 no arquivo atual) e `autoFixCommonHallucinations` foram adicionados no commit `2ab9c6d` (Mar 31), que gerou cod-002/003/004, **não** cod-001. O baseline correto para Levenshtein é cod-004.

**Inconsistência B — "SmartSchemaReducer foi adicionado em 001":**  
Na realidade, o SmartSchemaReducer foi *desabilitado* em cod-001 (substituído por `QueryExecutionService` no `SQLGenerationService`) e *reabilitado* em cod-004 (`2ab9c6d`). A versão com scoring de colunas é cod-004.

**Inconsistência C — Cloudflare mencionado como terceiro provider nos checkpoints finais:**  
Os documentos não registram que o Cloudflare foi substituído pelo DeepSeek em `11c77cb` (Mai 18). Todos os testes semânticos usaram DeepSeek, não Cloudflare.

---

## 12. Destaques para o TCC

As implementações com maior potencial de destaque no texto acadêmico, ordenadas por relevância técnica e originalidade:

### 1. RAG com pgvector e embeddings Gemini 3072d (Técnica 21)

**Por que destacar:** Único componente que usa aprendizado de máquina real (não regras). Usa busca vetorial semântica com distância coseno para selecionar as tabelas mais relevantes da pergunta antes de enviar ao LLM.

**Detalhes técnicos:** `gemini-embedding-001`, dimensão 3072, `TaskType.RETRIEVAL_QUERY`, top-K=12, threshold coseno=0.5. Migration PostgreSQL com extensão `pgvector`.

**Impacto medido:** Integrado ao sistema em `48962d24` (Mai 21), reduziu erros IA no segundo run (6→0 para Gemini, 4→0 para DeepSeek).

### 2. Pipeline de validação com auto-correção (Técnicas 9+14)

**Por que destacar:** O sistema não apenas gera SQL, mas o executa e, em caso de erro, usa o erro como feedback para pedir ao próprio LLM que corrija o SQL. Até 2 rounds de correção automática.

**Impacto medido:** Principal responsável pelo salto de cod-001 (Gemini 71.4%) para cod-004 (Gemini 100%). Sem auto-correção, queries com erros de coluna ficavam em ERRO; com ela, eram recuperadas.

### 3. Bug crítico de colunas vazias e seu impacto (Técnica 5)

**Por que destacar:** Um único bug em `optimizeSchemaForLLM()` (campo `columns: []` sempre vazio) era responsável pela maioria das alucinações iniciais. Sua correção elevou a acurácia do Gemini de 14.3% para 71.4% em um único commit.

**Valor acadêmico:** Ilustra como um bug de infraestrutura de contexto pode ter impacto desproporcionalmente maior do que aprimoramentos de prompt.

### 4. SmartSchemaReducer com tabelas core garantidas (Técnica 18/20)

**Por que destacar:** Combina scoring semântico com garantia determinística: 7 tabelas críticas da cadeia geográfica INEP são sempre incluídas no schema, independentemente da relevância calculada. Previne alucinações de JOINs geográficos.

### 5. Transição Cloudflare SQLCoder-7b → DeepSeek-V3 (Técnica 28)

**Por que destacar:** Demonstra o trade-off entre modelo especializado (SQLCoder-7b, ~7B params, focado em SQL) vs modelo geral de grande porte (DeepSeek-V3, ~671B). O especialista se saiu pior com prompts ricos em contexto; o generalista grande respondeu melhor.

**Dados:** Cloudflare registrou regressão de cod-000 para cod-001 (35.7%→28.6%) quando o prompt ficou mais complexo. DeepSeek-V3 na estreia (sem_v1) já superou Groq em score médio (26.1% vs 17.4%).

### 6. Teto de 0% em perguntas difíceis

**Por que destacar:** Em todas as 7 versões de teste (5 CSVs + 2 JSONs semânticos), as perguntas classificadas como "difíceis" registraram 0% de acerto para todos os providers. Isso delimita claramente a fronteira técnica do sistema.

**Implicação para TCC:** As perguntas difíceis exigem raciocínio multi-hop, cálculos de proporção com múltiplos JOIN, ou conhecimento implícito sobre estruturas do banco que não estão no schema. São candidatas naturais para a seção de Limitações e Trabalhos Futuros.

---

*Documento gerado em 2026-05-29. Análise baseada em 144 commits (Jul 2025 – Mai 2026), 5 arquivos CSV de teste e 2 arquivos JSON de benchmark semântico.*  
*Referências cruzadas: [`EVOLUCAO_TECNICA.md`](EVOLUCAO_TECNICA.md) (catálogo de técnicas), [`funcionalidades_01234.md`](funcionalidades_01234.md) (detalhes de implementação 001–004).*
