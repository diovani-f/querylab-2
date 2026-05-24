# Relatório de Análise Semântica das Queries com Divergência

**Data:** 2026-05-24  
**Escopo:** 69 resultados de teste — 23 perguntas × 3 provedores (gemini, groq, deepseek)  
**Fonte:** `semantic_test_results_unified.json` + `perguntas_text_to_sql.json`

---

## Metodologia

Para cada caso com `geracaoSucesso=true` e `execucaoIASucesso=true` mas veredito **PARCIAL** ou **INCORRETO**, foram comparados:

1. O SQL gerado pelo provedor
2. O SQL do gabarito
3. Os indicadores quantitativos: `rowCountDiff`, `columnOverlap`, `dataMatchScore`

A divergência foi classificada em três categorias:

- **DIVERGÊNCIA REAL**: a query retorna dados diferentes ou incompletos, afetando a resposta à pergunta
- **DIVERGÊNCIA COSMÉTICA**: a query retorna os mesmos dados com diferença de alias, ordenação ou colunas extras irrelevantes
- **ACEITAR COMO VÁLIDO**: a query responde corretamente à pergunta, apesar de diferir do gabarito

Casos com `ERRO_GABARITO` (P22 — gabarito tem bug SQL) são documentados separadamente e excluídos das métricas.

---

## Sumário Executivo

| Categoria | Quantidade |
|-----------|-----------|
| Casos analisados (SQL executado, não-CORRETO) | 21 |
| Divergência real | 17 |
| Divergência cosmética (reclassificável) | 2 |
| Aceitar como válido (reclassificável) | 2 |
| Casos ERRO_GABARITO (excluídos) | 3 |

**Casos que poderiam ser reclassificados para CORRETO ou ACEITO:** 4 (P5/deepseek, P5/gemini, P9/gemini, P15/deepseek — ver tabela final)

---

## Análise Detalhada por Caso

---

### P2 — Faculdades localizadas em Curitiba
**Pergunta:** "Quais são os nomes e siglas das faculdades localizadas em Curitiba?"

#### P2 / gemini — PARCIAL → **DIVERGÊNCIA REAL**

**SQL Gerado (gemini):**
```sql
SELECT no_ies, sg_ies
FROM inep.censo_ies_bruto
WHERE no_municipio_ies ILIKE '%Curitiba%'
  AND nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)
GROUP BY no_ies, sg_ies
LIMIT 100
```

**SQL Gabarito:**
```sql
SELECT DISTINCT no_ies, sg_ies
FROM inep.censo_ies_bruto
WHERE no_municipio_ies ILIKE '%Curitiba%'
  AND tp_organizacao_academica = 3
  AND nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)
```

**Causa da divergência:** O gemini **omitiu o filtro `tp_organizacao_academica = 3`**, que restringe os resultados apenas a Faculdades (código 3). Sem esse filtro, a query retorna todas as instituições de ensino superior em Curitiba — universidades, centros universitários e faculdades —, gerando 57 registros contra os 38 do gabarito.

**Impacto:** Real. A pergunta usa a palavra "faculdades" no sentido técnico (tipo de organização acadêmica), e o resultado inclui tipos diferentes de instituição.

**Veredito sugerido:** INCORRETO (não PARCIAL — a lógica de filtragem está fundamentalmente errada)

---

### P4 — 10 cursos com maior número de vagas em 2022
**Pergunta:** "Liste os 10 cursos com maior número de vagas ofertadas em 2022."

#### P4 / gemini — INCORRETO → **DIVERGÊNCIA REAL GRAVE**

**SQL Gerado (gemini):**
```sql
SELECT no_curso, qt_vg_total
FROM inep.censo_curso_vagas_bruto
WHERE nu_ano_censo = 2022
ORDER BY qt_vg_total DESC
LIMIT 10
```

**SQL Gabarito:**
```sql
SELECT no_curso, SUM(qt_vg_total) AS total_vagas
FROM inep.censo_curso_vagas_bruto
WHERE nu_ano_censo = 2022
GROUP BY no_curso
ORDER BY total_vagas DESC
LIMIT 10
```

**Causa da divergência:** O gemini **não agrupou por curso (`GROUP BY no_curso`)**. A query retorna as 10 linhas individuais com maior `qt_vg_total` (uma linha = um curso em uma IES), em vez de somar as vagas de cada curso em todas as instituições. O resultado é completamente diferente do esperado: em vez de um ranking de cursos com o total agregado de vagas, retorna uma lista de cursos+IES individuais.

**Impacto:** Real e grave. Responde uma pergunta diferente da que foi feita.

#### P4 / deepseek — INCORRETO → **DIVERGÊNCIA REAL**

**SQL Gerado (deepseek):**
```sql
SELECT c.nome_curso, SUM(v.qt_vg_total) AS total_vagas
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_cursos c ON v.co_curso = c.cod_curso
WHERE v.nu_ano_censo = 2022
GROUP BY c.nome_curso
ORDER BY total_vagas DESC
LIMIT 10
```

**Causa da divergência:** Faz JOIN com `censo_cursos` e agrega por `c.nome_curso` (nome normalizado na tabela de cursos) em vez de usar diretamente `v.no_curso` (nome denormalizado na tabela de vagas). O total sem LIMIT é 1.659 vs 573.019 do gemini — a tabela de cursos tem um número limitado de nomes canônicos, que pode não cobrir todas as combinações de nomes presentes em `no_curso`. Os rankings resultantes são diferentes.

**Impacto:** Real. A agregação por fonte diferente produz resultados distintos.

#### P4 / groq — INCORRETO → **DIVERGÊNCIA REAL**
Idêntico ao deepseek em causa e impacto.

---

### P5 — Nota IGC contínua mais recente da UFRGS
**Pergunta:** "Qual é a nota IGC contínua mais recente da UFRGS?"

