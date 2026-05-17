# QueryLab — Contexto do Sistema (Text-to-SQL INEP)

## Visão Geral

O **QueryLab** é um sistema text-to-SQL que converte perguntas em português para consultas SQL executadas em um banco de dados educacional do **INEP** (Instituto Nacional de Estudos e Pesquisas Educacionais, Brasil).

**Stack técnica:**
- Backend: Node.js / TypeScript / Express
- Banco de dados de aplicação: PostgreSQL + Prisma
- Banco de dados analítico: PostgreSQL (schema `inep` + `cesta`)
- Comunicação em tempo real: Socket.IO

---

## Pipeline Completo

```
Pergunta (PT-BR)
    ↓
Classificação da intenção (Gemini-2.5-flash-lite)
  → SQL_QUERY | SCHEMA_INFO | GENERAL_CONVERSATION
    ↓ (se SQL_QUERY)
Redução semântica do schema (SmartSchemaReducer)
  → Seleciona tabelas relevantes com base em palavras-chave da pergunta
  → Garante tabelas core: censo_ies, censo_cursos, censo_curso_vagas_bruto, emec_instituicoes + cadeia geográfica
    ↓
Geração SQL em paralelo por 4 provedores de IA
  → Gemini (gemini-2.5-flash-lite) — principal
  → Groq (llama-3.3-70b-versatile)
  → Cloudflare Workers AI (sqlcoder-7b-2 / defog)
  → OpenRouter (openrouter/auto → deepseek/deepseek-chat)
    ↓
Validação e sanitização do SQL gerado
  → Correção de typos hardcoded (co_curso → cod_curso, etc.)
  → Validação de sintaxe (bloqueia INSERT/UPDATE/DELETE/DROP)
  → Validação de nomes de colunas (Levenshtein fuzzy match)
  → Correção de prefixos de schema (inep.* vs cesta.*)
  → Adição de LIMIT automático
    ↓
Auto-correção (1 retry se falhar na execução)
  → Envia o erro do banco + SQL com falha de volta para a IA
    ↓
Execução no PostgreSQL (timeout dinâmico, 2 retries)
    ↓
Melhor resultado selecionado
  → Critério: SQL executou com sucesso E retornou dados (rowCount > 0)
    ↓
Geração de explicação em linguagem natural (Groq ou Gemini)
    ↓
Resposta ao usuário (REST + WebSocket)
```

---

## Banco de Dados INEP

### Schemas disponíveis
- **`inep`** — dados educacionais (tabelas principais)
- **`cesta`** — dados geográficos e socioeconômicos IBGE

---

### Tabelas Principais

#### `inep.censo_ies` — Cadastro das Instituições de Ensino Superior
Uso: dados institucionais, filtro por capital, categoria administrativa, organização acadêmica.
```
cod_ies (int, PK)        — código da IES (usar para JOIN com censo_cursos)
nome_ies (varchar)       — nome completo da IES
sigla_ies (varchar)
cod_mantenedora (int)
id_categoria_administrativa (int)  — 1=Pública Federal, 2=Pública Estadual, 3=Municipal, 4=Privada c/lucro, 5=Privada s/lucro
id_organizacao_academica (int)     — 1=Universidade, 2=Centro Universitário, 3=Faculdade, 4=Instituto Federal
cod_municipio (character)          — FK para municipios_ibge.cod_ibge
in_capital (int2)                  — 1=Capital, 0=Interior
```
⚠️ ESTA tabela usa `cod_ies`. `co_ies` NÃO existe aqui.

---

