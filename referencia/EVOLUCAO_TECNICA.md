# Análise Técnica Detalhada — Evolução do QueryLab

**Arquivos analisados:** 13 arquivos de backend + 4 de frontend, totalizando ~4.500 linhas de lógica nova ou modificada.

**Comparação entre:**
- **Original:** `/home/diovani/Área de trabalho/Pasta sem titulo/ QueryLAb`
- **Atual:** `/home/diovani/querylab/backend/` e `/home/diovani/querylab/frontend/`

---

## Sumário de Arquivos

**Backend atual:**
- `sql-generation-service.ts` (2076 linhas)
- `smart-schema-reducer.ts` (498 linhas)
- `query-execution-service.ts` (268 linhas)
- `gemini-service.ts` (221 linhas)
- `groq-service.ts` (280 linhas)
- `openrouter-service.ts` (80 linhas)
- `schema-embedding-service.ts` (61 linhas)
- `scripts/run-semantic-tests.ts` (576 linhas)
- `scripts/index-schema-embeddings.ts` (176 linhas)
- `scripts/perguntas_text_to_sql.json` (30 perguntas)
- `prisma/schema.prisma`

**Backend original (para comparação):**
- `sql-generation-service.ts` (1479 linhas)

**Frontend:**
- `SchemaERDiagram.tsx`, `DataDictionary.tsx`, `business-dictionary.ts`, `test-results-service.ts`

---

## Parte 1 — Geração de SQL

---

### Técnica 1 — Prompt Unificado com Chain of Thought (`buildSQLGenerationPrompt`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 667–815
**Estava no original?** NÃO | **Sofisticação:** Muito sofisticado

O método constrói um único prompt reutilizado pelos 3 providers (Gemini, Groq, DeepSeek), estruturado em 8 camadas:

1. Persona especialista ("Engenheiro de Dados Sênior, especialista em dados INEP")
2. Contexto de conversa multi-turno (histórico das últimas 4 mensagens)
3. Pergunta atual
4. Schema enriquecido com dicionário de colunas
5. 8 Regras de Ouro
6. 8 Anti-padrões (omitidos para Groq via flag `isGroq` para economizar tokens)
7. Few-shot dinâmico (0 exemplos para Groq, 3 para Gemini/DeepSeek)
8. Chain of Thought em 4 passos explícitos:

```
🧠 SUA TAREFA (CHAIN OF THOUGHT):
1. Primeiro, pense passo-a-passo. Escreva um parágrafo conciso explicando qual intenção você entendeu, quais tabelas serão escolhidas e por que.
2. Verifique mentalmente cada coluna que usará — confirme que ela existe no schema acima com o nome exato.
3. Em seguida, dê a resposta final em formato SQL padrão isolado por ```sql.
4. Por fim, em uma única linha iniciada exatamente com "EXPLICAÇÃO:", descreva em linguagem simples e amigável o que a query retorna.
```

**Parâmetros do método:**
- `question`: pergunta do usuário
- `reducedSchema`: schema já reduzido/enriquecido
- `conversationContext`: histórico
- `maxExamples`: número de exemplos few-shot (default 3, 0 para Groq, 1 na auto-correção de Groq)
- `isGroq`: boolean — quando `true`, omite os anti-padrões 3–8 para economizar tokens

**Qual problema resolve:** Concentra toda a inteligência de prompt em um único método, eliminando divergências entre providers e garantindo que as mesmas regras se apliquem a Gemini, Groq e DeepSeek.

---

### Técnica 2 — 8 Regras de Ouro (Engenharia de Prompt Especializada para INEP)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 686–805
**Estava no original?** Parcialmente (versões muito básicas) | **Sofisticação:** Muito sofisticado

Cada regra endereça um padrão de erro específico do banco INEP:

**Regra 1 — Diferenciação entre tabelas de IES:**
- `censo_ies_bruto`: filtros geográficos/temporais, série temporal com `nu_ano_censo`, colunas `sg_uf_ies`, `no_municipio_ies`, `no_regiao_ies`, `in_capital_ies`
- `censo_ies`: dimensão estática, cruza com `municipios_ibge.cod_ibge`, sem `nu_ano_censo`. Alerta: sem filtro de ano retorna IES históricas de TODAS as edições
- `emec_instituicoes`: SOMENTE para telefone, email, site, CNPJ, IGC

**Regra 2 — Cadeia Geográfica Obrigatória:**
```
censo_ies → municipios_ibge → microregioes_ibge → mesoregioes_ibge → uf_ibge → regioes_ibge
```
Com os predicados exatos de cada JOIN.

**Regra 3 — Restrições de Colunas (Anti-Alucinação):**
15+ colunas proibidas com alternativas corretas:
- `municipios_ibge.cod_uf_ibge` → usar cadeia
- `censo_ies.cod_categoria_administrativa` → `id_categoria_administrativa`
- `uf_ibge.nome_uf` → `no_uf_ibge`
- `fluxo_tda.sg_uf_ies` → JOIN com `censo_ies_bruto`

**Regra 4 — Prefixo de Schema:**
Maioria usa `inep.`, mas `uf_ibge`, `pibs_per_capita` e `variaveis_pib_municipios_ibge` são do schema `cesta`. `idhms` usa `inep.`.

**Regra 5 — Performance:**
Sempre LIMIT 50 em queries com JOINs abertos, LIMIT 100 em consultas simples.

**Regra 6 — Dicionário vs. Fatos:**
- `censo_cursos` = dicionário estático (nome, código, modalidade de ingresso). NÃO tem `qt_mat`, `nu_ano_censo`, `qt_ing`, `qt_vg_total`, `qt_conc`
- `censo_curso_vagas_bruto` = série temporal com todos esses campos
- JOIN entre elas: `v.co_curso = cc.cod_curso`

**Regra 7 — JOIN Temporal Obrigatório (a mais crítica):**
Todo JOIN entre `censo_ies_bruto` e `censo_curso_vagas_bruto` DEVE incluir:
```sql
AND v.nu_ano_censo = b.nu_ano_censo
```
Sem isso: produto cartesiano de **8,7 milhões de linhas**, valores inflados 14×, timeout de 45s.

**Regra 8 — JOIN Temporal para Métricas:**
Ao cruzar `dados_igc`, `dados_cpc` ou `dados_enade` com `censo_ies_bruto`, fazer JOIN apenas por `co_ies` — nunca por `AND d.ano = b.nu_ano_censo` porque o ano de avaliação pode não coincidir com um ano de censo.

---

### Técnica 3 — 8 Anti-Padrões Explícitos no Prompt (formato ERRADO/CORRETO/CONSEQUÊNCIA)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 757–805
**Estava no original?** NÃO | **Sofisticação:** Muito sofisticado

Cada anti-padrão mostra código errado, código correto e a consequência real. São exibidos apenas para Gemini e DeepSeek (omitidos para Groq via `isGroq`).

**AP1 — JOIN Explosivo (produto cartesiano):**
```sql
-- ERRADO:
JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies
-- CORRETO:
JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
-- CONSEQUÊNCIA: Sem AND de ano → 8,7 MILHÕES de linhas → valores inflados 14× e timeout de 45s
```

**AP2 — Tabela Histórica sem Filtro de Ano para Cidade:**
```sql
-- ERRADO:
FROM inep.censo_ies c JOIN inep.municipios_ibge m ON c.cod_municipio = m.cod_ibge WHERE m.nome_municipio = 'Curitiba'
-- CORRETO:
FROM inep.censo_ies_bruto WHERE no_municipio_ies ILIKE '%Curitiba%' AND nu_ano_censo = (SELECT MAX(nu_ano_censo)...)
-- CONSEQUÊNCIA: censo_ies retorna IES de TODAS as edições históricas (ex: 66 rows em vez de 38)
```

**AP3 — Salto na Cadeia Geográfica:**
```sql
-- ERRADO:
JOIN inep.mesoregioes_ibge me ON m.cod_microregiao_ibge = me.cod_mesoregiao_ibge
-- CORRETO:
JOIN inep.microregioes_ibge mi ON m.cod_microregiao_ibge = mi.cod_microregiao_ibge
JOIN inep.mesoregioes_ibge me ON mi.cod_mesoregiao_ibge = me.cod_mesoregiao_ibge
-- CONSEQUÊNCIA: Chaves têm formatos diferentes (7 vs 4 chars) → 0 linhas retornadas
```

**AP4 — Divisão sem NULLIF (divisão por zero):**
```sql
-- ERRADO:
(qt_mat - qt_conc) / qt_mat::numeric
-- CORRETO:
(qt_mat - qt_conc) / NULLIF(qt_mat, 0)::numeric
-- CONSEQUÊNCIA: Se qt_mat = 0 → division by zero → query falha
```

**AP5 — Filtro de Estado em `fluxo_tda` sem JOIN:**
```sql
-- ERRADO:
FROM inep.fluxo_tda f WHERE f.sg_uf_ies = 'SP'
-- CORRETO:
FROM inep.fluxo_tda f
JOIN inep.censo_ies_bruto b ON f.co_ies = b.co_ies
WHERE b.sg_uf_ies = 'SP' AND b.nu_ano_censo = f.nu_ano_referencia
-- CONSEQUÊNCIA: fluxo_tda não tem sg_uf_ies → query falha
```

**AP6 — Estado/Região do Curso via `sg_uf_ies`:**
```sql
-- ERRADO: GROUP BY b.sg_uf_ies (via JOIN com censo_ies_bruto)
-- CORRETO: GROUP BY v.sg_uf (diretamente de vagas_bruto)
-- CONSEQUÊNCIA: Cursos EAD têm polo em estado diferente da IES → sg_uf_ies ≠ sg_uf
```

**AP7 — Precedência OR/AND sem Parênteses:**
```sql
-- ERRADO:
WHERE f.no_curso ILIKE '%Medicina%' OR f.no_curso ILIKE '%Enfermagem%' AND f.nu_ano_referencia = 2022
-- CORRETO:
WHERE (f.no_curso ILIKE '%Medicina%' OR f.no_curso ILIKE '%Enfermagem%') AND f.nu_ano_referencia = 2022
-- CONSEQUÊNCIA: AND tem precedência maior → filtro de ano só aplica ao segundo termo → resultado completamente errado e silencioso
```

**AP8 — JOIN de Métricas com `censo_ies_bruto` por Ano:**
```sql
-- ERRADO:
JOIN inep.censo_ies_bruto b ON d.co_ies = b.co_ies AND d.ano = b.nu_ano_censo
-- CORRETO:
JOIN inep.censo_ies_bruto b ON d.co_ies = b.co_ies
-- CONTEXTO: dados_igc/dados_cpc/dados_enade têm anos próprios que NÃO coincidem com nu_ano_censo do censo
```

---

### Técnica 4 — Few-Shot Dinâmico com Seleção por Keywords (`getDynamicExamples`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 821–1046
**Estava no original?** NÃO (exemplos fixos estáticos no original) | **Sofisticação:** Sofisticado

Pool de 14 exemplos SQL pré-escritos, cada um com uma lista de `tags`. O método:

1. Converte a pergunta para minúsculas: `const q = question.toLowerCase()`
2. Para cada exemplo, conta tags que aparecem na pergunta: `ex.tags.forEach(tag => { if (q.includes(tag)) score++ })`
3. Ordena por score decrescente: `scored.sort((a, b) => b.score - a.score)`
4. Retorna os `maxExamples` primeiros (3 para Gemini/DeepSeek, 0 para Groq)

Os 14 exemplos cobrem:
- Capitais (`in_capital_ies`, `censo_ies_bruto` com filtro de ano)
- Contatos (uso de `emec_instituicoes`)
- Regiões (`no_regiao_ies`, evitar cadeia geográfica)
- Estados (`sg_uf_ies`, sem JOINs geográficos)
- Dados anuais (`censo_curso_vagas_bruto`, nunca `censo_cursos`)
- Agregação por estado/região de curso (`sg_uf` de vagas_bruto, nunca `sg_uf_ies` via JOIN)
- ENADE (`dados_enade`, não `dados_cpc`)
- JOIN temporal obrigatório IES×vagas
- Modalidade (presencial/EAD)
- Cursos por instituição
- Gênero (`qt_mat_fem`, `qt_mat_masc`, com `NULLIF` para divisão)
- CPC (`dados_cpc`, JOIN somente por `co_ies`)
- Evasão/Fluxo (`fluxo_tda`, `tda`/`tca`/`tap` entre 0 e 1)
- IGC (`igc_bruto` com todos os campos embutidos)
- CAPES/Pós-Graduação (`capes_programas_bruto`)

---

### Técnica 5 — Dicionário Central de Colunas (`buildSchemaColumnDict`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 1883–1950
**Estava no original?** NÃO | **Sofisticação:** Muito sofisticado

~50 entradas mapeando cada coluna para anotação rica com tipo, enums, escopo e avisos. Exemplos:

```typescript
'id_categoria_administrativa': '[int — em censo_ies: 1=Pública Federal, 2=Pública Estadual, 3=Municipal, 4=Privada c/fins lucrativos, 5=Privada s/fins lucrativos, 6=Privada Confessional, 7=Especial, 8=Comunitária]'

'sg_uf_ies': '[varchar — SOMENTE em censo_ies_bruto — sigla do estado da IES. NÃO use em censo_curso_vagas_bruto ou fluxo_tda]'

'co_ies': '[int — em emec_instituicoes, censo_curso_vagas_bruto, censo_ies_bruto, dados_cpc, fluxo_tda — NÃO é PK]'

'cod_ies': '[int PK — em censo_ies e censo_cursos]'

'tda': '[numeric 0–1 — Taxa de Desistência Acumulada — em fluxo_tda]'

'cpc_continuo': '[numeric 0–5]'

'cd_conceito_programa': '[varchar — em capes_programas_bruto — para comparação numérica use cast: cd_conceito_programa::int >= 6. NUNCA compare diretamente com inteiro sem cast]'