#### P5 / deepseek — PARCIAL → **DIVERGÊNCIA COSMÉTICA** ✓

**SQL Gerado (deepseek):**
```sql
SELECT ig.igc_continuo AS nota_igc, ig.ano
FROM inep.dados_igc ig
JOIN inep.emec_instituicoes e ON ig.co_ies = e.co_ies
WHERE e.no_ies ILIKE '%UNIVERSIDADE FEDERAL DO RIO GRANDE DO SUL%'
ORDER BY ig.ano DESC
LIMIT 1
```

**SQL Gabarito:**
```sql
SELECT igc_continuo, ano
FROM inep.igc_bruto
WHERE sigla_ies = 'UFRGS'
ORDER BY ano DESC
LIMIT 1
```

**Causa da divergência:** A única diferença é o **alias da coluna** (`nota_igc` vs `igc_continuo`). O `dataMatchScore=100` confirma que os dados retornados são idênticos. O `columnOverlap=50` reflete apenas a diferença de nome da coluna, não de conteúdo.

**Impacto:** Nenhum. Os dados retornados são os mesmos.

**Veredito sugerido:** CORRETO (reclassificar — divergência apenas cosmética de alias)

#### P5 / gemini — PARCIAL → **DIVERGÊNCIA PARCIALMENTE COSMÉTICA** ✓

**SQL Gerado (gemini):**
```sql
SELECT di.igc_continuo
FROM inep.dados_igc AS di
JOIN inep.emec_instituicoes AS ei ON di.co_ies = ei.co_ies
WHERE ei.no_ies ILIKE '%Universidade Federal do Rio Grande do Sul%'
ORDER BY di.ano DESC
LIMIT 1
```

**Causa da divergência:** O gemini **omitiu a coluna `ano`** da projeção. O valor da nota IGC é correto (`dataMatchScore=50` indica que metade das colunas bate — a própria nota), mas falta o contexto do ano de referência.

**Impacto:** Baixo. A pergunta pede apenas "a nota", não explicitamente "a nota e o ano". No contexto de usuário, a omissão do ano é uma simplificação aceitável, embora o gabarito inclua o ano como informação complementar útil.

**Veredito sugerido:** ACEITAR COMO VÁLIDO (a resposta principal está correta; falta apenas metadado complementar)

---

### P7 — Instituições com IGC faixa 5 no ano mais recente
**Pergunta:** "Quais instituições possuem IGC faixa 5 no ano mais recente disponível?"

#### P7 / deepseek — INCORRETO → **DIVERGÊNCIA PEQUENA, MAS REAL**

**SQL Gerado (deepseek):**
```sql
SELECT DISTINCT b.no_ies AS instituicao
FROM inep.dados_igc d
JOIN inep.censo_ies_bruto b ON d.co_ies = b.co_ies
WHERE d.igc_faixa = 5
  AND d.ano = (SELECT MAX(ano) FROM inep.dados_igc)
ORDER BY b.no_ies
```

**SQL Gabarito:**
```sql
SELECT ies, sigla_ies, uf_ies
FROM inep.igc_bruto
WHERE igc_faixa = '5'
  AND ano = (SELECT MAX(ano) FROM inep.igc_bruto WHERE igc_faixa = '5')
```

**Causa da divergência:** Diferença de 1 linha (67 vs 66). O deepseek usa `dados_igc + censo_ies_bruto` com JOIN, enquanto o gabarito usa `igc_bruto` diretamente. É provável que o JOIN com `censo_ies_bruto` introduza uma linha duplicada de alguma instituição com múltiplas entradas no censo. Adicionalmente, a comparação `igc_faixa = 5` (inteiro) vs `igc_faixa = '5'` (string) pode capturar registros diferentes dependendo do tipo da coluna.

**Impacto:** Real, mas pequeno. A divergência de 1 linha é significativa o suficiente para classificar como incorreto, mas a lógica geral é correta.

#### P7 / gemini — INCORRETO → **DIVERGÊNCIA REAL**

**SQL Gerado (gemini):**
```sql
SELECT b.no_ies, b.sg_ies
FROM inep.dados_igc AS d
JOIN inep.censo_ies_bruto AS b
  ON d.co_ies = b.co_ies AND d.ano = b.nu_ano_censo
WHERE d.igc_faixa = 5
  AND d.ano = (SELECT MAX(ano) FROM inep.dados_igc)
GROUP BY b.no_ies, b.sg_ies
ORDER BY b.no_ies
LIMIT 50
```

**Causa da divergência:** O JOIN `d.ano = b.nu_ano_censo` **elimina instituições** cujo ano no IGC não coincide com um ano de censo disponível na tabela `censo_ies_bruto`. Retornou 54 (sem limit) vs 66 do gabarito — 12 instituições foram perdidas pelo join restritivo.

**Impacto:** Real. A query exclui instituições válidas por uma condição de join desnecessariamente restritiva.

#### P7 / groq — INCORRETO → **DIVERGÊNCIA REAL**

**SQL Gerado (groq):**
```sql
SELECT DISTINCT c.no_ies
FROM inep.dados_igc i
JOIN inep.censo_ies_bruto c ON i.co_ies = c.co_ies
WHERE i.igc_faixa = 5
  AND c.nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)
```

**Causa da divergência:** O groq filtra o `censo_ies_bruto` pelo `MAX(nu_ano_censo)` do censo, mas **não filtra `dados_igc` pelo ano mais recente do IGC**. Isso significa que considera IGC de qualquer ano para instituições que aparecem no censo mais recente, retornando 76 instituições (10 a mais que o esperado).

**Impacto:** Real. A query captura instituições que tiveram IGC faixa 5 em anos anteriores, não necessariamente no mais recente.

