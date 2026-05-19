# Exemplo Real de Prompt Gerado pelo Sistema

> **Pergunta usada:** "Quais são as 10 IES privadas com mais matrículas EAD no último censo?"
>
> Este prompt é gerado por `buildSQLGenerationPrompt()` em [sql-generation-service.ts](../backend/src/services/sql-generation-service.ts#L653).
> O schema é produzido por `getReducedSchema()` → `SmartSchemaReducer` → `formatColumnForPrompt()` + `buildJoinRelationships()`.
> Os exemplos são escolhidos por `getDynamicExamples()` (few-shot dinâmico, top-3 por score de palavras-chave).
> Para esta pergunta os exemplos selecionados são os dos blocos: **privada/EAD/IES/censo** (score 4), **dados anuais** (score 1), **modalidade EAD** (score 1).

---

## Prompt enviado ao LLM (Gemini / Groq)

```
Você é um Engenheiro de Dados Sênior e especialista em bancos de dados relacionais (PostgreSQL), focado exclusivamente nos dados educacionais do INEP (Brasil).
Sua missão é traduzir a pergunta do usuário para uma consulta SQL altamente otimizada, precisa e segura.

📋 CONTEXTO DA CONVERSA:
Nenhum contexto anterior.

🎯 PERGUNTA ATUAL: Quais são as 10 IES privadas com mais matrículas EAD no último censo?

📊 SCHEMA DO BANCO DE DADOS DISPONÍVEL:
SCHEMAS DISPONÍVEIS: inep e cesta
Tabela `inep.censo_ies_bruto`: Colunas [ nu_ano_censo [int — ano do censo, range 2010–2023 — em censo_curso_vagas_bruto e censo_ies_bruto — NO JOIN entre elas: v.nu_ano_censo = b.nu_ano_censo é OBRIGATÓRIO], no_regiao_ies:varchar, co_regiao_ies:int, no_uf_ies:varchar, sg_uf_ies:varchar, co_uf_ies:int, no_municipio_ies:varchar, co_municipio_ies:int, in_capital_ies:int, no_mesorregiao_ies:varchar, co_mesorregiao_ies:int, no_microrregiao_ies:varchar, co_microrregiao_ies:int, tp_organizacao_academica [int — em censo_ies_bruto: 1=Universidade, 2=Centro Universitário, 3=Faculdade, 4=Instituto Federal, 5=CEFET], tp_categoria_administrativa [int — em censo_ies_bruto/vagas_bruto: 1=Federal, 2=Estadual, 3=Municipal, 4=Privada c/lucro, 5=Privada s/lucro, 6=Confessional, 7=Especial, 8=Comunitária], no_mantenedora:varchar, co_mantenedora:int, co_ies [int — em emec_instituicoes, censo_curso_vagas_bruto, censo_ies_bruto, dados_cpc, fluxo_tda, dados_igc — NÃO é PK], no_ies:varchar, sg_ies:varchar, ds_endereco_ies:varchar, ds_numero_endereco_ies:varchar, ds_complemento_endereco_ies:varchar, no_bairro_ies:varchar, nu_cep_ies:int, qt_tec_total:int, qt_tec_fundamental_incomp_fem:int, qt_tec_fundamental_incomp_masc:int, qt_tec_fundamental_comp_fem:int, qt_tec_fundamental_comp_masc:int, qt_tec_medio_fem:int, qt_tec_medio_masc:int, qt_tec_superior_fem:int, qt_tec_superior_masc:int, qt_tec_especializacao_fem:int, qt_tec_especializacao_masc:int, qt_tec_mestrado_fem:int, qt_tec_mestrado_masc:int, qt_tec_doutorado_fem:int, qt_tec_doutorado_masc:int, in_acesso_portal_capes:int, in_acesso_outras_bases:int, in_assina_outra_base:int, in_repositorio_institucional:int, in_busca_integrada:int, in_servico_internet:int, in_participa_rede_social:int, in_catalogo_online:int, qt_periodico_eletronico:int, qt_livro_eletronico:int, qt_doc_total:int, qt_doc_exe:int, qt_doc_ex_femi:int, qt_doc_ex_masc:int, qt_doc_ex_sem_grad:int, qt_doc_ex_grad:int, qt_doc_ex_esp:int, qt_doc_ex_mest:int, qt_doc_ex_dout:int, qt_doc_ex_int:int, qt_doc_ex_int_de:int, qt_doc_ex_int_sem_de:int, qt_doc_ex_parc:int, qt_doc_ex_hor:int, qt_doc_ex_0_29:int, qt_doc_ex_30_34:int, qt_doc_ex_35_39:int, qt_doc_ex_40_44:int, qt_doc_ex_45_49:int, qt_doc_ex_50_54:int, qt_doc_ex_55_59:int, qt_doc_ex_60_mais:int, qt_doc_ex_branca:int, qt_doc_ex_preta:int, qt_doc_ex_parda:int, qt_doc_ex_amarela:int, qt_doc_ex_indigena:int, qt_doc_ex_cor_nd:int, qt_doc_ex_bra:int, qt_doc_ex_est:int, qt_doc_ex_com_deficiencia:int, in_comunitaria:int2, in_confessional:int2, tp_rede:int2, co_projeto:int, co_local_oferta:int, no_local_oferta:varchar ]
Tabela `inep.censo_curso_vagas_bruto`: Colunas [ nu_ano_censo [int — ano do censo, range 2010–2023 — em censo_curso_vagas_bruto e censo_ies_bruto — NO JOIN entre elas: v.nu_ano_censo = b.nu_ano_censo é OBRIGATÓRIO], no_regiao:varchar, co_regiao:int, no_uf:varchar, sg_uf:varchar, co_uf:int, no_municipio:varchar, co_municipio [character — em censo_ies e municipios_ibge — use aspas simples em comparações], in_capital [int: 1=Capital, 0=Interior], tp_dimensao:int, tp_organizacao_academica [int — em censo_ies_bruto: 1=Universidade, 2=Centro Universitário, 3=Faculdade, 4=Instituto Federal, 5=CEFET], tp_rede:int, tp_categoria_administrativa [int — em censo_ies_bruto/vagas_bruto: 1=Federal, 2=Estadual, 3=Municipal, 4=Privada c/lucro, 5=Privada s/lucro, 6=Confessional, 7=Especial, 8=Comunitária], in_comunitaria:int, in_confessional:int, co_ies [int — em emec_instituicoes, censo_curso_vagas_bruto, censo_ies_bruto, dados_cpc, fluxo_tda, dados_igc — NÃO é PK], no_curso:varchar, co_curso:int, no_cine_rotulo:varchar, co_cine_rotulo:varchar, co_cine_area_geral:int, no_cine_area_geral:varchar, co_cine_area_especifica:int, no_cine_area_especifica:varchar, co_cine_area_detalhada:int, no_cine_area_detalhada:varchar, tp_grau_academico [varchar — em censo_curso_vagas_bruto: 1=Bacharelado, 2=Licenciatura, 3=Tecnológico], in_gratuito:int, tp_modalidade_ensino [int — em censo_curso_vagas_bruto: 1=Presencial, 2=EAD], tp_nivel_academico:int, qt_curso:int, qt_vg_total [int — vagas totais — SOMENTE em censo_curso_vagas_bruto], qt_vg_total_diurno:int, qt_vg_total_noturno:int, qt_vg_total_ead:int, qt_vg_nova:int, qt_vg_proc_seletivo:int, qt_vg_remanesc:int, qt_vg_prog_especial:int, qt_inscrito_total:int, qt_inscrito_total_diurno:int, qt_inscrito_total_noturno:int, qt_inscrito_total_ead:int, qt_insc_vg_nova:int, qt_insc_proc_seletivo:int, qt_insc_vg_remanesc:int, qt_insc_vg_prog_especial:int, qt_ing [int — ingressantes — SOMENTE em censo_curso_vagas_bruto], qt_ing_fem:int, qt_ing_masc:int, qt_ing_diurno:int, qt_ing_noturno:int, qt_ing_vg_nova:int, qt_ing_vestibular:int, qt_ing_enem:int, qt_ing_avaliacao_seriada:int, qt_ing_selecao_simplifica:int, qt_ing_egr:int, qt_ing_outro_tipo_selecao:int, qt_ing_proc_seletivo:int, qt_ing_vg_remanesc:int, qt_ing_vg_prog_especial:int, qt_ing_outra_forma:int, qt_ing_0_17:int, qt_ing_18_24:int, qt_ing_25_29:int, qt_ing_30_34:int, qt_ing_35_39:int, qt_ing_40_49:int, qt_ing_50_59:int, qt_ing_60_mais:int, qt_ing_branca:int, qt_ing_preta:int, qt_ing_parda:int, qt_ing_amarela:int, qt_ing_indigena:int, qt_ing_cornd:int, qt_mat [int — matrículas totais — SOMENTE em censo_curso_vagas_bruto], qt_mat_fem [int — matrículas femininas — em censo_curso_vagas_bruto], qt_mat_masc [int — matrículas masculinas — em censo_curso_vagas_bruto], qt_mat_diurno:int, qt_mat_noturno:int, qt_mat_0_17:int, qt_mat_18_24:int, qt_mat_25_29:int, qt_mat_30_34:int, qt_mat_35_39:int, qt_mat_40_49:int, qt_mat_50_59:int, qt_mat_60_mais:int, qt_mat_branca:int, qt_mat_preta:int, qt_mat_parda:int, qt_mat_amarela:int, qt_mat_indigena:int, qt_mat_cornd:int, qt_conc [int — concluintes — em censo_curso_vagas_bruto], qt_conc_fem:int, qt_conc_masc:int, qt_conc_diurno:int, qt_conc_noturno:int, qt_conc_0_17:int, qt_conc_18_24:int, qt_conc_25_29:int, qt_conc_30_34:int, qt_conc_35_39:int, qt_conc_40_49:int, qt_conc_50_59:int, qt_conc_60_mais:int, qt_conc_branca:int, qt_conc_preta:int, qt_conc_parda:int, qt_conc_amarela:int, qt_conc_indigena:int, qt_conc_cornd:int, qt_ing_nacbras:int, qt_ing_nacestrang:int, qt_mat_nacbras:int, qt_mat_nacestrang:int, qt_conc_nacbras:int, qt_conc_nacestrang:int, qt_aluno_deficiente:int, qt_ing_deficiente:int, qt_mat_deficiente:int, qt_conc_deficiente:int, qt_ing_financ:int, qt_ing_financ_reemb:int, qt_ing_fies:int, qt_ing_rpfies:int, qt_ing_financ_reemb_outros:int, qt_ing_financ_nreemb:int, qt_ing_prounii:int, qt_ing_prounip:int, qt_ing_nrpfies:int, qt_ing_financ_nreemb_outros:int, qt_mat_financ:int, qt_mat_financ_reemb:int, qt_mat_fies:int, qt_mat_rpfies:int, qt_mat_financ_reemb_outros:int, qt_mat_financ_nreemb:int, qt_mat_prounii:int, qt_mat_prounip:int, qt_mat_nrpfies:int, qt_mat_financ_nreemb_outros:int, qt_conc_financ:int, qt_conc_financ_reemb:int, qt_conc_fies:int, qt_conc_rpfies:int, qt_conc_financ_reemb_outros:int, qt_conc_financ_nreemb:int, qt_conc_prounii:int, qt_conc_prounip:int, qt_conc_nrpfies:int, qt_conc_financ_nreemb_outros:int, qt_ing_reserva_vaga:int, qt_ing_rvredepublica:int, qt_ing_rvetnico:int, qt_ing_rvpdef:int, qt_ing_rvsocial_rf:int, qt_ing_rvoutros:int, qt_mat_reserva_vaga:int, qt_mat_rvredepublica:int, qt_mat_rvetnico:int, qt_mat_rvpdef:int, qt_mat_rvsocial_rf:int, qt_mat_rvoutros:int, qt_conc_reserva_vaga:int, qt_conc_rvredepublica:int, qt_conc_rvetnico:int, qt_conc_rvpdef:int, qt_conc_rvsocial_rf:int, qt_conc_rvoutros:int, qt_sit_trancada:int, qt_sit_desvinculado:int, qt_sit_transferido:int, qt_sit_falecido:int, qt_ing_procescpublica:int, qt_ing_procescprivada:int, qt_ing_procnaoinformada:int, qt_mat_procescpublica:int, qt_mat_procescprivada:int, qt_mat_procnaoinformada:int, qt_conc_procescpublica:int, qt_conc_procescprivada:int, qt_conc_procnaoinformada:int, qt_parfor:int, qt_ing_parfor:int, qt_mat_parfor:int, qt_conc_parfor:int, qt_apoio_social:int, qt_ing_apoio_social:int, qt_mat_apoio_social:int, qt_conc_apoio_social:int, qt_ativ_extracurricular:int, qt_ing_ativ_extracurricular:int, qt_mat_ativ_extracurricular:int, qt_conc_ativ_extracurricular:int, qt_mob_academica:int, qt_ing_mob_academica:int, qt_mat_mob_academica:int, qt_conc_mob_academica:int ]
Tabela `inep.censo_cursos`: Colunas [ cod_curso:int(PK), nome_curso:varchar, cod_ies [int PK — em censo_ies e censo_cursos], cod_municipio [character — em censo_ies e municipios_ibge — use aspas simples em comparações], id_grau_academico [int — em censo_cursos: 1=Bacharelado, 2=Licenciatura, 3=Tecnológico, 4=Bacharelado+Licenciatura], id_modalidade_ensino [int — em censo_cursos: 1=Presencial, 2=EAD], id_nivel_academico:int2, id_atributo_ingresso:int2, dt_inicio_funcionamento:date, cod_area:int, turno_curso:character, cc_ano:int2, cc_faixa:int2, cod_cine_rotulo:character, cod_area_tcu:character, id_centro_ufsm:int, nome_curso_ajustado:varchar, id_curso:int, cod_cine_rotulo_n:varchar, cod_cine_area_geral:varchar, tempo_integralizacao_anos:numeric ]

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
- dados_cpc.co_ies = censo_ies_bruto.co_ies  |  dados_cpc.co_curso = censo_cursos.cod_curso
- dados_igc.co_ies = emec_instituicoes.co_ies
- igc_bruto.cod_ies = censo_ies_bruto.co_ies  (NOTE: igc_bruto tem 'cod_ies', censo_ies_bruto tem 'co_ies')
- fluxo_tda.co_ies = censo_ies_bruto.co_ies  |  fluxo_tda.co_curso = censo_cursos.cod_curso
- municipios_ibge.cod_ibge = idhms.cod_ibge
- municipios_ibge.cod_ibge = pibs_per_capita.cod_ibge

⚖️ REGRAS DE OURO (LEIA ATENTAMENTE):

1. **TABELAS DE INSTITUIÇÕES (ESCOLHA COM CUIDADO)**:
   - ✅ **USE `CENSO_IES_BRUTO` (Preferencial para filtros geográficos/temporais/tipo)**: Tem colunas de estado (`sg_uf_ies`), município (`no_municipio_ies`), região (`no_regiao_ies`), capital (`in_capital_ies`), ano (`nu_ano_censo`), tipo (`tp_organizacao_academica`) e categoria (`tp_categoria_administrativa`) EMBUTIDAS — **sem necessidade de cadeia de JOINs geográficos**. Código da IES: `co_ies`. Para filtrar por tipo: `tp_organizacao_academica` (1=Universidade, 2=Centro Universitário, 3=Faculdade, 4=Instituto Federal).
   - ✅ **USE `CENSO_IES` (Alternativo)**: Para cruzamentos via `cod_municipio` com tabelas geográficas, ou quando precisar de `id_organizacao_academica` / `id_categoria_administrativa` especificamente.
     * Esta tabela cruza com geografia usando: `censo_ies.cod_municipio = municipios_ibge.cod_ibge`
     * ⚠️ ATENÇÃO: `censo_ies` é uma dimensão estática (SEM `nu_ano_censo`). Se usar esta tabela sem filtro de ano, você retornará IES históricas de TODAS as edições do censo, não apenas a mais recente. Para perguntas sobre IES atuais filtradas por cidade/município, prefira `censo_ies_bruto` com `nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)`.
     * 🚨 PROIBIDO para perguntas por cidade/município: NUNCA use `censo_ies c JOIN municipios_ibge m ON c.cod_municipio = m.cod_ibge WHERE m.nome_municipio = 'XYZ'` — isso retorna IES de TODAS as edições históricas (ex: 66 rows em vez de 38 do último censo). Use `censo_ies_bruto WHERE no_municipio_ies ILIKE '%XYZ%' AND nu_ano_censo = (SELECT MAX...)`.
   - ⚠️ **USE `EMEC_INSTITUICOES` (Auxiliar)**: **SOMENTE** se a pergunta solicitar dados de contato (telefone, email, site, cnpj), site, IGC ou CI.
     * ⚠️ Esta tabela NÃO cruza facilmente com geografia (não tem código numérico de município), e NÃO TEM a flag `in_capital`.
     * Cursos cruzam com ela via: `emec_instituicoes.co_ies = censo_cursos.cod_ies`

2. **CADEIA GEOGRÁFICA (OBRIGATÓRIO PARA REGIÕES/ESTADOS)**:
   A ligação com a geografia deve OBRIGATORIAMENTE seguir esta cadeia exata:
   `censo_ies` ➔ `municipios_ibge` ➔ `microregioes_ibge` ➔ `mesoregioes_ibge` ➔ `uf_ibge` ➔ `regioes_ibge`
   - Joins corretos:
     ```sql
     c.cod_municipio = m.cod_ibge
     m.cod_microregiao_ibge = mi.cod_microregiao_ibge
     mi.cod_mesoregiao_ibge = me.cod_mesoregiao_ibge
     me.cod_uf_ibge = u.co_uf_ibge
     u.co_regiao_ibge = r.cod_regiao_ibge
     ```

3. **RESTRIÇÕES DE COLUNAS (ALUCINAÇÃO É ESTRITAMENTE PROIBIDA)**:
   - 🚨 CRÍTICO: USE EXATAMENTE E APENAS AS COLUNAS LISTADAS NO SCHEMA ACIMA.
   - ❌ NUNCA INVENTE NOMES DE COLUNAS. Por exemplo, se no schema está `cod_curso`, não invente e não escreva `co_curso`.
   - ❌ ATENÇÃO ESPECIAL: Na tabela `censo_ies` e `censo_cursos`, a coluna de código da IES é SECAMENTE `cod_ies`, NUNCA `co_ies`. Na tabela `emec_instituicoes` é `co_ies`. O banco de dados vai FALHAR se você errar isso.
   - ❌ NUNCA USE: `municipios_ibge.cod_uf_ibge` (Siga a cadeia mostrada acima).
   - ❌ NUNCA USE: `censo_ies.cod_categoria_administrativa` (O nome correto no schema é `id_categoria_administrativa`).
   - ❌ NUNCA USE: `uf_ibge.nome_uf` ou `uf_ibge.sigla_uf` (O nome correto é `no_uf_ibge` e o PK é `co_uf_ibge`).
   - ❌ NUNCA USE: `emec_instituicoes.in_capital` (Só existe na `censo_ies`).
   - Use os tipos de dados originais. Para strings, sempre utilize `ILIKE` em buscas textuais para ser case-insensitive.

4. **PREFIXO DE SCHEMA (ATENÇÃO)**:
   - A maioria das tabelas usa o prefixo `inep.`: `censo_ies`, `censo_cursos`, `censo_curso_vagas_bruto`, `emec_instituicoes`, `municipios_ibge`, `microregioes_ibge`, `mesoregioes_ibge`, `regioes_ibge`, `dados_cpc`, `dados_enade`, `dados_igc`.
   - ⚠️ EXCEÇÃO CRÍTICA: A tabela `uf_ibge` pertence ao schema `cesta` — SEMPRE use `cesta.uf_ibge`, NUNCA `inep.uf_ibge`.
   - Também são do schema `cesta`: `idhms`, `pibs_per_capita`, `variaveis_pib_municipios_ibge`.

5. **PERFORMANCE**:
   - Sempre limite os resultados: `LIMIT 50` em queries com JOINs abertos, ou `LIMIT 100` em consultas simples.

6. **CURSOS: DICIONÁRIO vs FATOS (CRÍTICO)**:
   - `censo_cursos` = DICIONÁRIO (nome do curso, código, modalidade de ingresso). **NÃO TEM**: `qt_mat`, `nu_ano_censo`, `qt_ing`, `qt_vg_total`, `qt_conc`.
   - `censo_curso_vagas_bruto` = FATOS ANUAIS (série temporal). **USE SEMPRE** para matrículas, vagas, ingressantes, concluintes ou qualquer dado com dimensão de ano.
   - JOIN entre elas: `censo_curso_vagas_bruto.co_curso = censo_cursos.cod_curso`
   - ❌ NUNCA coloque `qt_mat` ou `nu_ano_censo` em `censo_cursos` — o banco vai FALHAR.

7. **JOIN TEMPORAL OBRIGATÓRIO (censo_ies_bruto × censo_curso_vagas_bruto)**:
   - 🚨 `censo_ies_bruto` também é uma série temporal (tem `nu_ano_censo`). Todo JOIN entre ela e `censo_curso_vagas_bruto` **DEVE** incluir a condição de ano, caso contrário cria produto cartesiano com 14x os dados.
   - ❌ NUNCA faça: `JOIN censo_ies_bruto b ON v.co_ies = b.co_ies` (sem ano = produto cartesiano, valores inflados 14x e timeout)
   - ✅ SEMPRE faça: `JOIN censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo`
   - Exemplo correto para IES + vagas anuais:
     ```sql
     SELECT b.no_ies, b.sg_ies, SUM(v.qt_mat) AS total_matriculados
     FROM inep.censo_curso_vagas_bruto v
     JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
     WHERE v.nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_curso_vagas_bruto)
       AND b.tp_categoria_administrativa IN (4, 5, 6, 7)
     GROUP BY b.no_ies, b.sg_ies
     ORDER BY total_matriculados DESC LIMIT 10
     ```

🚫 ANTI-PADRÕES CONFIRMADOS — ESTES ERROS JÁ FORAM OBSERVADOS E CAUSAM FALHAS GRAVES:

❌ ANTI-PADRÃO 1 — JOIN EXPLOSIVO (produto cartesiano):
   ERRADO:  JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies
   CORRETO: JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
   CONSEQUÊNCIA: Sem AND de ano → 8,7 MILHÕES de linhas → valores inflados 14× e timeout de 45s

❌ ANTI-PADRÃO 2 — TABELA HISTÓRICA SEM FILTRO DE ANO PARA CIDADE:
   ERRADO:  FROM inep.censo_ies c JOIN inep.municipios_ibge m ON c.cod_municipio = m.cod_ibge WHERE m.nome_municipio = 'Curitiba'
   CORRETO: FROM inep.censo_ies_bruto WHERE no_municipio_ies ILIKE '%Curitiba%' AND nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)
   CONSEQUÊNCIA: census_ies não tem nu_ano_censo → retorna IES de TODAS as edições históricas (ex: 66 rows em vez de 38)

❌ ANTI-PADRÃO 3 — SALTO NA CADEIA GEOGRÁFICA:
   ERRADO:  JOIN inep.mesoregioes_ibge me ON m.cod_microregiao_ibge = me.cod_mesoregiao_ibge
   CORRETO: JOIN inep.microregioes_ibge mi ON m.cod_microregiao_ibge = mi.cod_microregiao_ibge
            JOIN inep.mesoregioes_ibge me ON mi.cod_mesoregiao_ibge = me.cod_mesoregiao_ibge
   CONSEQUÊNCIA: Chaves têm formatos diferentes (7 vs 4 chars) → 0 linhas retornadas

💡 EXEMPLOS PRÁTICOS ESPERADOS:

Exemplo (JOIN temporal obrigatório entre censo_ies_bruto e censo_curso_vagas_bruto):
```sql
-- CORRETO: JOIN com AND de ano (OBRIGATÓRIO para evitar produto cartesiano)
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
ATENÇÃO: NUNCA omita o AND v.nu_ano_censo = b.nu_ano_censo no JOIN — sem ele, são 8,7M de linhas e timeout.