'co_uf_ibge': '[int PK — em cesta.uf_ibge — FK de mesoregioes_ibge.cod_uf_ibge]'
```

O método `formatColumnForPrompt` usa o dicionário ao formatar o schema: se a coluna tem entrada, usa a anotação completa; caso contrário, exibe apenas `nome:tipo(PK)`.

---

### Técnica 6 — Formatação do Schema com Diferenciação `inep`/`cesta` (`formatSchemaToText`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 494–514
**Estava no original?** NÃO (original enviava schema como JSON bruto) | **Sofisticação:** Moderado

```typescript
const cestaSchemaSet = new Set([
  'uf_ibge', 'pibs_per_capita', 'variaveis_pib_municipios_ibge', 'ibge_demografia_municipios'
])
const schemaPrefix = cestaSchemaSet.has(table.name) ? 'cesta' : 'inep'
lines.push(`Tabela \`${schemaPrefix}.${table.name}\`: Colunas [ ${enrichedCols.join(', ')} ]`)
```

Detecta automaticamente o schema correto de cada tabela. Modo compacto para Groq (`compact=true`): sem anotações de dicionário, sem seção de relacionamentos FK — reduz o tamanho do contexto.

---

### Técnica 7 — Seção de Relacionamentos FK no Prompt (`buildJoinRelationships`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 1985–2003
**Estava no original?** Parcialmente | **Sofisticação:** Moderado

Seção dedicada documentando todos os JOINs corretos com tipos de dados e warnings de cast:

```
📎 RELACIONAMENTOS / JOINs CORRETOS:
- censo_cursos.cod_ies = emec_instituicoes.co_ies
- censo_cursos.cod_curso = censo_curso_vagas_bruto.co_curso
- censo_curso_vagas_bruto.co_ies = censo_ies_bruto.co_ies  AND v.nu_ano_censo = b.nu_ano_censo  (JOIN TEMPORAL OBRIGATÓRIO)
- censo_ies.cod_municipio = municipios_ibge.cod_ibge  (ambos character — sem cast)
- censo_ies_bruto.co_municipio_ies::text = municipios_ibge.cod_ibge  (co_municipio_ies é int, cast para text necessário)
- municipios_ibge.cod_microregiao_ibge = microregioes_ibge.cod_microregiao_ibge
- microregioes_ibge.cod_mesoregiao_ibge = mesoregioes_ibge.cod_mesoregiao_ibge
- mesoregioes_ibge.cod_uf_ibge = cesta.uf_ibge.co_uf_ibge
- cesta.uf_ibge.co_regiao_ibge = regioes_ibge.cod_regiao_ibge
```

Incluído apenas no modo não-compacto (omitido para Groq).

---

### Técnica 8 — Contexto de Conversa Multi-Turno (`buildConversationContext`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 519–553
**Estava no original?** SIM (idêntico) | **Sofisticação:** Moderado

```typescript
const recentMessages = conversationHistory.slice(-4)
const contextLines = recentMessages
  .filter(msg => msg.tipo === 'user' || (msg.tipo === 'assistant' && msg.sqlQuery))
  .map(msg => {
    if (msg.tipo === 'user') return `Pergunta anterior: ${msg.conteudo}`
    else if (msg.sqlQuery) return `SQL anterior: ${msg.sqlQuery}`
    return null
  })
  .filter(Boolean)
```

Pega as últimas 4 mensagens, filtra apenas mensagens do usuário e do assistente que tenham `sqlQuery`. Inclui instrução: "Se a pergunta for um follow-up, adapte o SQL anterior; se for uma pergunta nova e independente, gere um SQL novo do zero."

---

## Parte 2 — Validação e Correção Automática de SQL

---

### Técnica 9 — Pipeline de Validação em 8 Etapas (`validateAndSanitizeSQL`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 1446–1523
**Estava no original?** Parcialmente (etapas 1 e 2 inexistentes; etapa 6 desabilitada por bug) | **Sofisticação:** Sofisticado

Sequência completa:

1. `autoFixCommonHallucinations(sql)` — corrige typos hardcoded
2. `enforceTemporalJoinConstraints(cleanSQL)` — injeta condição de ano
3. Verifica se o SQL não está vazio
4. `isValidSelectQuery(cleanSQL)` — só SELECT/WITH, sem DML
5. `validateTablePrefixes(cleanSQL)` — verifica prefixos `inep.`
6. `validateColumnsAgainstSchema(cleanSQL)` — fuzzy match (antes estava comentado com `// TEMPORARIAMENTE DESABILITADO - validação está com bug`)
7. `addSafetyProtections(cleanSQL)` — LIMIT dinâmico
8. `checkDangerousKeywords(protectedSQL)` — bloqueio de injeção SQL

Se qualquer etapa produz erros intoleráveis, retorna `isValid: false`. Warnings são acumulados e retornados junto.

---

### Técnica 10 — Auto-Correção de Alucinações Comuns (`autoFixCommonHallucinations`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 1397–1420
**Estava no original?** NÃO | **Sofisticação:** Moderado

Substituições determinísticas via regexp com word boundaries e negative lookahead (não substitui dentro de strings SQL):

```typescript
// Prefixo de schema incorreto
fixedSQL = fixedSQL.replace(/\binep\.(uf_ibge)\b/gi, 'cesta.$1')

// Mapa de typos comuns
const typoMap: Record<string, string> = {
  'co_municipio':                'cod_municipio',
  'cod_categoria_administrativa': 'id_categoria_administrativa',
  'nome_uf':                     'no_uf_ibge',
  'nome_uf_ibge':                'no_uf_ibge',
}

// Regex com negative lookahead para não substituir dentro de strings
const regex = new RegExp(`(?<!')\b${wrong}\b(?!')`, 'gi')
```

**Nota:** `co_ies`, `co_curso` e `sg_uf_ies` foram explicitamente removidos do mapa porque são colunas válidas em algumas tabelas — a substituição global causava mais dano do que correção.

---

### Técnica 11 — Enforcement Determinístico de JOINs Temporais (`enforceTemporalJoinConstraints`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 1325–1394
**Estava no original?** NÃO | **Sofisticação:** Muito sofisticado

Parser de SQL via regex stateful em 6 passos:

**Passo 1 — Detecta presença de ambas as tabelas:**
```typescript
const hasCensoIesBruto = /censo_ies_bruto/i.test(sql)
const hasCensoVagasBruto = /censo_curso_vagas_bruto/i.test(sql)
if (!hasCensoIesBruto || !hasCensoVagasBruto) return { sql, warnings }
```

**Passo 2 — Extrai aliases:**
```typescript
const iesBrutoAliasMatch = sql.match(/\bcenso_ies_bruto\s+(\w+)/i)
const vagasBrutoAliasMatch = sql.match(/\bcenso_curso_vagas_bruto\s+(\w+)/i)
```

**Passo 3 — Verifica se condição temporal já existe:**
```typescript
const temporalConditionRegex = new RegExp(
  `(${iesBrutoAlias}|${vagasBrutoAlias})\.nu_ano_censo\s*=\s*(${iesBrutoAlias}|${vagasBrutoAlias})\.nu_ano_censo`,
  'i'
)
if (temporalConditionRegex.test(sql)) return { sql, warnings }
```