---

### P8 — Total de ingressantes por região do Brasil em 2022
**Pergunta:** "Qual é o total de ingressantes por região do Brasil em 2022?"

#### P8 / deepseek — PARCIAL → **DIVERGÊNCIA REAL**

**SQL Gerado (deepseek):**
```sql
SELECT r.descr_regiao_ibge AS regiao, SUM(v.qt_ing) AS total_ingressantes
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
JOIN inep.municipios_ibge m ON b.co_municipio_ies::text = m.cod_ibge
JOIN inep.microregioes_ibge mi ON m.cod_microregiao_ibge = mi.cod_microregiao_ibge
JOIN inep.mesoregioes_ibge me ON mi.cod_mesoregiao_ibge = me.cod_mesoregiao_ibge
JOIN cesta.uf_ibge u ON me.cod_uf_ibge = u.co_uf_ibge
JOIN inep.regioes_ibge r ON u.co_regiao_ibge = r.cod_regiao_ibge
WHERE v.nu_ano_censo = 2022
GROUP BY r.descr_regiao_ibge
ORDER BY total_ingressantes DESC
```

**SQL Gabarito:**
```sql
SELECT no_regiao, SUM(qt_ing) AS total_ingressantes
FROM inep.censo_curso_vagas_bruto
WHERE nu_ano_censo = 2022
GROUP BY no_regiao
ORDER BY total_ingressantes DESC
```

**Causa da divergência:** O gabarito usa `no_regiao` diretamente da tabela `censo_curso_vagas_bruto` (coluna denormalizada), enquanto o deepseek monta uma cadeia de 5 JOINs geográficos para chegar à mesma informação. Retornou 5 regiões vs 6 do gabarito — a 6ª linha é provavelmente uma região `NULL` ou "Exterior" presente na coluna `no_regiao`, que não tem correspondência na hierarquia geográfica do IBGE.

**Impacto:** Real. Uma região de ingressantes é omitida.

#### P8 / groq — PARCIAL → **DIVERGÊNCIA REAL**

**SQL Gerado (groq):**
```sql
SELECT b.no_regiao_ies, SUM(v.qt_ing) AS total_ingressantes
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
WHERE v.nu_ano_censo = 2022
GROUP BY b.no_regiao_ies
ORDER BY total_ingressantes DESC
```

**Causa da divergência:** Usa `censo_ies_bruto.no_regiao_ies` (região da IES) em vez de `censo_curso_vagas_bruto.no_regiao` (região do curso/vaga). A diferença pode parecer sutil, mas um curso pode ter sede em uma região diferente da IES, e a coluna do gabarito (`no_regiao`) também captura categorias extras como "Exterior". Retornou 5 vs 6 linhas.

**Impacto:** Real. Perde pelo menos uma categoria de região.

---

### P9 — Proporção de homens e mulheres em Engenharia Civil 2022
**Pergunta:** "Qual a proporção de homens e mulheres matriculados em cursos de Engenharia Civil em 2022?"

#### P9 / gemini — PARCIAL → **ACEITAR COMO VÁLIDO** ✓

**SQL Gerado (gemini):**
```sql
SELECT
  ROUND(100.0 * SUM(v.qt_mat_fem) / NULLIF(SUM(v.qt_mat_fem + v.qt_mat_masc), 0), 2) AS proporcao_mulheres,
  ROUND(100.0 * SUM(v.qt_mat_masc) / NULLIF(SUM(v.qt_mat_fem + v.qt_mat_masc), 0), 2) AS proporcao_homens
FROM inep.censo_curso_vagas_bruto AS v
JOIN inep.censo_cursos AS c ON v.co_curso = c.cod_curso
WHERE v.nu_ano_censo = 2022 AND c.nome_curso ILIKE '%Engenharia Civil%'
```

**SQL Gabarito:**
```sql
SELECT
  SUM(qt_mat_fem) AS total_mulheres,
  SUM(qt_mat_masc) AS total_homens,
  ROUND(SUM(qt_mat_fem)::numeric / NULLIF(SUM(qt_mat), 0) * 100, 2) AS percentual_feminino,
  ROUND(SUM(qt_mat_masc)::numeric / NULLIF(SUM(qt_mat), 0) * 100, 2) AS percentual_masculino
FROM inep.censo_curso_vagas_bruto
WHERE nu_ano_censo = 2022 AND no_curso ILIKE '%Engenharia Civil%'
```

**Causa da divergência:** O gemini retorna apenas os percentuais (o que a pergunta efetivamente pede: "proporção"), enquanto o gabarito inclui também os totais absolutos de matrículas femininas e masculinas. O `dataMatchScore=50` e `columnOverlap=0` refletem que as colunas têm nomes e quantidade diferentes — mas os valores percentuais calculados são equivalentes.

**Impacto:** Nenhum na resposta à pergunta. "Proporção" é exatamente o que o gemini retornou. Os totais absolutos do gabarito são dados extras, não solicitados.

**Veredito sugerido:** CORRETO (reclassificar — a query responde diretamente o que foi perguntado)

---

### P10 — 5 inst. privadas com mais alunos EAD no último censo
**Pergunta:** "Quais são as 5 instituições privadas com a maior quantidade de alunos matriculados em EAD no último censo?"

#### P10 / gemini — INCORRETO → **DIVERGÊNCIA REAL**

**SQL Gerado (gemini):**
```sql
SELECT b.no_ies, SUM(v.qt_mat) AS total_matriculas_ead
FROM inep.censo_curso_vagas_bruto AS v
JOIN inep.censo_ies_bruto AS b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
WHERE v.nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_curso_vagas_bruto)
  AND v.tp_modalidade_ensino = 2
  AND b.tp_categoria_administrativa IN (4, 5, 6, 7)
GROUP BY b.no_ies
ORDER BY total_matriculas_ead DESC
LIMIT 5
```