#### `inep.emec_instituicoes` — Dados de contato das IES (via e-MEC)
Uso: SOMENTE para dados de contato (telefone, email, site, cnpj) ou indicadores CI/IGC.
```
co_ies (int)             — código da IES (usar para JOIN com censo_cursos.cod_ies)
no_ies (varchar)
sg_ies (varchar)
cnpj (varchar)
telefone (varchar)
site (varchar)
email (varchar)
endereco (varchar)
no_municipio (varchar)
sg_uf (varchar)
ci (int), ano_ci (int)
ci_ead (int), ano_ci_ead (int)
igc (int), ano_igc (int)
```
⚠️ NÃO tem: `in_capital`, `cod_municipio` (numérico), `id_categoria_administrativa`.
⚠️ Esta tabela usa `co_ies`. `cod_ies` NÃO existe aqui.
⚠️ Join com cursos: `emec_instituicoes.co_ies = censo_cursos.cod_ies`

---

#### `inep.censo_cursos` — Dicionário de cursos (sem série temporal)
Uso: nome do curso, código, modalidade, grau acadêmico. NÃO tem matrículas nem ano de censo.
```
cod_curso (int, PK)
nome_curso (varchar)
cod_ies (int)            — FK para censo_ies.cod_ies
cod_municipio (character)
id_grau_academico (int2)       — grau acadêmico
id_modalidade_ensino (int2)    — 1=Presencial, 2=EAD
id_nivel_academico (int2)
id_atributo_ingresso (int2)
dt_inicio_funcionamento (date)
cod_area (int)
turno_curso (character)
cc_ano (int2), cc_faixa (int2)
cod_cine_rotulo (character)
```
❌ NÃO contém: `qt_mat`, `nu_ano_censo`, `qt_vg_total_ead` (use `censo_curso_vagas_bruto`)

---

#### `inep.censo_curso_vagas_bruto` — Fatos por ano (matrículas, vagas, ingressantes)
Uso: dados históricos por ano (série temporal). Tabela de fatos principal.
```
nu_ano_censo (int)       — ano do censo (ex: 2023, 2022...)
co_ies (int)             — código da IES
co_curso (int)           — código do curso
no_regiao (varchar), co_regiao (int)
no_uf (varchar), sg_uf (varchar), co_uf (int)
no_municipio (varchar), co_municipio (int)
in_capital (int)
tp_organizacao_academica (int), tp_categoria_administrativa (int)
tp_modalidade_ensino (int)   — 1=Presencial, 2=EAD
qt_mat (int)             — matrículas totais
qt_mat_fem, qt_mat_masc  — matrículas por sexo
qt_mat_0_17 ... qt_mat_60_mais  — matrículas por faixa etária
qt_mat_branca, qt_mat_preta, qt_mat_parda, qt_mat_amarela, qt_mat_indigena  — por raça
qt_ing (int)             — ingressantes
qt_vg_total (int)        — vagas totais
qt_vg_total_ead (int)    — vagas EAD
qt_conc (int)            — concluintes
qt_mat_financ (int), qt_mat_fies, qt_mat_prounii, qt_mat_prounip  — financiamento
qt_mat_reserva_vaga (int)
qt_sit_trancada, qt_sit_desvinculado, qt_sit_transferido, qt_sit_falecido
(+ ~150 colunas adicionais de desagregação)
```
⚠️ Usar `censo_curso_vagas_bruto` para qualquer dado com dimensão temporal.

---

#### `inep.dados_cpc` — Conceito Preliminar de Curso
```
id, ano, co_ies, co_curso
cpc_continuo (numeric), cpc_faixa (int)
enade_continuo (numeric)
nb_idd, np_idd (IDD contínuo/padronizado)
nb_mestres, np_mestres, nb_doutores, np_doutores
nb_org_did_pedag, nb_infra_fisica, nb_ampliacao_formacao, nb_regime_trab
```

#### `inep.dados_enade` — Resultado do ENADE
```
id, ano, co_ies, co_curso
enade_continuo (numeric), enade_faixa (varchar)
n_bruta_fg, n_padronizada_fg  — formação geral
n_bruta_ce, n_padronizada_ce  — componente específico
```