**Passo 4 — Localiza a cláusula ON via regex lookahead e injeta a condição de ano automaticamente:**
```typescript
const joinIesRegex = new RegExp(
  `(JOIN\s+inep\.censo_ies_bruto\s+${iesBrutoAlias}\s+ON\s+[^\n]+?)(?=\s*(?:JOIN|LEFT|RIGHT|INNER|WHERE|GROUP|ORDER|LIMIT|HAVING|$))`,
  'is'
)
// Adiciona: AND ${vagasBrutoAlias}.nu_ano_censo = ${iesBrutoAlias}.nu_ano_censo
```

**Passos 5/6 — Fallback:** Se não encontrar o JOIN da tabela principal, tenta na tabela secundária. Se não conseguir injetar, emite warning mas não falha.

---

### Técnica 12 — Fuzzy Matching com Distância de Levenshtein (`validateColumnsAgainstSchema`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 1422–1441 e 1525–1692
**Estava no original?** NÃO funcional (desabilitado por bug) | **Sofisticação:** Muito sofisticado

**O algoritmo de Levenshtein** (programação dinâmica, O(n×m)):

```typescript
private levenshteinDistance(s1: string, s2: string): number {
  let matrix: number[][] = []
  for (let i = 0; i <= s2.length; i++) { matrix[i] = [i] }
  for (let j = 0; j <= s1.length; j++) { matrix[0][j] = j }
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        )
      }
    }
  }
  return matrix[s2.length][s1.length]
}
```

**Modo 1 — Colunas com alias (`alias.coluna`):**
Extrai referências com regex, resolve alias para tabela real via `aliasMap`. Se coluna não existe, aplica fuzzy com threshold `dist <= 3`. Se encontra match: substitui in-place no SQL preservando case. Se dist > 3: gera **erro fatal**.

```typescript
for (const col of availableCols) {
  const dist = this.levenshteinDistance(columnName, col)
  if (dist < minDistance && dist <= 3) {
    minDistance = dist
    bestMatch = col
  }
}
if (bestMatch && minDistance > 0) {
  const regex = new RegExp(`\b${tableOrAlias}\s*\.\s*${columnName}\b`, 'gi')
  fixedSQL = fixedSQL.replace(regex, `${tableOrAlias}.${bestMatch}`)
  warnings.push(`Auto-corrigido: coluna '${columnName}' para '${bestMatch}'.`)
}
```

**Modo 2 — Colunas soltas (sem alias):**
Remove strings SQL primeiro (`'[^']*'`) para não falsear. Para palavras não reconhecidas (não são keywords SQL, aliases ou nomes de tabelas), aplica fuzzy com threshold mais estrito `dist <= 2`. Palavras curtas (≤ 3 chars) são ignoradas. Se não encontra match: apenas **warning** (pode ser variável do frontend).

**Extração de aliases:**
```typescript
const aliasPattern = /(?:from|join)\s+(?:inep\.)?([a-z_][a-z0-9_]*)(?:\s+(?:as\s+)?([a-z_][a-z0-9_]*))?/gi
// Filtra keywords SQL como aliases: on, where, group, order, etc.
```

---

### Técnica 13 — Classificação de Erros PostgreSQL em 7 Categorias (`classifyPostgresError`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 2008–2074
**Estava no original?** NÃO | **Sofisticação:** Sofisticado

| Categoria | Trigger no erro PostgreSQL | Hint gerado para o LLM |
|---|---|---|
| `column_not_found` | `column ... does not exist` | Extrai nome da coluna/tabela; alerta sobre `cod_ies` vs `co_ies`, `sg_uf_ies` somente em `censo_ies_bruto` |
| `table_not_found` | `relation ... does not exist` | Extrai nome da tabela; lembra sobre `cesta.uf_ibge` |
| `ambiguous_column` | `ambiguous` | Extrai coluna ambígua; orienta sobre aliases |
| `type_mismatch` | `operator does not exist` / `cannot cast` / `invalid input syntax` | 3 causas: int vs varchar, `tp_grau_academico` é varchar, `cd_conceito_programa` precisa de `::int` |
| `syntax_error` | `syntax error` / `parse error` | Orienta sobre parênteses, vírgulas |
| `temporal_join_missing` | `timeout` / `canceling statement` | Se ambas as tabelas temporais presentes: hint com exemplo de `AND v.nu_ano_censo = b.nu_ano_censo` |
| `other` | Demais casos | Hint genérico |

---

### Técnica 14 — Auto-Correção Multi-Round (`retrySQLGeneration`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 1052–1112
**Estava no original?** NÃO | **Sofisticação:** Muito sofisticado

Loop de até 2 rounds por provider, integrado no `generateSQLParallel`:

```typescript
for (let round = 1; round <= 2 && !execResult.success && execResult.error && schemaResult.reducedSchema; round++) {
  const correctionResult = await this.retrySQLGeneration(
    result.provider, result.model, request.question,
    result.sql!, execResult.error, schemaResult.reducedSchema, conversationContext
  )
  if (correctionResult.success && correctionResult.sql) {
    result.sql = correctionResult.sql
    execResult = await this.queryExecutionService.executeWithTimeout(result.sql, {...})
  } else { break }
}
```

Dentro do `retrySQLGeneration`:
1. Classifica o erro via `classifyPostgresError`
2. Constrói prompt de correção = prompt base completo + seção adicional:
```
🚨 CORREÇÃO NECESSÁRIA: A consulta SQL abaixo falhou na execução.
DIAGNÓSTICO DO ERRO: ${hint}
ERRO ORIGINAL DO BANCO: ${error}
CONSULTA QUE FALHOU: ```sql ${failedSql} ```
Aplique o diagnóstico acima, corrija APENAS o problema identificado...
```
3. Chama o provider correto (Gemini, Groq ou DeepSeek)
4. Para Groq: `maxExamples=1`. Para Gemini/DeepSeek: `maxExamples=3`

---

### Técnica 15 — Proteção de Segurança com LIMIT Dinâmico (`addSafetyProtections`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 1746–1864
**Estava no original?** SIM (igual) | **Sofisticação:** Moderado

Três métodos cooperam:

**`shouldSkipLimitProtection`:** Verifica 13 padrões onde não deve adicionar LIMIT (COUNT, SUM, AVG, MAX, MIN, GROUP BY, HAVING, UNION, EXCEPT, INTERSECT, WINDOW, OVER, PARTITION BY).

**`calculateOptimalLimit`:** Conta JOINs e subqueries:
- `joinCount > 3 || subqueryCount > 2` → LIMIT 25 (muito complexas)
- `joinCount > 1 || subqueryCount > 0` → LIMIT 50 (moderadas)
- caso base → LIMIT 100 (simples)

**`addLimitToComplexQuery`:** Para CTEs (iniciadas com `WITH`), localiza o último SELECT e adiciona LIMIT ao final.

---

## Parte 3 — Schema e RAG