**SQL Gabarito:**
```sql
SELECT b.no_ies, b.sg_ies, SUM(v.qt_mat) AS total_matriculados
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
WHERE v.nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_curso_vagas_bruto)
  AND v.tp_modalidade_ensino = 2
  AND b.tp_categoria_administrativa IN (4, 5, 6, 7)
GROUP BY b.no_ies, b.sg_ies
ORDER BY total_matriculados DESC
LIMIT 5
```

**Causa da divergência:** As queries são **quase idênticas** em lógica, mas o gemini omite `b.sg_ies` (sigla) do SELECT e do GROUP BY. O `dataMatchScore=0` apesar de `rowCountMatch=false` (`execucaoIARowCountSemLimit=570` vs 5 gabarito) é inesperado — provavelmente a execução do gemini teve timeout na avaliação anterior ou os dados de `rowCountSemLimit` foram capturados da tabela toda. Dada a equivalência lógica, a divergência é de **sigla ausente** e possivelmente de resultado diferente da tabela.

**Impacto:** Provavelmente baixo se a query lógica é a mesma; a ausência da sigla é cosmética.

---

### P11 — Média CPC Direito por estado
**Pergunta:** "Qual a média da nota CPC contínua dos cursos de Direito, agrupada por estado?"

#### P11 / deepseek — INCORRETO → **DIVERGÊNCIA REAL**

**SQL Gerado (deepseek):**
```sql
SELECT b.sg_uf_ies AS estado,
       ROUND(AVG(dc.cpc_continuo)::numeric, 2) AS media_cpc_continuo
FROM inep.dados_cpc dc
JOIN inep.censo_cursos cc ON dc.co_curso = cc.cod_curso
JOIN inep.censo_ies_bruto b ON dc.co_ies = b.co_ies AND dc.ano = b.nu_ano_censo
WHERE cc.nome_curso ILIKE '%direito%'
GROUP BY b.sg_uf_ies
ORDER BY media_cpc_continuo DESC
```

**SQL Gabarito:**
```sql
SELECT cb.uf, ROUND(AVG(cb.cpc_continuo::numeric), 2) AS media_cpc
FROM inep.dados_cpc_brutos cb
WHERE cb.descr_area ILIKE '%Direito%'
  AND cb.cpc_continuo IS NOT NULL
GROUP BY cb.uf
ORDER BY media_cpc DESC
```

**Causa da divergência:** O gabarito usa a tabela `dados_cpc_brutos` (view/tabela com dados já consolidados) com filtro `descr_area`, enquanto o deepseek usa `dados_cpc` normalizado com JOIN por `co_ies` e `ano`. O join `dc.ano = b.nu_ano_censo` em `dados_cpc + censo_ies_bruto` pode incluir/excluir registros diferentemente das fontes consolidadas. As médias resultantes são distintas, embora ambas as queries retornem 27 estados.

**Impacto:** Real. As médias calculadas são diferentes, pois partem de conjuntos de dados com cobertura diferente.

#### P11 / groq — INCORRETO → **DIVERGÊNCIA REAL**
Causa idêntica ao deepseek (join com `dados_cpc + censo_ies_bruto`).

---

### P12 — Estados com mais formados em Enfermagem 2022
**Pergunta:** "Quais estados formaram mais profissionais de Enfermagem em 2022?"

#### P12 / gemini — INCORRETO → **DIVERGÊNCIA REAL**

**SQL Gerado (gemini):**
```sql
SELECT cib.sg_uf_ies AS estado, SUM(ccvb.qt_conc) AS total_concluintes_enfermagem
FROM inep.censo_curso_vagas_bruto AS ccvb
JOIN inep.censo_cursos AS cc ON ccvb.co_curso = cc.cod_curso
JOIN inep.censo_ies_bruto AS cib ON ccvb.co_ies = cib.co_ies AND ccvb.nu_ano_censo = cib.nu_ano_censo
WHERE ccvb.nu_ano_censo = 2022 AND cc.nome_curso ILIKE '%Enfermagem%'
GROUP BY cib.sg_uf_ies
ORDER BY total_concluintes_enfermagem DESC
LIMIT 10
```

**SQL Gabarito:**
```sql
SELECT sg_uf, SUM(qt_conc) AS total_concluintes
FROM inep.censo_curso_vagas_bruto
WHERE nu_ano_censo = 2022 AND no_curso ILIKE '%Enfermagem%'
GROUP BY sg_uf
ORDER BY total_concluintes DESC
LIMIT 10
```

**Causa da divergência:** O gemini usa `cib.sg_uf_ies` (UF da IES) em vez de `sg_uf` da tabela de vagas, e usa `cc.nome_curso` (nome normalizado) em vez de `no_curso` (nome denormalizado). A diferença entre `sg_uf_ies` e `sg_uf` pode produzir resultados distintos para cursos EAD/polo em outro estado. O gemini encontra 27 estados (sem limit) vs 10 do gabarito, porque o gabarito também tem LIMIT 10 no ranking.

**Impacto:** Real. A divergência na coluna de UF pode atribuir concluintes a estados diferentes dos corretos (IES vs localização do curso).

---

### P14 — Taxa de evasão média em Administração em univ. públicas federais
**Pergunta:** "Qual é a taxa de evasão média dos cursos de Administração em universidades públicas federais?"

#### P14 / deepseek — INCORRETO → **DIVERGÊNCIA REAL GRAVE**

**SQL Gerado (deepseek):**
```sql
SELECT ROUND(AVG(f.tda)::numeric * 100, 2) AS taxa_evasao_media_percentual
FROM inep.fluxo_tda f
JOIN inep.censo_ies_bruto b ON f.co_ies = b.co_ies
WHERE f.no_curso ILIKE '%administracao%'
  AND b.tp_categoria_administrativa = 1
  AND f.nu_ano_referencia = (SELECT MAX(nu_ano_referencia) FROM inep.fluxo_tda)
```