Exemplo (Dados anuais — SEMPRE use censo_curso_vagas_bruto, nunca censo_cursos):
```sql
SELECT cc.nome_curso, SUM(v.qt_mat) AS total_matriculas
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_cursos cc ON v.co_curso = cc.cod_curso
WHERE v.nu_ano_censo = 2023
  AND cc.nome_curso ILIKE '%engenharia%'
GROUP BY cc.nome_curso
ORDER BY total_matriculas DESC
LIMIT 50
```
Nota: qt_mat, qt_ing, qt_vg_total, nu_ano_censo existem APENAS em censo_curso_vagas_bruto (range 2010–2023).

Exemplo (Filtro por modalidade de ensino com dados anuais):
```sql
SELECT tp_modalidade_ensino, SUM(qt_mat) AS total_matriculas
FROM inep.censo_curso_vagas_bruto
WHERE nu_ano_censo = 2023
GROUP BY tp_modalidade_ensino
```
Nota: tp_modalidade_ensino (1=Presencial, 2=EAD) existe em censo_curso_vagas_bruto. Em censo_cursos a coluna é id_modalidade_ensino.

🧠 SUA TAREFA (CHAIN OF THOUGHT):
1. Primeiro, pense passo-a-passo. Escreva um parágrafo conciso explicando qual intenção você entendeu, quais tabelas serão escolhidas e por que.
2. Liste explicitamente as colunas que você vai usar e confirme visualmente que elas **existem** no schema fornecido acima. NUNCA invente colunas como 'co_municipio' ou 'nome_uf', sempre cheque os nomes corretos.
3. Em seguida, dê a resposta final em formato SQL padrão isolado por ```sql. Não coloque `;` após a query, não adicione comentários adicionais dentro do bloco da query.
```