---

### Técnica 16 — Hierarquia de 3 Camadas para Seleção de Schema (`getReducedSchema`)

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 403–492
**Estava no original?** NÃO (original: schema completo como JSON direto) | **Sofisticação:** Muito sofisticado

```
Camada 1 → RAG semântico (pgvector):     semanticamente mais preciso para domínios específicos
Camada 2 → SmartSchemaReducer (keywords): determinístico, menos inteligente
Camada 3 → Schema completo (fallback):   seguro, custoso em tokens
```

```typescript
// Camada 1 — RAG
if (await ragService.isIndexed()) {
  const ragTables = await ragService.findSimilarTables(question)
  // Agrupa por schema, chama reduceSchemaFromSeed para cada schema
}

// Camada 2 — Keywords
const reductionResult = await this.schemaReducer.reduceSchema({
  question, schemaName: 'inep', maxTables: 15, includeRelationships: false
})

// Camada 3 — Schema completo
const fullSchema = await this.schemaService.getSchemaForLLM('inep')
```

Também produz versão compacta para Groq: sem dicionário de colunas, sem relacionamentos FK.

---

### Técnica 17 — SmartSchemaReducer com Scoring Multi-Critério

**Arquivo:** `backend/src/services/smart-schema-reducer.ts`, linhas 67–334
**Estava no original?** SIM (igual) | **Sofisticação:** Sofisticado

**Passo 1 — Análise de intenção (`analyzeQueryIntent`):**
Extrai 5 dimensões da pergunta:
- `domains`: `aluno/matricula` → `students`; `curso/graduação` → `courses`; `universidade/faculdade` → `institutions`; `enade/nota` → `performance`; `município/estado` → `demographics`
- `keywords`: palavras com mais de 3 chars, excluindo stop words (`de`, `da`, `do`, `nas`, `com`) e common words (`dados`, `informações`, `tabela`)
- `temporalScope`: anos `\b(20\d{2})\b`, e detecção de `último`, `recente`, `atual`
- `geographicScope`: `brasil/nacional`, `região/regional`, `estado/estadual`
- `aggregationType`: `sum`, `average`, `count`, `max`, `min`

**Passo 2 — Cálculo de relevância (`calculateTableRelevances`):**
- Peso 2× por domínio matching com `relevanceScores[domain] > 0`
- +3 por keyword na descrição da tabela (match parcial bi-direcional)
- +5 por keyword no **nome** da tabela
- +3× por keyword nos **nomes de colunas**
- +2 se pergunta tem escopo temporal e tabela tem `dataQuality.hasTemporalData`
- +2 se pergunta tem escopo geográfico e tabela tem `dataQuality.hasGeographicData`
- -1 se tabela grande e sem tipo de agregação detectado

**Passo 3 — Seleção com diversidade (`selectBestTables`):**
Ordena por score. Primeira passagem: pega a mais relevante de cada categoria. Segunda passagem: completa até `maxTables=15`.

---

### Técnica 18 — Grafo FK e Expansão BFS (`expandWithFKGraph`)

**Arquivo:** `backend/src/services/smart-schema-reducer.ts`, linhas 28–47 e 340–360
**Estava no original?** SIM (igual) | **Sofisticação:** Sofisticado

Grafo `Map<string, string[]>` com 17 nós, representando adjacências bidirecionais:

```typescript
const FK_GRAPH: Map<string, string[]> = new Map([
  ['censo_ies_bruto', ['censo_curso_vagas_bruto', 'dados_cpc', 'igc_bruto', 'fluxo_tda']],
  ['censo_curso_vagas_bruto', ['censo_ies_bruto', 'censo_cursos']],
  ['censo_cursos', ['censo_curso_vagas_bruto', 'emec_instituicoes', 'dados_cpc', 'fluxo_tda']],
  ['municipios_ibge', ['censo_ies', 'microregioes_ibge', 'idhms', 'pibs_per_capita', 'ibge_demografia_municipios']],
  // ... 13 mais
])
```

**O BFS (`expandWithFKGraph`):**
```typescript
private expandWithFKGraph(seedTables: string[], depth: number = 1): string[] {
  const expanded = new Set(seedTables)
  let frontier = new Set(seedTables)
  for (let d = 0; d < depth; d++) {
    const nextFrontier = new Set<string>()
    for (const table of frontier) {
      const neighbors = FK_GRAPH.get(table) || []
      for (const neighbor of neighbors) {
        if (!expanded.has(neighbor)) {
          expanded.add(neighbor)
          nextFrontier.add(neighbor)
        }
      }
    }
    frontier = nextFrontier
    if (frontier.size === 0) break
  }
  return Array.from(expanded)
}
```

Chamado com `depth=1`, expande as tabelas selecionadas incluindo todos os vizinhos FK diretos — garante que JOINs necessários nunca faltem no schema enviado ao LLM.

---

### Técnica 19 — Tabelas Core Garantidas (`buildReducedSchema`)

**Arquivo:** `backend/src/services/smart-schema-reducer.ts`, linhas 381–393
**Estava no original?** SIM (igual) | **Sofisticação:** Moderado

Após a expansão BFS, adiciona incondicionalmente 9 tabelas "core":

```typescript
const coreTables = [
  'censo_ies', 'censo_ies_bruto', 'censo_cursos', 'censo_curso_vagas_bruto',
  'municipios_ibge', 'microregioes_ibge', 'mesoregioes_ibge', 'uf_ibge', 'regioes_ibge'
]
coreTables.forEach(t => selectedTableNames.add(t))
```

Garante que a cadeia geográfica completa sempre esteja no schema, independentemente do score de relevância.

---

### Técnica 20 — RAG com pgvector + Gemini Embeddings (`SchemaEmbeddingService`)

**Arquivo:** `backend/src/services/schema-embedding-service.ts` e `backend/scripts/index-schema-embeddings.ts`
**Estava no original?** NÃO | **Sofisticação:** Muito sofisticado

**Indexação (`index-schema-embeddings.ts`, 176 linhas):**

Para cada tabela do schema:
1. Coleta metadados: nome, schema, descrição, categoria, keywords, colunas
2. Amostra 5 linhas reais do banco: `SELECT * FROM ${schemaName}.${tableName} LIMIT 5`
3. Constrói texto para embedding:
```typescript
const parts = [
  `Tabela: ${table.name} (schema: ${schemaName})`,
  `Descrição: ${description}`,
  `Categoria: ${category}`,
  `Palavras-chave: ${keywords.join(', ')}`,
  `Colunas: ${cols.join(', ')}`,
]
if (samples) parts.push(`Exemplos de dados:\n${samples}`)
```
4. Gera embedding de **3072 dimensões** com `gemini-embedding-001` usando `TaskType.RETRIEVAL_DOCUMENT`
5. Faz upsert na tabela `schema_table_embeddings` via pgvector

O script verifica se a dimensão mudou (migração de 768 → 3072) e recria a tabela se necessário.