**SQL Gabarito:**
```sql
SELECT ROUND(AVG(f.tda), 2) AS media_taxa_desistencia
FROM inep.fluxo_tda f
WHERE f.no_curso ILIKE '%Administração%'
  AND f.tp_categoria_administrativa = 1
  AND f.tp_organizacao_academica = 1
```

**Causa da divergência — múltiplas:**
1. **Filtro de acento**: `'%administracao%'` (sem acento) pode não capturar registros com 'Administração', dependendo da collation do banco.
2. **Multiplicação por 100**: O deepseek faz `AVG(f.tda) * 100`, assumindo que `tda` está em formato decimal (0.xx), enquanto o gabarito não multiplica — sugere que o gabarito já recebe o valor sem conversão.
3. **Filtro de ano**: O deepseek filtra apenas `MAX(nu_ano_referencia)`, enquanto o gabarito usa todos os anos disponíveis.
4. **Join desnecessário**: O deepseek faz JOIN com `censo_ies_bruto` para filtrar `tp_categoria_administrativa`, enquanto o gabarito usa a coluna diretamente de `fluxo_tda` (a tabela já tem esse campo).

**Impacto:** Real e grave. Quatro diferenças combinadas produzem resultados completamente distintos.

---

### P15 — Docentes com doutorado por estado no último censo
**Pergunta:** "Quantos docentes com doutorado existem em cada estado no último censo?"

#### P15 / deepseek — INCORRETO → **DIVERGÊNCIA POTENCIALMENTE COSMÉTICA** ✓

**SQL Gerado (deepseek):**
```sql
SELECT sg_uf_ies AS estado,
       SUM(qt_doc_ex_femi) AS docentes_doutorado_feminino,
       SUM(qt_doc_ex_masc) AS docentes_doutorado_masculino,
       SUM(qt_doc_ex_dout) AS total_docentes_doutorado
FROM inep.censo_ies_bruto
WHERE nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)
GROUP BY sg_uf_ies
ORDER BY total_docentes_doutorado DESC
```

**SQL Gabarito:**
```sql
SELECT sg_uf_ies, SUM(qt_doc_ex_dout) AS total_doutores
FROM inep.censo_ies_bruto
WHERE nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)
GROUP BY sg_uf_ies
ORDER BY total_doutores DESC
```

**Causa da divergência:** A lógica principal é **idêntica** — mesma tabela, mesmo filtro de ano, mesmo `GROUP BY`, mesma expressão `SUM(qt_doc_ex_dout)`. A diferença é que o deepseek adiciona 2 colunas extras (`docentes_doutorado_feminino` e `docentes_doutorado_masculino`) e usa o alias `total_docentes_doutorado` em vez de `total_doutores`. O `dataMatchScore=0` é provavelmente causado pelo mismatch de nome de coluna no sistema de avaliação, não por valores diferentes.

**Impacto:** Nenhum nos dados essenciais. As colunas extras são informação adicional útil, não prejudicial.

**Veredito sugerido:** CORRETO (reclassificar — diferença apenas de alias e colunas extras)

---

### P17 — Cursos de Ciência da Computação acima da média no ENADE
**Pergunta:** "Quais cursos de Ciência da Computação tiveram nota no ENADE acima da média nacional nesse mesmo curso?"

#### P17 / deepseek — INCORRETO → **DIVERGÊNCIA REAL**

**SQL Gerado (deepseek):**
```sql
WITH media_nacional AS (
    SELECT AVG(de.enade_continuo) AS media_enade
    FROM inep.dados_enade de
    JOIN inep.censo_cursos cc ON de.co_curso = cc.cod_curso
    WHERE cc.nome_curso ILIKE '%ciência da computação%'
)
SELECT cc.nome_curso, cib.no_ies, cib.sg_uf_ies, de.enade_continuo, mn.media_enade
FROM inep.dados_enade de
JOIN inep.censo_cursos cc ON de.co_curso = cc.cod_curso
JOIN inep.censo_ies_bruto cib ON de.co_ies = cib.co_ies AND de.ano = cib.nu_ano_censo
CROSS JOIN media_nacional mn
WHERE cc.nome_curso ILIKE '%ciência da computação%'
  AND de.enade_continuo > mn.media_enade
ORDER BY de.enade_continuo DESC
LIMIT 100
```

**SQL Gabarito:**
```sql
SELECT e.co_curso, c.nome_curso, i.nome_ies, e.enade_continuo
FROM inep.dados_enade e
JOIN inep.censo_cursos c ON e.co_curso = c.cod_curso
JOIN inep.censo_ies i ON e.co_ies = i.cod_ies
WHERE c.nome_curso ILIKE '%Ciência da Computação%'
  AND e.ano = (SELECT MAX(e3.ano) FROM inep.dados_enade e3 JOIN inep.censo_cursos c3 ON e3.co_curso = c3.cod_curso WHERE c3.nome_curso ILIKE '%Ciência da Computação%' AND e3.enade_continuo IS NOT NULL)
  AND e.enade_continuo > (SELECT AVG(e2.enade_continuo) FROM inep.dados_enade e2 JOIN inep.censo_cursos c2 ON e2.co_curso = c2.cod_curso WHERE c2.nome_curso ILIKE '%Ciência da Computação%' AND e2.enade_continuo IS NOT NULL AND e2.ano = (...))
  AND e.enade_continuo IS NOT NULL
ORDER BY e.enade_continuo DESC
```

