# Schema INEP - Documentação Melhorada

**Descoberto:** 27/09/2025, 12:16:23
**Total de tabelas:** 87
**Tabelas processadas:** 87

## Distribuição por Categorias

- **courses**: 5 tabelas
- **census**: 9 tabelas
- **institutions**: 8 tabelas
- **other**: 8 tabelas
- **performance**: 47 tabelas
- **students**: 2 tabelas
- **geography**: 8 tabelas

## Categoria: courses

### censo_curso_vagas_bruto
**Descrição:** Tabela relacionada a cursos com 202 atributos
**Colunas:** 202 | **Tamanho estimado:** large
**Palavras-chave:** censo, curso, vagas, bruto, ano, regiao, municipio, capital, dimensao, organizacao

### capes_programas_bruto
**Descrição:** Tabela relacionada a cursos com 34 atributos
**Colunas:** 34 | **Tamanho estimado:** small
**Palavras-chave:** capes, programas, bruto, base, grande, area, conhecimento, basica, subarea, especialidade

### capes_cursos_bruto
**Descrição:** Tabela relacionada a cursos com 28 atributos
**Colunas:** 28 | **Tamanho estimado:** medium
**Palavras-chave:** capes, cursos, bruto, base, grande, area, conhecimento, subarea, especialidade, avaliacao

### censo_cursos
**Descrição:** Dados do Censo da Educação Superior sobre cursos oferecidos pelas instituições
**Colunas:** 21 | **Tamanho estimado:** medium
**Palavras-chave:** censo, cursos, cod, curso, nome, ies, municipio, grau, academico, modalidade

### censo_cursos_bkp
**Descrição:** Dados do Censo da Educação Superior sobre cursos oferecidos pelas instituições
**Colunas:** 21 | **Tamanho estimado:** medium
**Palavras-chave:** censo, cursos, bkp, cod, curso, nome, ies, municipio, grau, academico

## Categoria: census

### censo_cine_rotulo
**Descrição:** Tabela censo_cine_rotulo com 5 colunas
**Colunas:** 5 | **Tamanho estimado:** small
**Palavras-chave:** censo, cine, rotulo, cod, descr, area, detalhada, tcu

### censo_categorias_administrativas
**Descrição:** Tabela censo_categorias_administrativas com 3 colunas
**Colunas:** 3 | **Tamanho estimado:** small
**Palavras-chave:** censo, categorias, administrativas, categoria, administrativa, descr, cat, adm, agrupada

### censo_cine_area_detalhada
**Descrição:** Tabela censo_cine_area_detalhada com 3 colunas
**Colunas:** 3 | **Tamanho estimado:** small
**Palavras-chave:** censo, cine, area, detalhada, cod, descr, especifica

### censo_cine_area_especifica
**Descrição:** Tabela censo_cine_area_especifica com 3 colunas
**Colunas:** 3 | **Tamanho estimado:** small
**Palavras-chave:** censo, cine, area, especifica, cod, descr, geral

### censo_organizacoes_academicas
**Descrição:** Tabela censo_organizacoes_academicas com 3 colunas
**Colunas:** 3 | **Tamanho estimado:** small
**Palavras-chave:** censo, organizacoes, academicas, organizacao, academica, descr, org, acad, agrupada

## Categoria: institutions

### censo_ies_bruto
**Descrição:** Tabela censo_ies_bruto com 87 colunas
**Colunas:** 87 | **Tamanho estimado:** small
**Palavras-chave:** censo, ies, bruto, ano, regiao, municipio, capital, mesorregiao, microrregiao, organizacao

### ind_fluxo_ies_tda
**Descrição:** Tabela relacionada a cursos com 26 atributos
**Colunas:** 26 | **Tamanho estimado:** large
**Palavras-chave:** ind, fluxo, ies, tda, categoria, administrativa, organizacao, academica, curso, municipio

### emec_instituicoes
**Descrição:** Tabela emec_instituicoes com 18 colunas
**Colunas:** 18 | **Tamanho estimado:** small
**Palavras-chave:** emec, instituicoes, ies, cnpj, telefone, site, email, endereco, municipio, criacao

### ind_fluxo_ies
**Descrição:** Tabela relacionada a cursos com 18 atributos
**Colunas:** 18 | **Tamanho estimado:** large
**Palavras-chave:** ind, fluxo, ies, periodo, curso, ano, ingresso, referencia, prazo, integralizacao

### ind_fluxo_ies_bkp
**Descrição:** Tabela relacionada a cursos com 18 atributos
**Colunas:** 18 | **Tamanho estimado:** large
**Palavras-chave:** ind, fluxo, ies, bkp, periodo, curso, ano, ingresso, referencia, prazo