**Busca semântica:**
```typescript
const result = await model.embedContent({
  content: { parts: [{ text: question }], role: 'user' },
  taskType: TaskType.RETRIEVAL_QUERY  // diferente de RETRIEVAL_DOCUMENT — busca assimétrica
})
const embeddingStr = `[${result.embedding.values.join(',')}]`

const res = await this.pool.query(
  `SELECT table_name, schema_name
   FROM (
     SELECT table_name, schema_name, embedding <=> $1::vector AS dist
     FROM schema_table_embeddings
     ORDER BY dist LIMIT $2
   ) t
   WHERE dist < $3`,
  [embeddingStr, topK=12, distanceThreshold=0.5]
)
```

Usa operador `<=>` do pgvector para distância cosseno. Para 34 tabelas, varredura sequencial é suficiente (sem índice HNSW).

**Schema Prisma:**
```prisma
model SchemaTableEmbedding {
  id         Int    @id @default(autoincrement())
  tableName  String @unique @map("table_name")
  schemaName String @map("schema_name")
  embedding  Unsupported("vector(3072)")?
  metadata   Json?
  @@map("schema_table_embeddings")
}
```

O tipo `vector(3072)` usa `Unsupported` pois o Prisma não tem suporte nativo a pgvector. O serviço usa `pg` Pool diretamente para queries de vector similarity.

---

### Técnica 21 — `reduceSchemaFromSeed`: Integração RAG → SmartSchemaReducer

**Arquivo:** `backend/src/services/smart-schema-reducer.ts`, linhas 441–482
**Estava no original?** NÃO | **Sofisticação:** Sofisticado

Método chamado pela Camada 1 após o RAG retornar tabelas:

```typescript
const seedRelevances: TableRelevance[] = seedTableNames.map(name => ({
  tableName: name,
  relevanceScore: 10, // score fixo máximo para tabelas RAG
  reasons: ['Selecionado por RAG semântico'],
  category: 'rag-selected',
  keywords: []
}))
const reducedSchema = this.buildReducedSchema(fullSchema, seedRelevances, includeRelationships)
```

Atribui score 10 (máximo) a todas as tabelas do RAG e as passa para `buildReducedSchema`, que ainda adiciona tabelas core e expande via BFS.

---

## Parte 4 — Execução de Queries

---

### Técnica 22 — Timeout Dinâmico por Complexidade SQL (`getRecommendedTimeout`)

**Arquivo:** `backend/src/services/query-execution-service.ts`, linhas 236–258
**Estava no original?** NÃO (original: timeout fixo de 10s) | **Sofisticação:** Moderado

```typescript
let timeoutMs = 30000 // base

if (joinCount > 2)    timeoutMs += 10000  // +10s para múltiplos JOINs
if (hasGroupBy)       timeoutMs += 5000   // +5s para GROUP BY
if (hasOrderBy)       timeoutMs += 3000   // +3s para ORDER BY
if (hasSubquery)      timeoutMs += 7000   // +7s para subqueries
if (hasILIKEWildcard) timeoutMs += 20000  // +20s — ILIKE com wildcard = full scan sem índice

return Math.min(timeoutMs, 120000) // máx 120s
```

`hasILIKEWildcard` usa `/ilike\s+'%[^']+%'/i` — detecta especificamente wildcards em ambos os lados (que causam full scan sem índice).

---

### Técnica 23 — Execução com `Promise.race` (Timeout Real de JavaScript)

**Arquivo:** `backend/src/services/query-execution-service.ts`, linhas 108–130
**Estava no original?** SIM (igual) | **Sofisticação:** Moderado

```typescript
const timeoutPromise = new Promise<QueryResult>((_, reject) => {
  setTimeout(() => reject(new Error(`Query timeout após ${timeoutMs}ms`)), timeoutMs)
})
const queryPromise = this.queryDbService.executeQuery(sql)
return await Promise.race([queryPromise, timeoutPromise])
```

**Retry com Backoff Progressivo:**
```typescript
for (let attempt = 0; attempt <= retryAttempts; attempt++) {
  if (attempt > 0) {
    await this.sleep(retryDelayMs * attempt) // backoff progressivo
    retryCount++
  }
  // ...
  if (!this.isTemporaryError(result.error)) break // não retry se erro permanente
}
```

`retryAttempts` default = 2. Erros temporários que justificam retry: `connection timeout`, `connection reset`, `econnreset`, `etimedout`.

---

## Parte 5 — Provedores LLM

---

### Técnica 24 — Paralelismo com `Promise.allSettled` + Loop de Execução Paralela

**Arquivo:** `backend/src/services/sql-generation-service.ts`, linhas 177–397
**Estava no original?** Parcialmente (sem loop de auto-correção) | **Sofisticação:** Sofisticado

```typescript
// Geração paralela — falha de um não cancela os outros
const promises = [
  this.generateWithGemini(request.question, schemaResult.reducedSchema!, conversationContext),
  this.generateWithGroq(request.question, groqSchema, conversationContext),       // schema compacto
  this.generateWithDeepSeek(request.question, schemaResult.reducedSchema!, conversationContext)
]
const settledResults = await Promise.allSettled(promises)

// Execução paralela com timeout dinâmico + loop de auto-correção por provider
const executionPromises = results.map(async (result) => {
  if (!result.success || !result.sql) return result
  const recommendedTimeout = this.queryExecutionService.getRecommendedTimeout(result.sql)
  let execResult = await this.queryExecutionService.executeWithTimeout(result.sql, { timeoutMs: recommendedTimeout })
  // loop de auto-correção (até 2 rounds)...
  return executedResult
})
const executedResults = await Promise.all(executionPromises)
```

**Seleção do melhor resultado:**
```typescript
const bestResult =
  executedResults.find(r => r.success && r.executionSuccess && r.data && r.data.length > 0)
  || executedResults.find(r => r.success && r.sql)
```

Groq recebe `compactSchema` (sem dicionário/relacionamentos) e 0 exemplos few-shot.

---

### Técnica 25 — GeminiService com Fallback entre Modelos

**Arquivo:** `backend/src/services/gemini-service.ts`, linhas 50–128
**Estava no original?** SIM | **Sofisticação:** Moderado

Ordem de prioridade:
1. `gemini-2.5-flash-lite` (1000 RPD, temperature `0.3`, principal)
2. `gemini-2.5-flash` (fallback, temperature `0.4`)

Detecção de rate limit: `error.code === 429`, `RATE_LIMIT_EXCEEDED`, strings `rate limit`/`quota`/`too many requests`. Ambos com `maxOutputTokens: 8192`.

---

### Técnica 26 — GroqService com `max_tokens` Reduzido

**Arquivo:** `backend/src/services/groq-service.ts`, linhas 178–226
**Estava no original?** SIM | **Sofisticação:** Simples

```typescript
const completion = await this.groq.chat.completions.create({
  messages: [{ role: 'user', content: prompt }],
  model: model,
  temperature: 0.3,
  max_tokens: 500,  // limitado para economizar cota
  top_p: 0.9
})
```

`max_tokens: 500` é limitação intencional para economizar cota do plano free do Groq. Por isso também usa schema compacto e 0 exemplos few-shot. Também tem métodos especializados `generateResultSummary` e `generateErrorExplanation`.