#### `inep.dados_igc` — Índice Geral de Cursos da Instituição
```
id, ano, co_ies
igc_continuo (numeric), igc_faixa (int)
conc_med_graduacao, conc_med_mestrado, conc_med_doutorado
n_cursos_cpc_trienio (int)
```

---

### Tabelas Geográficas (Schema `cesta`)

#### `cesta.uf_ibge` — Estados
```
co_uf_ibge (character, PK)    — código do estado (CHAVE — NÃO é "uf_ibge" ou "cod_uf")
nu_uf_ibge (int2)
no_uf_ibge (varchar)          — nome do estado (NÃO é "nome_uf" ou "sigla_uf")
co_regiao_ibge (int2)         — FK para regioes_ibge
nu_latitude, nu_longitude
```

#### `inep.regioes_ibge` — Regiões do Brasil
```
cod_regiao_ibge (int2, PK)
descr_regiao_ibge (varchar)   — "Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"
sigla_regiao_ibge (character)
```

#### `inep.municipios_ibge` — Municípios
```
cod_ibge (character, PK)      — código IBGE do município (FK de censo_ies.cod_municipio)
cod_municipio (character)
nome_municipio (varchar)
cod_microregiao_ibge (character)
populacao (int)
latitude, longitude
```

#### `inep.microregioes_ibge`
```
cod_microregiao_ibge (character, PK)
nome_microregiao_ibge (varchar)
cod_mesoregiao_ibge (character)
```

#### `inep.mesoregioes_ibge`
```
cod_mesoregiao_ibge (character, PK)
nome_mesoregiao_ibge (varchar)
cod_uf_ibge (character)       — FK para cesta.uf_ibge.co_uf_ibge
```

---

## Cadeia de Joins Geográficos (OBRIGATÓRIO)

Para qualquer pergunta envolvendo região, estado ou localização, a cadeia DEVE seguir esta ordem exata:

```sql
FROM inep.censo_ies c
JOIN inep.municipios_ibge m   ON c.cod_municipio = m.cod_ibge
JOIN inep.microregioes_ibge mi ON m.cod_microregiao_ibge = mi.cod_microregiao_ibge
JOIN inep.mesoregioes_ibge me  ON mi.cod_mesoregiao_ibge = me.cod_mesoregiao_ibge
JOIN cesta.uf_ibge u           ON me.cod_uf_ibge = u.co_uf_ibge
JOIN inep.regioes_ibge r       ON u.co_regiao_ibge = r.cod_regiao_ibge
```

---

## Regras Críticas de Geração SQL

### Prefixos de schema (FIXO)
- Tabelas em `inep`: `censo_ies`, `censo_cursos`, `censo_curso_vagas_bruto`, `emec_instituicoes`, `dados_cpc`, `dados_enade`, `dados_igc`, `municipios_ibge`, `microregioes_ibge`, `mesoregioes_ibge`, `regioes_ibge`, `capes_*`, `fluxo_tda`
- Tabelas em `cesta`: `uf_ibge`, `idhms`, `pibs_per_capita`, `variaveis_pib_municipios_ibge`, `ibge_demografia_*`

### Erros comuns de alucinação (NÃO fazer)
| Errado | Correto |
|--------|---------|
| `censo_ies.co_ies` | `censo_ies.cod_ies` |
| `emec_instituicoes.cod_ies` | `emec_instituicoes.co_ies` |
| `uf_ibge.nome_uf` | `uf_ibge.no_uf_ibge` |
| `uf_ibge.uf_ibge` | `uf_ibge.co_uf_ibge` (PK) |
| `municipios_ibge.cod_uf_ibge` | Não existe — vá pela cadeia completa |
| `censo_ies.cod_categoria_administrativa` | `censo_ies.id_categoria_administrativa` |
| `censo_cursos.qt_mat` | Não existe — use `censo_curso_vagas_bruto.qt_mat` |
| `censo_cursos.nu_ano_censo` | Não existe — use `censo_curso_vagas_bruto.nu_ano_censo` |
| `inep.uf_ibge` | `cesta.uf_ibge` |