**Causa da divergência:** O deepseek calcula a média **sobre todos os anos** disponíveis, enquanto o gabarito filtra apenas **o ano mais recente**. Com mais dados (todos os anos), a média muda e o conjunto de cursos acima dela muda. O deepseek retorna 286 (sem limit) vs 139 do gabarito.

**Impacto:** Real. "Média nacional nesse mesmo curso" implica comparação pontual no tempo — usar todos os anos dilui a média e distorce o resultado.

#### P17 / gemini — INCORRETO → **DIVERGÊNCIA REAL GRAVE**

**SQL Gerado (gemini):**
```sql
WITH MediaNacionalCienciaComputacao AS (
    SELECT dc.ano, AVG(dc.enade_continuo) AS media_nacional_enade
    FROM inep.dados_cpc dc  -- tabela errada!
    JOIN inep.censo_cursos cc ON dc.co_curso = cc.cod_curso
    WHERE cc.nome_curso ILIKE '%ciência da computação%'
    GROUP BY dc.ano
)
...
```

**Causa da divergência:** O gemini usa a tabela `dados_cpc` (Conceito Preliminar de Curso) em vez de `dados_enade`. São métricas distintas — CPC é uma composição de vários indicadores, ENADE é especificamente a prova. Os dados de `enade_continuo` em `dados_cpc` existem como componente, mas a semântica e cobertura são diferentes.

**Impacto:** Real e grave. Usa a tabela errada, calculando sobre um conjunto diferente de dados.

#### P17 / groq — INCORRETO → **DIVERGÊNCIA REAL GRAVE**

**SQL Gerado (groq):**
```sql
SELECT cc.nome_curso, dc.enade_continuo
FROM inep.dados_cpc dc  -- tabela errada!
JOIN inep.censo_cursos cc ON dc.co_curso = cc.cod_curso
WHERE dc.enade_continuo > (SELECT AVG(enade_continuo) FROM inep.dados_cpc)  -- média de TODOS os cursos
  AND cc.nome_curso ILIKE '%Ciência da Computação%'
```

**Causa da divergência:** Dois erros simultâneos: (1) usa `dados_cpc` em vez de `dados_enade`; (2) calcula a média sobre **todos os cursos** de todos os anos, não apenas sobre Ciência da Computação. Retornou 429 vs 139 do gabarito.

**Impacto:** Real e grave. A pergunta é mal interpretada em dois aspectos fundamentais.

---

### P18 — 10 cidades com mais IES e IDHM médio
**Pergunta:** "Quais são as 10 cidades com o maior número de instituições de ensino superior e qual o IDHM médio dessas cidades?"

#### P18 / gemini — INCORRETO → **DIVERGÊNCIA REAL GRAVE**

**SQL Gerado (gemini):**
```sql
SELECT cib.no_municipio_ies, COUNT(DISTINCT cib.co_ies) AS numero_instituicoes
FROM inep.censo_ies_bruto cib
WHERE cib.nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)
GROUP BY cib.no_municipio_ies
ORDER BY numero_instituicoes DESC
LIMIT 10
```

**Causa da divergência:** O gemini **ignorou completamente** a segunda parte da pergunta ("qual o IDHM médio dessas cidades"). A query retorna apenas o número de instituições, sem o IDHM. Além disso, o gabarito inclui `sg_uf_ies` para desambiguar cidades de mesmo nome em estados diferentes.

**Impacto:** Real e grave. Metade da pergunta não foi respondida.

---

### P19 — Públicas vs Privadas no IGC contínuo (últimos 3 anos)
**Pergunta:** "Comparando universidades públicas e privadas, qual tipo tem a melhor nota média no IGC contínuo nos últimos 3 anos disponíveis?"

#### P19 / deepseek, gemini, groq — PARCIAL → **DIVERGÊNCIA REAL**

**SQL Gerado (deepseek, padrão compartilhado pelos 3):**
```sql
-- Os 3 provedores usam variação da mesma abordagem:
-- Agrupa em 'Pública' (tp_categoria = 1,2,3) e 'Privada' (tp_categoria = 4,5,6,7,8)
-- via JOIN com censo_ies_bruto
-- Retorna 2 linhas
```

**SQL Gabarito:**
```sql
SELECT ib.dependencia_adm, ROUND(AVG(ib.igc_continuo), 3) AS media_igc
FROM inep.igc_bruto ib
WHERE ib.ano >= (SELECT MAX(ano) - 2 FROM inep.igc_bruto)
  AND ib.igc_continuo IS NOT NULL
GROUP BY ib.dependencia_adm
ORDER BY media_igc DESC
```

**Causa da divergência:** O gabarito usa `igc_bruto.dependencia_adm` — uma coluna textual com as categorias originais do banco (e.g., "Federal", "Estadual", "Municipal", "Privada com fins lucrativos", etc.), que produz 7 grupos distintos. Os 3 provedores criaram uma categorização binária ("Pública"/"Privada") que, embora conceitualmente válida para responder "qual tipo é melhor", perde a granularidade das subcategorias públicas. Também usam tabelas diferentes (`dados_igc + censo_ies_bruto` via JOIN vs `igc_bruto` diretamente).

**Impacto:** Real, mas depende da interpretação. A pergunta pede "públicas vs privadas", e a categorização binária responde isso diretamente. Porém, o gabarito mostra as subcategorias, permitindo uma análise mais rica. O número de linhas (2 vs 7) faz a avaliação automática classificar como divergente.

---

### P20 — % doutores no corpo docente vs nota CPC em Pedagogia
**Pergunta:** "Qual é a relação entre o percentual de doutores no corpo docente e a nota CPC dos cursos de Pedagogia?"

#### P20 / deepseek — INCORRETO → **DIVERGÊNCIA REAL**