## Categoria: other

### fluxo_tda
**Descrição:** Tabela relacionada a cursos com 31 atributos
**Colunas:** 31 | **Tamanho estimado:** large
**Palavras-chave:** fluxo, tda, ies, categoria, administrativa, organizacao, academica, curso, regiao, municipio

### dados_idd
**Descrição:** Tabela relacionada a cursos com 7 atributos
**Colunas:** 7 | **Tamanho estimado:** medium
**Palavras-chave:** dados, idd, ano, ies, curso, bruta, continuo, faixa

### cesta_indicadores
**Descrição:** Tabela cesta_indicadores com 4 colunas
**Colunas:** 4 | **Tamanho estimado:** small
**Palavras-chave:** cesta, indicadores, nome, indicador, descr, dimensao

### cesta_visualizacao_indicadores
**Descrição:** Tabela cesta_visualizacao_indicadores com 4 colunas
**Colunas:** 4 | **Tamanho estimado:** small
**Palavras-chave:** cesta, visualizacao, indicadores, descr, tipo, forma

### cesta_indicadores_visualizacoes
**Descrição:** Tabela cesta_indicadores_visualizacoes com 3 colunas
**Colunas:** 3 | **Tamanho estimado:** small
**Palavras-chave:** cesta, indicadores, visualizacoes, indicador, visualizacao

## Categoria: performance

### microdados_enade_arq3
**Descrição:** Resultados e dados do Exame Nacional de Desempenho dos Estudantes
**Colunas:** 52 | **Tamanho estimado:** large
**Palavras-chave:** microdados, enade, arq3, ano, curso, item, ofg, oce, gab, fin

### dados_percepcao_enade
**Descrição:** Resultados e dados do Exame Nacional de Desempenho dos Estudantes
**Colunas:** 44 | **Tamanho estimado:** large
**Palavras-chave:** dados, percepcao, enade, ano, curso, i27, i28, i29, i30, i31

### microdados_enade_arq4
**Descrição:** Resultados e dados do Exame Nacional de Desempenho dos Estudantes
**Colunas:** 44 | **Tamanho estimado:** large
**Palavras-chave:** microdados, enade, arq4, ano, curso, i27, i28, i29, i30, i31

### dados_cpc_brutos
**Descrição:** Tabela relacionada a cursos com 40 atributos
**Colunas:** 40 | **Tamanho estimado:** medium
**Palavras-chave:** dados, cpc, brutos, ano, cod, area, descr, ies, nome, sigla

### dados_cpc
**Descrição:** Tabela relacionada a cursos com 29 atributos
**Colunas:** 29 | **Tamanho estimado:** medium
**Palavras-chave:** dados, cpc, ano, ies, curso, conc, inscritos, participantes, bruta, enade

## Categoria: students

### dm_aluno
**Descrição:** Dimensão de alunos com dados demográficos e acadêmicos
**Colunas:** 75 | **Tamanho estimado:** medium
**Palavras-chave:** aluno, ies, categoria, administrativa, organizacao, academica, curso, nivel, academico, modalidade

### matriculas_municipio
**Descrição:** Tabela matriculas_municipio com 10 colunas
**Colunas:** 10 | **Tamanho estimado:** small
**Palavras-chave:** matriculas, municipio, ano, censo, cod, mat, mais

## Categoria: geography

### municipios_ibge
**Descrição:** Dados geográficos e demográficos dos municípios brasileiros
**Colunas:** 9 | **Tamanho estimado:** small
**Palavras-chave:** municipios, ibge, cod, municipio, nome, microregiao, latitude, longitude, populacao, densidade

### uf_ibge
**Descrição:** Tabela uf_ibge com 7 colunas
**Colunas:** 7 | **Tamanho estimado:** small
**Palavras-chave:** ibge, num, nome, cod, regiao, latitude, longitude, sem, acento

### variaveis_pib_municipios_ibge
**Descrição:** Dados geográficos e demográficos dos municípios brasileiros
**Colunas:** 7 | **Tamanho estimado:** large
**Palavras-chave:** variaveis, pib, municipios, ibge, cod, ano, variavel, valor, unidade, medida

### mesoregioes_ibge
**Descrição:** Tabela mesoregioes_ibge com 5 colunas
**Colunas:** 5 | **Tamanho estimado:** small
**Palavras-chave:** mesoregioes, ibge, cod, mesoregiao, num, nome, sem, acento

### microregioes_ibge
**Descrição:** Tabela microregioes_ibge com 5 colunas
**Colunas:** 5 | **Tamanho estimado:** small
**Palavras-chave:** microregioes, ibge, cod, microregiao, num, nome, mesoregiao, sem, acento