---

### Técnica 27 — OpenRouterService com DeepSeek-V3

**Arquivo:** `backend/src/services/openrouter-service.ts`, linhas 38–78
**Estava no original?** NÃO (Cloudflare/SQLCoder no original) | **Sofisticação:** Simples

```typescript
const response = await axios.post(
  `${this.baseUrl}/chat/completions`,
  {
    model: 'deepseek/deepseek-chat-v3-0324',
    messages: [{ role: 'user', content: request.prompt }],
    temperature: 0.1,   // mais determinístico dos 3 providers
    max_tokens: 1500,
  },
  {
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://querylab.app',  // obrigatório pelo OpenRouter
      'X-Title': 'QueryLab'                     // obrigatório pelo OpenRouter
    },
    timeout: 90000 // 90s de timeout HTTP
  }
)
```

Substitui Cloudflare Workers AI (SQLCoder-7B-2), eliminando a cascata Gemini→SQLCoder que existia no original.

---

## Parte 6 — Testes e Avaliação

---

### Técnica 28 — Framework de Testes Semânticos Text-to-SQL

**Arquivo:** `backend/scripts/run-semantic-tests.ts` — 576 linhas
**Estava no original?** NÃO | **Sofisticação:** Muito sofisticado

Para cada pergunta do dataset:

1. **Execução do gabarito** — timeout 60s
2. **Geração e execução pela IA** — chama `generateSQLParallel` (os 3 providers)
3. **Re-execução sem LIMIT para comparação justa:**
```typescript
if (iaTemLimit) {
  const sqlSemLimit = removeLimitFromSQL(sqlGerado)
  const execSemLimit = await queryExecService.executeWithTimeout(sqlSemLimit, { timeoutMs: 60000 })
  iaRowCountReal = execSemLimit.rowCount || 0
}
comparison.rowCountMatch = iaRowCountReal === gabaritoRowCount
```
4. **Comparação:** calcula `columnOverlap` e `dataMatchScore`
5. **Veredito:** `determineVerdict`
6. **Rate limiting:** `await delay(50000)` — 50 segundos entre perguntas para não estourar rate limits
7. **Saída:** CSV com separador `;` e JSON com timestamp no nome do arquivo

---

### Técnica 29 — `calcColumnOverlap`: Match Semântico de Colunas de Agregação

**Arquivo:** `backend/scripts/run-semantic-tests.ts`, linhas 104–130
**Estava no original?** NÃO | **Sofisticação:** Sofisticado

```typescript
function calcColumnOverlap(colsIA: string[], colsGabarito: string[], dataGabarito?: Record<string, any>[]): number {
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
```

Match exato case-insensitive + match semântico para agregações: se gabarito tem coluna de agregação (`total_matriculas`) e a IA também tem qualquer coluna de agregação (`qt_matriculas`), conta como match — aliases de COUNT/SUM podem diferir.

---

### Técnica 30 — `calcDataMatchScore`: Comparação com 4 Estratégias

**Arquivo:** `backend/scripts/run-semantic-tests.ts`, linhas 132–209
**Estava no original?** NÃO | **Sofisticação:** Muito sofisticado

| Caso | Estratégia |
|---|---|
| Ambos vazios | Retorna 100 |
| Um vazio | Retorna 0 |
| Ambos com 1 row (agregação) | Match por valor com margem de 5%, busca em qualquer coluna da IA |
| IA usou LIMIT | Verifica se rows da IA são subset válido das rows do gabarito (assinatura: `Object.values().sort().join('\|')`) |
| Sem LIMIT | Recall: quantas rows do gabarito a IA também retornou |

Normalização de valores antes da comparação (`normalizeValue`): lowercase, trim, normalização de números (`"3.00"` → `"3"`).

---

### Técnica 31 — `determineVerdict`: 5 Categorias de Veredito

**Arquivo:** `backend/scripts/run-semantic-tests.ts`, linhas 218–239
**Estava no original?** NÃO | **Sofisticação:** Sofisticado

```typescript
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
  if (score >= 80 && rowMatch) return 'CORRETO'  // para agregação (1 row)
  if (score >= 40 || (colOverlap >= 50 && (result.rowCountDiff || 999) <= 5)) return 'PARCIAL'
  return 'INCORRETO'
}
```

As 5 categorias:
- `ERRO_GABARITO` — SQL de referência falhou
- `ERRO_IA` — IA não gerou SQL ou execução falhou
- `CORRETO` — dataMatch ≥ 80% + colOverlap ≥ 60% + (rowMatch exato OU usou LIMIT)
- `PARCIAL` — dataMatch ≥ 40% OU (colOverlap ≥ 50% E diferença de rowCount ≤ 5)
- `INCORRETO` — demais casos

---

### Técnica 32 — Dataset de 30 Perguntas Gabaritadas por Dificuldade

**Arquivo:** `backend/scripts/perguntas_text_to_sql.json`
**Estava no original?** NÃO | **Sofisticação:** Muito sofisticado

| Dificuldade | Perguntas | Características |
|---|---|---|
| `facil` | P1–P7 (7) | Query em 1 tabela, filtros simples, COUNT básico |
| `medio` | P8–P15 (8) | JOINs temporais, agregações por grupo, filtros compostos |
| `dificil` | P16–P23 (8) | Subqueries correlacionadas, múltiplos JOINs, taxa de concorrência, IDHM, cotas, IGC |
| `ambiguo` | P24–P30 (7) | "Qual a melhor universidade?", "Vale a pena faculdade particular?", "Cursos EAD são piores?" — com interpretação técnica mais razoável |

---

## Parte 7 — Frontend

---

### Técnica 33 — Diagrama ER Interativo com React Flow, Clusters e Layout Automático

**Arquivo:** `frontend/src/components/SchemaERDiagram.tsx` — 333 linhas
**Estava no original?** SIM com modificações | **Sofisticação:** Sofisticado

**Sistema de Clusters por padrão de nome de tabela:**

| Cluster | Cor | Prefixo de tabelas |
|---|---|---|
| `censo` | `#6366f1` (índigo) | `censo_*` |
| `avaliacoes` | `#0ea5e9` (azul) | `dados_*`, `igc_*`, `microdados_*`, `ind_*` |
| `capes` | `#8b5cf6` (violeta) | `capes_*` |
| `geografico` | `#10b981` (verde) | `municipios_`, `microregioes_`, `mesoregioes_`, `uf_`, `regioes_`, `idhm`, `pibs_`, `ibge_`, `variaveis_pib_` |
| `outros` | `#f59e0b` (âmbar) | qualquer tabela não classificada |

**Layout em 2 colunas:** censo/geográfico na col 0, avaliações/CAPES na col 1.

**Altura dinâmica dos nós:** `Math.min(44 + colCount * 22, 380)` — proporcional ao número de colunas da tabela.

**Nó customizado `TableNode`:** cabeçalho colorido com nome e contagem de colunas, corpo com scroll listando colunas com tipo de dado. Colunas numéricas: badge azul. Colunas texto: badge verde.