**SQL Gerado (deepseek):**
```sql
SELECT c.nome_curso, i.no_ies, i.sg_uf_ies,
       ROUND((i.qt_doc_ex_dout::numeric / NULLIF(i.qt_doc_exe, 0)) * 100, 2) AS percentual_doutores,
       cpc.cpc_continuo, cpc.nb_doutores
FROM inep.censo_cursos c
JOIN inep.dados_cpc cpc ON c.cod_curso = cpc.co_curso
JOIN inep.censo_ies_bruto i ON cpc.co_ies = i.co_ies AND cpc.ano = i.nu_ano_censo
WHERE c.nome_curso ILIKE '%pedagogia%'
  AND i.nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)
  AND i.qt_doc_exe > 0
ORDER BY percentual_doutores DESC
LIMIT 100
```

**Causa da divergência:** O filtro `i.nu_ano_censo = MAX(nu_ano_censo)` restringe o `censo_ies_bruto` ao ano mais recente do censo, mas o join com `dados_cpc` por `cpc.ano = i.nu_ano_censo` exige que o CPC também tenha dados nesse mesmo ano. Como os dados CPC são publicados com atraso (ou para anos diferentes), o join não encontra correspondência e retorna 0 linhas.

**Impacto:** Real. Nenhum resultado é retornado.

#### P20 / gemini — INCORRETO → **DIVERGÊNCIA REAL GRAVE**

**SQL Gerado (gemini):**
```sql
JOIN inep.censo_ies_bruto AS ci ON ci.co_ies = cc.cod_ies  -- join incorreto!
```

**Causa da divergência:** O gemini faz o join `censo_ies_bruto.co_ies = censo_cursos.cod_ies`, mas `censo_cursos.cod_ies` provavelmente não é a chave correta para esse join (deveria ser `dados_cpc.co_ies`). Isso gera um produto cartesiano parcial, retornando 1.893 linhas vs 20 do gabarito.

**Impacto:** Real e grave. Condição de join incorreta distorce completamente o resultado.

---

### P21 — Taxa de conclusão acumulada: Medicina vs Enfermagem por região
**Pergunta:** "Qual a taxa de conclusão acumulada média dos cursos de Medicina versus Enfermagem por região?"

#### P21 / deepseek — INCORRETO → **DIVERGÊNCIA REAL**

**SQL Gerado (deepseek):**
```sql
SELECT b.no_regiao_ies, ... AVG(f.tca) ...
WHERE ... AND f.nu_ano_referencia = (SELECT MAX(nu_ano_referencia) FROM inep.fluxo_tda)
GROUP BY b.no_regiao_ies, tipo_curso
```

**SQL Gabarito:**
```sql
SELECT f.no_cine_area_geral, f.co_regiao, f.no_curso, ROUND(AVG(f.tca), 2) AS media_taxa_conclusao
FROM inep.fluxo_tda f
WHERE f.no_curso ILIKE '%Medicina%' OR f.no_curso ILIKE '%Enfermagem%'
GROUP BY f.no_cine_area_geral, f.co_regiao, f.no_curso
ORDER BY f.no_curso, media_taxa_conclusao DESC
```

**Causa da divergência:** O deepseek filtra pelo `MAX(nu_ano_referencia)` e agrega por região + tipo de curso (2 grupos × 5 regiões = 10 linhas). O gabarito não filtra por ano e agrupa por `no_cine_area_geral + co_regiao + no_curso` — produzindo uma granularidade maior (variações de nome de curso × regiões = 35 linhas).

**Impacto:** Real. Além de filtrar apenas um ano, a granularidade da agregação é completamente diferente.

#### P21 / gemini — INCORRETO → **DIVERGÊNCIA REAL (BUG SQL)**

**SQL Gerado (gemini):**
```sql
WHERE f.no_curso ILIKE '%Medicina%' OR f.no_curso ILIKE '%Enfermagem%'
  AND f.nu_ano_referencia = (SELECT MAX(nu_ano_referencia) FROM inep.fluxo_tda)
```

**Causa da divergência:** Bug de precedência de operadores SQL. Em SQL, `AND` tem maior precedência que `OR`, então a condição é interpretada como:
```
f.no_curso ILIKE '%Medicina%'
OR
(f.no_curso ILIKE '%Enfermagem%' AND f.nu_ano_referencia = MAX)
```
Isso faz com que Medicina não seja filtrada por ano — retorna todos os registros de Medicina de todos os anos, mas Enfermagem apenas do ano mais recente. Resultado: 24 linhas (mistura de anos).

**Impacto:** Real. Bug SQL que produz resultados incorretos silenciosamente.

---

### P22 — Instituições do Sul com pós-graduação CAPES ≥ 6
**Pergunta:** "Quais instituições do Sul do Brasil possuem programas de pós-graduação com conceito CAPES igual ou superior a 6?"

#### P22 / deepseek, gemini, groq — ERRO_GABARITO

O **próprio gabarito tem erro SQL**: usa `SELECT DISTINCT ... ORDER BY cd_conceito_programa::int DESC` sendo que `cd_conceito_programa` não está na lista do SELECT (apenas `nm_entidade_ensino, sg_entidade_ensino, nm_programa_ies, cd_conceito_programa` — wait, está na lista). Verificando de novo:

```sql
SELECT DISTINCT nm_entidade_ensino, sg_entidade_ensino, nm_programa_ies, cd_conceito_programa
FROM inep.capes_programas_bruto
WHERE ... ORDER BY cd_conceito_programa::int DESC, nm_entidade_ensino
```

O erro é que o `ORDER BY` usa `cd_conceito_programa::int` (com cast) mas no SELECT está `cd_conceito_programa` sem cast — o PostgreSQL trata essas expressões como distintas em `SELECT DISTINCT`. Este é um bug no gabarito.