### Typos corrigidos automaticamente pelo sistema
O sistema tem correção automática de alguns typos frequentes:
- `co_curso` → `cod_curso`
- `co_municipio` → `cod_municipio`
- `nome_uf` → `no_uf_ibge`
- `u.uf_ibge` → `u.co_uf_ibge` (em contexto de JOIN)

---

## Provedores de IA Utilizados

| Provedor | Modelo | Temperatura | Uso |
|----------|--------|-------------|-----|
| Gemini | gemini-2.5-flash-lite | 0.3 | SQL principal + classificação + explicações |
| Groq | llama-3.3-70b-versatile | 0.3 | SQL paralelo + resumos + explicações de erro |
| Cloudflare | sqlcoder-7b-2 (defog) | 0.1 | SQL especializado |
| OpenRouter | openrouter/auto (deepseek) | 0.1 | SQL paralelo (fallback) |

---

## Prompt de Geração SQL (estrutura)

```
1. Papel: "Engenheiro de Dados Sênior especialista em PostgreSQL e dados do INEP"
2. Contexto da conversa (histórico de mensagens)
3. Pergunta atual
4. Schema reduzido (tabelas relevantes + dicionário de colunas semântico)
5. Regras de Ouro (6 regras: seleção de tabela, cadeia geográfica, restrições de colunas, 
   prefixos de schema, performance/LIMIT, cursos dicionário vs fatos)
6. Exemplos few-shot dinâmicos (2 exemplos selecionados por keyword matching)
7. Chain of Thought: pensar passo a passo → listar colunas → gerar SQL em bloco ```sql
```

---

## Validação Pós-Geração

O SQL gerado passa por um pipeline de validação antes da execução:
1. Correção de typos hardcoded (regex)
2. Validação de sintaxe básica (deve ser SELECT ou WITH)
3. Bloqueio de comandos perigosos (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE)
4. Validação de nomes de colunas com fuzzy matching (Levenshtein ≤ 3)
5. Correção de prefixos de schema
6. Adição automática de LIMIT (25/50/100 baseado em complexidade)
7. Bloqueio de comandos SQL injection (xp_cmdshell, openrowset, etc.)

Se a execução falhar, uma segunda tentativa é feita com o erro retornado pelo banco incluído no prompt.

---

## Problemas Conhecidos

- As IAs alucinam nomes de colunas que não existem no schema (ex: `co_ies` na `censo_ies`, `qt_mat` na `censo_cursos`)
- A `SmartSchemaReducer` pode omitir tabelas relevantes em perguntas ambíguas ou com múltiplos domínios
- O `sqlcoder-7b-2` (Cloudflare) tem desempenho inferior em queries com 3+ JOINs
- Queries com a cadeia geográfica completa são frequentemente geradas com joins incorretos ou colunas FK erradas
- A `censo_cursos` e `censo_curso_vagas_bruto` são frequentemente confundidas: a IA usa colunas de fatos (`qt_mat`, `nu_ano_censo`) na tabela de dicionário
- As PKs/FKs entre `censo_ies` (`cod_ies`) e `emec_instituicoes` (`co_ies`) têm nomes diferentes, causando JOINs errados
- A `uf_ibge` fica no schema `cesta` (não `inep`), mas as IAs frequentemente geram `inep.uf_ibge`

---

## Testes e Avaliação

O sistema tem um framework de testes semânticos em `backend/scripts/run-semantic-tests.ts` com ~25 perguntas de referência em `backend/scripts/perguntas_text_to_sql.json` (fácil/médio/difícil). Os resultados são avaliados por:
- Execução com sucesso (SQL válido)
- Correspondência de linhas retornadas
- Overlap de colunas
- Similaridade dos dados com gabarito

Resultados: `backend/data/test-results-csvs/`