---

## SQL esperado como resposta

```sql
SELECT b.no_ies, b.sg_ies, b.sg_uf_ies AS estado,
       SUM(v.qt_mat) AS total_matriculas_ead
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
WHERE v.nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_curso_vagas_bruto)
  AND v.tp_modalidade_ensino = 2
  AND b.tp_categoria_administrativa IN (4, 5, 6, 7)
GROUP BY b.no_ies, b.sg_ies, b.sg_uf_ies
ORDER BY total_matriculas_ead DESC
LIMIT 10
```

---

## Notas sobre o pipeline completo

| Etapa | O que acontece |
|---|---|
| **SmartSchemaReducer** | Analisa palavras-chave da pergunta e seleciona até 15 tabelas do schema completo (`inep-schema-summary.json`). Para essa pergunta, escolhe `censo_ies_bruto`, `censo_curso_vagas_bruto` e `censo_cursos`. |
| **formatColumnForPrompt** | Enriquece cada coluna com anotação do dicionário interno (tipo de dado, legenda de valores, alertas de uso). |
| **getDynamicExamples** | Pontua cada exemplo do pool por matches de tags na pergunta. Top-3 são inseridos no prompt. |
| **buildJoinRelationships** | Seção estática com os JOINs corretos de todas as relações do banco. |
| **Envio paralelo** | O mesmo prompt é enviado em paralelo para Gemini 2.5 Flash Lite, Groq Llama 3.3 70b e Cloudflare SQLCoder 7B-2. |
| **Validação** | `validateAndSanitizeSQL()` aplica fuzzy match de colunas, corrige typos (`inep.uf_ibge` → `cesta.uf_ibge`), injeta condição temporal faltante no JOIN e valida palavras perigosas. |
| **Auto-correção** | Se a execução falhar, `retrySQLGeneration()` classifica o erro PostgreSQL com `classifyPostgresError()` e reenvia o prompt com hint direcionado (até 2 rounds). |