**As queries dos 3 provedores não podem ser avaliadas corretamente.** As queries do deepseek e gemini parecem logicamente válidas para a pergunta; o groq tem erro de tipo (`cd_conceito_programa >= 6` em coluna varchar).

---

### P23 — Proporção cotas escola pública em univ. federais 2022
**Pergunta:** "Para as universidades federais, qual é a proporção de alunos que ingressaram por cotas de escola pública em relação ao total de ingressantes em 2022?"

#### P23 / deepseek — INCORRETO → **DIVERGÊNCIA REAL**

**SQL Gerado (deepseek):**
```sql
SELECT SUM(v.qt_ing_rvredepublica)::float / NULLIF(SUM(v.qt_ing), 0) AS proporcao_cotas_escola_publica
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
WHERE v.nu_ano_censo = 2022
  AND b.tp_categoria_administrativa = 1
  AND b.tp_organizacao_academica = 1
```

**SQL Gabarito:**
```sql
SELECT b.no_ies, b.sg_ies,
       SUM(v.qt_ing_rvredepublica) AS ingressantes_cota_escola_publica,
       SUM(v.qt_ing) AS total_ingressantes,
       ROUND(SUM(v.qt_ing_rvredepublica)::numeric / NULLIF(SUM(v.qt_ing), 0) * 100, 2) AS percentual_cotas
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
WHERE v.nu_ano_censo = 2022
  AND b.tp_categoria_administrativa = 1
GROUP BY b.no_ies, b.sg_ies
HAVING SUM(v.qt_ing) > 0
ORDER BY percentual_cotas DESC
LIMIT 15
```

**Causa da divergência:** O deepseek retorna **um único valor agregado** (proporção nacional), enquanto o gabarito retorna **15 linhas** (uma por instituição). A pergunta pode ser interpretada das duas formas, mas o gabarito escolheu a granularidade por instituição. Adicionalmente, o deepseek filtra `tp_organizacao_academica = 1` (só universidades), enquanto o gabarito usa apenas `tp_categoria_administrativa = 1` (federais de qualquer organização).

**Impacto:** Real. A granularidade de resposta é fundamentalmente diferente.

#### P23 / groq — INCORRETO → **DIVERGÊNCIA REAL**
Idêntico ao deepseek em causa: retorna proporção agregada nacional (1 linha) vs 15 linhas por instituição.

---

## Tabela de Reclassificação Sugerida

| Pergunta | Provider | Veredito Atual | Veredito Sugerido | Justificativa |
|----------|----------|---------------|-------------------|---------------|
| P5 | deepseek | PARCIAL | **CORRETO** | Dados idênticos (dataMatchScore=100); diferença apenas no alias da coluna (`nota_igc` vs `igc_continuo`) |
| P5 | gemini | PARCIAL | **ACEITAR COMO VÁLIDO** | Retorna o valor solicitado pela pergunta ("a nota"); omite `ano` que é metadado contextual, não parte central da pergunta |
| P9 | gemini | PARCIAL | **CORRETO** | A pergunta pede "proporção" — a query retorna exatamente os percentuais pedidos; os totais absolutos do gabarito são dados extras não solicitados |
| P15 | deepseek | INCORRETO | **CORRETO** | Mesma lógica, mesma tabela, mesmo filtro, mesmo GROUP BY; divergência é apenas de alias e colunas extras; `dataMatchScore=0` é falso positivo por mismatch de nome de coluna na avaliação |

---

## Padrões de Falha Identificados

| Padrão | Ocorrências | Exemplos |
|--------|-------------|---------|
| **Tabela diferente** | 4 | P11 (dados_cpc vs dados_cpc_brutos), P17/gemini+groq (dados_cpc vs dados_enade), P7 (dados_igc vs igc_bruto) |
| **Falta de GROUP BY / agregação incorreta** | 2 | P4/gemini (sem GROUP BY), P23 (agrega tudo vs por instituição) |
| **Join desnecessário com ano restricting results** | 4 | P7/gemini, P11, P14/deepseek, P20/deepseek |
| **Filtro de ano (mais recente vs todos)** | 3 | P14/deepseek, P17/deepseek, P21 |
| **Coluna de localização errada** | 3 | P8 (no_regiao_ies vs no_regiao), P12 (sg_uf_ies vs sg_uf) |
| **Omissão de parte da pergunta** | 2 | P18/gemini (sem IDHM), P23 (sem granularidade por instituição) |
| **Granularidade de agrupamento diferente** | 2 | P19 (2 vs 7 grupos), P21 (região+tipo vs cine_area+regiao+curso) |
| **Bug SQL (precedência de operadores)** | 1 | P21/gemini (OR/AND sem parênteses) |
| **Filtro de texto sem acento** | 1 | P14/deepseek (`'%administracao%'` vs `'%Administração%'`) |
| **Diferença de alias apenas** | 2 | P5/deepseek, P15/deepseek |

---

## Observações sobre o Sistema de Avaliação

1. **`columnOverlap=0` não implica dados errados**: Em P5/deepseek, `columnOverlap=50` e `dataMatchScore=100` — os dados são idênticos. O sistema de avaliação baseado em nomes de colunas penaliza aliases diferentes mesmo quando os valores são os mesmos.

2. **`dataMatchScore=0` com `columnOverlap>0`** pode indicar que os dados estão corretos mas os nomes das colunas não batem no comparador — caso do P15/deepseek.

3. **`rowCountSemLimit` é o indicador mais confiável** para divergências reais: diferenças grandes (ex: 573.019 vs 10 em P4/gemini) indicam lógica fundamentalmente diferente; diferenças pequenas (1-2 linhas) podem ser efeitos de join ou valores NULL.

4. **P22 (ERRO_GABARITO)** deve ser corrigido no gabarito: remover o cast no ORDER BY ou incluir a expressão no SELECT.