**Nó de label `GroupLabelNode`:** label de cluster com borda pontilhada na cor do cluster.

**13 arestas FK:** hardcoded com `MarkerType.ArrowClosed`, linha tracejada `strokeDasharray: '5 3'`, label com nome da FK.

**Configurações React Flow:** `minZoom: 0.03`, `maxZoom: 2`, `fitView` com `padding: 0.1`. MiniMap colorido por cluster. Dados carregados em tempo real de `/api/schema/discover`.

---

### Técnica 34 — Dicionário de Negócio com Accordion Animado

**Arquivo:** `frontend/src/components/DataDictionary.tsx` e `frontend/src/lib/business-dictionary.ts`
**Estava no original?** NÃO | **Sofisticação:** Moderado

**`business-dictionary.ts`:** Array de 9 categorias com ícones Lucide, lista de métricas e exemplo de pergunta real:
- Instituições de Ensino (IES)
- Cursos de Graduação e Pós
- Perfil dos Alunos & Financiamento
- Trajetória e Taxas de Sucesso
- Corpo Docente
- Pós-Graduação CAPES
- Qualidade de Graduação (INEP)
- Opinião do Aluno & Infraestrutura
- Geografia e Socioeconomia (IBGE)

**`DataDictionary.tsx`:** Accordion com estado `openCard` (um card aberto por vez). Animação via Tailwind CSS:
```
grid-rows-[1fr] opacity-100  ↔  grid-rows-[0fr] opacity-0
transition-all duration-300
```
Card ativo recebe `ring-2 ring-indigo-500`. Grid 2 colunas em desktop (`lg:grid-cols-2`).

---

## Tabela Resumo Completa

| # | Técnica | Original | Sofisticação |
|---|---|---|---|
| 1 | Prompt unificado com Chain of Thought | NÃO | Muito sofisticado |
| 2 | 8 Regras de Ouro especializadas INEP | Parcial | Muito sofisticado |
| 3 | 8 Anti-padrões ERRADO/CORRETO/CONSEQUÊNCIA | NÃO | Muito sofisticado |
| 4 | Few-Shot Dinâmico (pool de 14, seleção por keyword) | NÃO | Sofisticado |
| 5 | Dicionário de Colunas (~50 entradas com enums/warnings) | NÃO | Muito sofisticado |
| 6 | Formatação schema com prefixo inep/cesta | NÃO | Moderado |
| 7 | Seção de Relacionamentos FK no prompt | Parcial | Moderado |
| 8 | Contexto de Conversa Multi-Turno | SIM | Moderado |
| 9 | Pipeline de Validação em 8 etapas | Parcial | Sofisticado |
| 10 | Auto-Correção de Alucinações hardcoded | NÃO | Moderado |
| 11 | Enforcement de JOINs Temporais (regex stateful) | NÃO | Muito sofisticado |
| 12 | Fuzzy Matching com Levenshtein O(n×m) | NÃO (bug) | Muito sofisticado |
| 13 | Classificação de Erros PostgreSQL (7 categorias) | NÃO | Sofisticado |
| 14 | Auto-Correção Multi-Round (2 rounds por provider) | NÃO | Muito sofisticado |
| 15 | Proteção com LIMIT Dinâmico | SIM | Moderado |
| 16 | Hierarquia 3 camadas de seleção de schema | NÃO | Muito sofisticado |
| 17 | SmartSchemaReducer com Scoring Multi-Critério | SIM | Sofisticado |
| 18 | Grafo FK + Expansão BFS | SIM | Sofisticado |
| 19 | Tabelas Core Garantidas | SIM | Moderado |
| 20 | RAG com pgvector + Gemini Embeddings 3072d | NÃO | Muito sofisticado |
| 21 | `reduceSchemaFromSeed`: integração RAG → SmartSchemaReducer | NÃO | Sofisticado |
| 22 | Timeout Dinâmico por Complexidade SQL | NÃO | Moderado |
| 23 | Execução com `Promise.race` + Retry com Backoff | SIM | Moderado |
| 24 | Paralelismo 3 providers + Loop de Execução | Parcial | Sofisticado |
| 25 | GeminiService com Fallback entre Modelos | SIM | Moderado |
| 26 | GroqService com `max_tokens` Reduzido | SIM | Simples |
| 27 | OpenRouterService com DeepSeek-V3 | NÃO | Simples |
| 28 | Framework de Testes Semânticos (576 linhas) | NÃO | Muito sofisticado |
| 29 | Match Semântico de Colunas de Agregação | NÃO | Sofisticado |
| 30 | Comparação de Dados com 4 Estratégias (subset/recall) | NÃO | Muito sofisticado |
| 31 | 5 Categorias de Veredito | NÃO | Sofisticado |
| 32 | Dataset de 30 Perguntas Gabaritadas por Dificuldade | NÃO | Muito sofisticado |
| 33 | Diagrama ER com Clusters e Layout Automático | Parcial | Sofisticado |
| 34 | Dicionário de Negócio com Accordion Animado | NÃO | Moderado |

---

## Contagem Final

**Total de técnicas documentadas:** 34

| Presença no original | Quantidade |
|---|---|
| NÃO estava no original | 23 |
| Parcialmente presente | 4 |
| SIM, igual ao original | 7 |

| Nível de sofisticação | Quantidade |
|---|---|
| Muito sofisticado | 12 |
| Sofisticado | 12 |
| Moderado | 8 |
| Simples | 2 |

---

## Arquivos-Chave

| Arquivo | Linhas | Papel |
|---|---|---|
| `backend/src/services/sql-generation-service.ts` | 2076 | Núcleo de toda a lógica de geração, validação e correção SQL |
| `backend/src/services/smart-schema-reducer.ts` | 498 | Redução de schema por scoring + grafo FK + BFS |
| `backend/src/services/schema-embedding-service.ts` | 61 | RAG com pgvector — busca semântica |
| `backend/src/services/query-execution-service.ts` | 268 | Execução com timeout dinâmico e retry |
| `backend/src/services/gemini-service.ts` | 221 | Provider Gemini com fallback interno entre modelos |
| `backend/src/services/groq-service.ts` | 280 | Provider Groq com max_tokens 500 |
| `backend/src/services/openrouter-service.ts` | 80 | Provider DeepSeek-V3 via OpenRouter |
| `backend/scripts/run-semantic-tests.ts` | 576 | Framework de avaliação semântica |
| `backend/scripts/index-schema-embeddings.ts` | 176 | Pipeline de indexação RAG |
| `backend/scripts/perguntas_text_to_sql.json` | — | 30 perguntas com gabaritos SQL por dificuldade |
| `frontend/src/components/SchemaERDiagram.tsx` | 333 | Diagrama ER interativo com React Flow |
| `frontend/src/components/DataDictionary.tsx` | — | Dicionário de negócio com accordion animado |
| `frontend/src/lib/business-dictionary.ts` | — | 9 categorias de dados com exemplos de perguntas |
| `backend/prisma/schema.prisma` | — | Modelo de dados com suporte a pgvector |
