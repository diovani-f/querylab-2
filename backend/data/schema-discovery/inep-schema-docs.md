# Schema INEP - Documentação

**Descoberto em:** 13/08/2025, 20:53:20
**Total de tabelas:** 97
**Tabelas processadas:** 25

## Índice

1. [AREA_AVAL_CAPES_X_CINE_AREA_DET](#area_aval_capes_x_cine_area_det)
2. [AVAL_MEC_AVALIACOES](#aval_mec_avaliacoes)
3. [AVAL_MEC_CONCEITOS](#aval_mec_conceitos)
4. [AVAL_MEC_CURSO_AVAL_INSTRUMENTO](#aval_mec_curso_aval_instrumento)
5. [AVAL_MEC_CURSO_IES](#aval_mec_curso_ies)
6. [AVAL_MEC_CURSO_IES_CALCULO](#aval_mec_curso_ies_calculo)
7. [AVAL_MEC_CURSO_UNIDADE_CALCULO](#aval_mec_curso_unidade_calculo)
8. [AVAL_MEC_INDICADORES](#aval_mec_indicadores)
9. [CAPES_DISCENTES_2021](#capes_discentes_2021)
10. [CAPES_DISCENTES_2022](#capes_discentes_2022)
11. [CENSO_CATEGORIAS_ADMINISTRATIVAS](#censo_categorias_administrativas)
12. [CENSO_CINE_AREA_DETALHADA](#censo_cine_area_detalhada)
13. [CENSO_CINE_AREA_ESPECIFICA](#censo_cine_area_especifica)
14. [CENSO_CINE_AREA_GERAL](#censo_cine_area_geral)
15. [CENSO_CINE_ROTULO](#censo_cine_rotulo)
16. [CENSO_CURSO_VAGAS_BRUTO](#censo_curso_vagas_bruto)
17. [CENSO_CURSOS](#censo_cursos)
18. [CENSO_GRAUS_ACADEMICOS](#censo_graus_academicos)
19. [CENSO_IES](#censo_ies)
20. [CENSO_MODALIDADES_ENSINO](#censo_modalidades_ensino)
21. [CENSO_NIVEIS_ACADEMICOS](#censo_niveis_academicos)
22. [CENSO_ORGANIZACOES_ACADEMICAS](#censo_organizacoes_academicas)
23. [DADOS_CPC](#dados_cpc)
24. [DADOS_ENADE](#dados_enade)
25. [DADOS_ENADE_PERCEPCAO_QE_I01](#dados_enade_percepcao_qe_i01)

## AREA_AVAL_CAPES_X_CINE_AREA_DET

**Tipo:** T
**Colunas:** 3
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| ID_AREA_AVALIACAO | INTEGER | 4 | Não | - | - |
| COD_CINE_AREA_DETALHADA | CHARACTER | 4 | Sim | - | - |
| ID_AREA_BASICA | INTEGER | 4 | Sim | - | - |

---

## AVAL_MEC_AVALIACOES

**Tipo:** T
**Colunas:** 9
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| CO_AVALIACAO | INTEGER | 4 | Sim | - | - |
| CO_INSTRUMENTO | INTEGER | 4 | Sim | - | - |
| VL_CONCEITO_CONTINUO | INTEGER | 4 | Sim | - | - |
| VL_CONCEITO_FAIXA | INTEGER | 4 | Sim | - | - |
| ID_CONCEITO | INTEGER | 4 | Sim | - | - |
| ID_INDICADOR | INTEGER | 4 | Sim | - | - |
| DIMENSAO_INDICADOR | VARCHAR | 30 | Sim | - | - |
| CONCEITO_ORIGINAL | VARCHAR | 10 | Sim | - | - |
| CONCEITO | INTEGER | 4 | Sim | - | - |

---

## AVAL_MEC_CONCEITOS

**Tipo:** T
**Colunas:** 5
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| DIMENSAO_INDICADOR | VARCHAR | 30 | Sim | - | - |
| CONCEITO | INTEGER | 4 | Sim | - | - |
| CRITERIO_ANALISE | VARCHAR | 2056 | Sim | - | - |
| ID_INDICADOR | INTEGER | 4 | Sim | - | - |
| ID_CONCEITO | INTEGER | 4 | Sim | - | - |

---

## AVAL_MEC_CURSO_AVAL_INSTRUMENTO

**Tipo:** T
**Colunas:** 66
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| CO_AVALIACAO | INTEGER | 4 | Sim | - | - |
| CO_INSTRUMENTO | INTEGER | 4 | Sim | - | - |
| VL_CONCEITO_CONTINUO | INTEGER | 4 | Sim | - | - |
| VL_CONCEITO_FAIXA | INTEGER | 4 | Sim | - | - |
| VL_D1 | INTEGER | 4 | Sim | - | - |
| VL_IND_1_1 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_2 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_3 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_4 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_5 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_6 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_7 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_8 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_9 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_10 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_11 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_12 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_13 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_14 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_15 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_16 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_17 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_18 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_19 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_20 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_21 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_22 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_23 | VARCHAR | 10 | Sim | - | - |
| VL_IND_1_24 | VARCHAR | 10 | Sim | - | - |
| VL_D2 | INTEGER | 4 | Sim | - | - |
| VL_IND_2_1 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_2 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_3 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_4 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_5 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_6 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_7 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_8 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_9 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_10 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_11 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_12 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_13 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_14 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_15 | VARCHAR | 10 | Sim | - | - |
| VL_IND_2_16 | VARCHAR | 10 | Sim | - | - |
| VL_D3 | INTEGER | 4 | Sim | - | - |
| VL_IND_3_1 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_2 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_3 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_4 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_5 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_6 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_7 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_8 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_9 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_10 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_11 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_12 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_13 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_14 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_15 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_16 | VARCHAR | 10 | Sim | - | - |
| VL_IND_3_17 | VARCHAR | 10 | Sim | - | - |
| DT_CADASTRO | TIMESTAMP | 10,6 | Sim | - | - |
| VL_IND_3_18 | VARCHAR | 10 | Sim | - | - |

---

## AVAL_MEC_CURSO_IES

**Tipo:** T
**Colunas:** 4
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| CO_AVALIACAO | INTEGER | 4 | Sim | - | - |
| NOME_CURSO | VARCHAR | 255 | Sim | - | - |
| NOME_IES | VARCHAR | 255 | Sim | - | - |
| UF | CHARACTER | 2 | Sim | - | - |

---

## AVAL_MEC_CURSO_IES_CALCULO

**Tipo:** T
**Colunas:** 10
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| NU_ANO_EDICAO | INTEGER | 4 | Sim | - | - |
| CO_IES | INTEGER | 4 | Sim | - | - |
| NO_IES | VARCHAR | 255 | Sim | - | - |
| SG_IES | VARCHAR | 50 | Sim | - | - |
| CO_CATEGORIA_ADM | INTEGER | 4 | Sim | - | - |
| DS_CATEGORIA_ADM | VARCHAR | 255 | Sim | - | - |
| DS_CATEGORIA_ADM_RES | VARCHAR | 100 | Sim | - | - |
| CO_ORG_ACADEMICA | INTEGER | 4 | Sim | - | - |
| DS_ORG_ACADEMICA | VARCHAR | 150 | Sim | - | - |
| CO_PROJETO | INTEGER | 4 | Sim | - | - |

---

## AVAL_MEC_CURSO_UNIDADE_CALCULO

**Tipo:** T
**Colunas:** 10
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| NU_ANO_EDICAO | INTEGER | 4 | Sim | - | - |
| CO_UNIDADE_CALCULO | INTEGER | 4 | Sim | - | - |
| CO_AREA | INTEGER | 4 | Sim | - | - |
| NO_AREA | VARCHAR | 255 | Sim | - | - |
| CO_IES | INTEGER | 4 | Sim | - | - |
| CO_MUNICIPIO | INTEGER | 4 | Sim | - | - |
| NO_MUNICIPIO | VARCHAR | 255 | Sim | - | - |
| CO_CURSO | INTEGER | 4 | Sim | - | - |
| NO_CURSO | VARCHAR | 500 | Sim | - | - |
| CO_PROJETO | INTEGER | 4 | Sim | - | - |

---

## AVAL_MEC_INDICADORES

**Tipo:** T
**Colunas:** 3
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| DIMENSAO_INDICADOR | VARCHAR | 30 | Sim | - | - |
| DESCRICAO | VARCHAR | 1024 | Sim | - | - |
| ID_INDICADOR | INTEGER | 4 | Sim | - | - |

---

## CAPES_DISCENTES_2021

**Tipo:** T
**Colunas:** 7
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| AN_BASE | INTEGER | 4 | Sim | - | - |
| CD_AREA_AVALIACAO | INTEGER | 4 | Sim | - | - |
| CD_ENTIDADE_CAPES | DOUBLE | 8 | Sim | - | - |
| CD_ENTIDADE_EMEC | DOUBLE | 8 | Sim | - | - |
| SG_ENTIDADE_ENSINO | VARCHAR | 50 | Sim | - | - |
| CD_PROGRAMA_IES | VARCHAR | 50 | Sim | - | - |
| ID_PESSOA | DOUBLE | 8 | Sim | - | - |

---

## CAPES_DISCENTES_2022

**Tipo:** T
**Colunas:** 7
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| AN_BASE | INTEGER | 4 | Sim | - | - |
| CD_AREA_AVALIACAO | INTEGER | 4 | Sim | - | - |
| CD_ENTIDADE_CAPES | DOUBLE | 8 | Sim | - | - |
| CD_ENTIDADE_EMEC | DOUBLE | 8 | Sim | - | - |
| SG_ENTIDADE_ENSINO | VARCHAR | 50 | Sim | - | - |
| CD_PROGRAMA_IES | VARCHAR | 50 | Sim | - | - |
| ID_PESSOA | DOUBLE | 8 | Sim | - | - |

---

## CENSO_CATEGORIAS_ADMINISTRATIVAS

**Tipo:** T
**Colunas:** 2
**Chaves primárias:** ID_CATEGORIA_ADMINISTRATIVA, ID_CATEGORIA_ADMINISTRATIVA

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| ID_CATEGORIA_ADMINISTRATIVA | INTEGER | 4 | Não | - | - |
| DESCR_CATEGORIA_ADMINISTRATIVA | VARCHAR | 128 | Sim | - | - |

---

## CENSO_CINE_AREA_DETALHADA

**Tipo:** T
**Colunas:** 3
**Chaves primárias:** COD_CINE_AREA_DETALHADA

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| COD_CINE_AREA_DETALHADA | CHARACTER | 4 | Não | - | - |
| DESCR_CINE_AREA_DETALHADA | VARCHAR | 128 | Sim | - | - |
| COD_CINE_AREA_ESPECIFICA | CHARACTER | 3 | Sim | - | - |

---

## CENSO_CINE_AREA_ESPECIFICA

**Tipo:** T
**Colunas:** 3
**Chaves primárias:** COD_CINE_AREA_ESPECIFICA

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| COD_CINE_AREA_ESPECIFICA | CHARACTER | 3 | Não | - | - |
| DESCR_CINE_AREA_ESPECIFICA | VARCHAR | 128 | Sim | - | - |
| COD_CINE_AREA_GERAL | CHARACTER | 2 | Sim | - | - |

---

## CENSO_CINE_AREA_GERAL

**Tipo:** T
**Colunas:** 2
**Chaves primárias:** COD_CINE_AREA_GERAL

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| COD_CINE_AREA_GERAL | CHARACTER | 2 | Não | - | - |
| DESCR_CINE_AREA_GERAL | VARCHAR | 128 | Sim | - | - |

---

## CENSO_CINE_ROTULO

**Tipo:** T
**Colunas:** 5
**Chaves primárias:** COD_CINE_ROTULO

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| COD_CINE_ROTULO | CHARACTER | 7 | Não | - | - |
| DESCR_CINE_ROTULO | VARCHAR | 128 | Sim | - | - |
| COD_CINE_AREA_DETALHADA | CHARACTER | 4 | Sim | - | - |
| AREA_TCU_1 | CHARACTER | 3 | Sim | - | - |
| AREA_TCU_2 | CHARACTER | 3 | Sim | - | - |

---

## CENSO_CURSO_VAGAS_BRUTO

**Tipo:** T
**Colunas:** 203
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| NU_ANO_CENSO | INTEGER | 4 | Não | - | - |
| NO_REGIAO | VARCHAR | 20 | Sim | - | - |
| CO_REGIAO | SMALLINT | 2 | Sim | - | - |
| NO_UF | VARCHAR | 50 | Sim | - | - |
| SG_UF | VARCHAR | 2 | Sim | - | - |
| CO_UF | INTEGER | 4 | Sim | - | - |
| NO_MUNICIPIO | VARCHAR | 150 | Sim | - | - |
| CO_MUNICIPIO | INTEGER | 4 | Sim | - | - |
| IN_CAPITAL | SMALLINT | 2 | Sim | - | - |
| TP_DIMENSAO | SMALLINT | 2 | Sim | - | - |
| TP_LOC_OFERTA_CURSO | SMALLINT | 2 | Sim | - | - |
| TP_ORGANIZACAO_ACADEMICA | SMALLINT | 2 | Sim | - | - |
| TP_CATEGORIA_ADMINISTRATIVA | SMALLINT | 2 | Sim | - | - |
| TP_REDE | SMALLINT | 2 | Sim | - | - |
| CO_IES | INTEGER | 4 | Sim | - | - |
| NO_CURSO | VARCHAR | 200 | Sim | - | - |
| CO_CURSO | INTEGER | 4 | Não | - | - |
| NO_CINE_ROTULO | VARCHAR | 120 | Sim | - | - |
| CO_CINE_ROTULO | VARCHAR | 10 | Sim | - | - |
| CO_CINE_AREA_GERAL | VARCHAR | 2 | Sim | - | - |
| NO_CINE_AREA_GERAL | VARCHAR | 120 | Sim | - | - |
| CO_CINE_AREA_ESPECIFICA | VARCHAR | 3 | Sim | - | - |
| NO_CINE_AREA_ESPECIFICA | VARCHAR | 120 | Sim | - | - |
| CO_CINE_AREA_DETALHADA | VARCHAR | 4 | Sim | - | - |
| NO_CINE_AREA_DETALHADA | VARCHAR | 120 | Sim | - | - |
| TP_GRAU_ACADEMICO | SMALLINT | 2 | Sim | - | - |
| IN_GRATUITO | SMALLINT | 2 | Sim | - | - |
| TP_MODALIDADE_ENSINO | SMALLINT | 2 | Sim | - | - |
| TP_NIVEL_ACADEMICO | SMALLINT | 2 | Sim | - | - |
| QT_CURSO | INTEGER | 4 | Sim | - | - |
| QT_VAGA_TOTAL | INTEGER | 4 | Sim | - | - |
| QT_VAGA_TOTAL_DIURNO | INTEGER | 4 | Sim | - | - |
| QT_VAGA_TOTAL_NOTURNO | INTEGER | 4 | Sim | - | - |
| QT_VAGA_TOTAL_EAD | INTEGER | 4 | Sim | - | - |
| QT_VG_NOVA | INTEGER | 4 | Sim | - | - |
| QT_VG_PROC_SELETIVO | INTEGER | 4 | Sim | - | - |
| QT_VG_REMANESC | INTEGER | 4 | Sim | - | - |
| QT_VG_PROG_ESPECIAL | INTEGER | 4 | Sim | - | - |
| QT_INSCRITO_TOTAL | INTEGER | 4 | Sim | - | - |
| QT_INSCRITO_TOTAL_DIURNO | INTEGER | 4 | Sim | - | - |
| QT_INSCRITO_TOTAL_NOTURNO | INTEGER | 4 | Sim | - | - |
| QT_INSCRITO_TOTAL_EAD | INTEGER | 4 | Sim | - | - |
| QT_INSC_VG_NOVA | INTEGER | 4 | Sim | - | - |
| QT_INSC_PROC_SELETIVO | INTEGER | 4 | Sim | - | - |
| QT_INSC_VG_REMANESC | INTEGER | 4 | Sim | - | - |
| QT_INSC_VG_PROG_ESPECIAL | INTEGER | 4 | Sim | - | - |
| QT_ING | INTEGER | 4 | Sim | - | - |
| QT_ING_FEM | INTEGER | 4 | Sim | - | - |
| QT_ING_MASC | INTEGER | 4 | Sim | - | - |
| QT_ING_DIURNO | INTEGER | 4 | Sim | - | - |
| QT_ING_NOTURNO | INTEGER | 4 | Sim | - | - |
| QT_ING_VG_NOVA | INTEGER | 4 | Sim | - | - |
| QT_ING_VESTIBULAR | INTEGER | 4 | Sim | - | - |
| QT_ING_ENEM | INTEGER | 4 | Sim | - | - |
| QT_ING_AVALIACAO_SERIADA | INTEGER | 4 | Sim | - | - |
| QT_ING_SELECAO_SIMPLIFICA | INTEGER | 4 | Sim | - | - |
| QT_ING_EGR | INTEGER | 4 | Sim | - | - |
| QT_ING_OUTRO_TIPO_SELECAO | INTEGER | 4 | Sim | - | - |
| QT_ING_PROC_SELETIVO | INTEGER | 4 | Sim | - | - |
| QT_ING_VG_REMANESC | INTEGER | 4 | Sim | - | - |
| QT_ING_VG_PROG_ESPECIAL | INTEGER | 4 | Sim | - | - |
| QT_ING_OUTRA_FORMA | INTEGER | 4 | Sim | - | - |
| QT_ING_0_17 | INTEGER | 4 | Sim | - | - |
| QT_ING_18_24 | INTEGER | 4 | Sim | - | - |
| QT_ING_25_29 | INTEGER | 4 | Sim | - | - |
| QT_ING_30_34 | INTEGER | 4 | Sim | - | - |
| QT_ING_35_39 | INTEGER | 4 | Sim | - | - |
| QT_ING_40_49 | INTEGER | 4 | Sim | - | - |
| QT_ING_50_59 | INTEGER | 4 | Sim | - | - |
| QT_ING_60_MAIS | INTEGER | 4 | Sim | - | - |
| QT_ING_BRANCA | INTEGER | 4 | Sim | - | - |
| QT_ING_PRETA | INTEGER | 4 | Sim | - | - |
| QT_ING_PARDA | INTEGER | 4 | Sim | - | - |
| QT_ING_AMARELA | INTEGER | 4 | Sim | - | - |
| QT_ING_INDIGENA | INTEGER | 4 | Sim | - | - |
| QT_ING_CORND | INTEGER | 4 | Sim | - | - |
| QT_MAT | INTEGER | 4 | Sim | - | - |
| QT_MAT_FEM | INTEGER | 4 | Sim | - | - |
| QT_MAT_MASC | INTEGER | 4 | Sim | - | - |
| QT_MAT_DIURNO | INTEGER | 4 | Sim | - | - |
| QT_MAT_NOTURNO | INTEGER | 4 | Sim | - | - |
| QT_MAT_0_17 | INTEGER | 4 | Sim | - | - |
| QT_MAT_18_24 | INTEGER | 4 | Sim | - | - |
| QT_MAT_25_29 | INTEGER | 4 | Sim | - | - |
| QT_MAT_30_34 | INTEGER | 4 | Sim | - | - |
| QT_MAT_35_39 | INTEGER | 4 | Sim | - | - |
| QT_MAT_40_49 | INTEGER | 4 | Sim | - | - |
| QT_MAT_50_59 | INTEGER | 4 | Sim | - | - |
| QT_MAT_60_MAIS | INTEGER | 4 | Sim | - | - |
| QT_MAT_BRANCA | INTEGER | 4 | Sim | - | - |
| QT_MAT_PRETA | INTEGER | 4 | Sim | - | - |
| QT_MAT_PARDA | INTEGER | 4 | Sim | - | - |
| QT_MAT_AMARELA | INTEGER | 4 | Sim | - | - |
| QT_MAT_INDIGENA | INTEGER | 4 | Sim | - | - |
| QT_MAT_CORND | INTEGER | 4 | Sim | - | - |
| QT_CONC | INTEGER | 4 | Sim | - | - |
| QT_CONC_FEM | INTEGER | 4 | Sim | - | - |
| QT_CONC_MASC | INTEGER | 4 | Sim | - | - |
| QT_CONC_DIURNO | INTEGER | 4 | Sim | - | - |
| QT_CONC_NOTURNO | INTEGER | 4 | Sim | - | - |
| QT_CONC_0_17 | INTEGER | 4 | Sim | - | - |
| QT_CONC_18_24 | INTEGER | 4 | Sim | - | - |
| QT_CONC_25_29 | INTEGER | 4 | Sim | - | - |
| QT_CONC_30_34 | INTEGER | 4 | Sim | - | - |
| QT_CONC_35_39 | INTEGER | 4 | Sim | - | - |
| QT_CONC_40_49 | INTEGER | 4 | Sim | - | - |
| QT_CONC_50_59 | INTEGER | 4 | Sim | - | - |
| QT_CONC_60_MAIS | INTEGER | 4 | Sim | - | - |
| QT_CONC_BRANCA | INTEGER | 4 | Sim | - | - |
| QT_CONC_PRETA | INTEGER | 4 | Sim | - | - |
| QT_CONC_PARDA | INTEGER | 4 | Sim | - | - |
| QT_CONC_AMARELA | INTEGER | 4 | Sim | - | - |
| QT_CONC_INDIGENA | INTEGER | 4 | Sim | - | - |
| QT_CONC_CORND | INTEGER | 4 | Sim | - | - |
| QT_ING_NACBRAS | INTEGER | 4 | Sim | - | - |
| QT_ING_NACESTRANG | INTEGER | 4 | Sim | - | - |
| QT_MAT_NACBRAS | INTEGER | 4 | Sim | - | - |
| QT_MAT_NACESTRANG | INTEGER | 4 | Sim | - | - |
| QT_CONC_NACBRAS | INTEGER | 4 | Sim | - | - |
| QT_CONC_NACESTRANG | INTEGER | 4 | Sim | - | - |
| QT_ALUNO_DEFICIENTE | INTEGER | 4 | Sim | - | - |
| QT_ING_ALUNO_DEFICIENTE | INTEGER | 4 | Sim | - | - |
| QT_MAT_ALUNO_DEFICIENTE | INTEGER | 4 | Sim | - | - |
| QT_CONC_ALUNO_DEFICIENTE | INTEGER | 4 | Sim | - | - |
| QT_ING_FINANC | INTEGER | 4 | Sim | - | - |
| QT_ING_FINANC_REEMB | INTEGER | 4 | Sim | - | - |
| QT_ING_FIES | INTEGER | 4 | Sim | - | - |
| QT_ING_RPFIES | INTEGER | 4 | Sim | - | - |
| QT_ING_FINANC_REEMB_OUTROS | INTEGER | 4 | Sim | - | - |
| QT_ING_FINANC_NREEMB | INTEGER | 4 | Sim | - | - |
| QT_ING_PROUNII | INTEGER | 4 | Sim | - | - |
| QT_ING_PROUNIP | INTEGER | 4 | Sim | - | - |
| QT_ING_NRPFIES | INTEGER | 4 | Sim | - | - |
| QT_ING_FINANC_NREEMB_OUTROS | INTEGER | 4 | Sim | - | - |
| QT_MAT_FINANC | INTEGER | 4 | Sim | - | - |
| QT_MAT_FINANC_REEMB | INTEGER | 4 | Sim | - | - |
| QT_MAT_FIES | INTEGER | 4 | Sim | - | - |
| QT_MAT_RPFIES | INTEGER | 4 | Sim | - | - |
| QT_MAT_FINANC_REEMB_OUTROS | INTEGER | 4 | Sim | - | - |
| QT_MAT_FINANC_NREEMB | INTEGER | 4 | Sim | - | - |
| QT_MAT_PROUNII | INTEGER | 4 | Sim | - | - |
| QT_MAT_PROUNIP | INTEGER | 4 | Sim | - | - |
| QT_MAT_NRPFIES | INTEGER | 4 | Sim | - | - |
| QT_MAT_FINANC_NREEMB_OUTROS | INTEGER | 4 | Sim | - | - |
| QT_CONC_FINANC | INTEGER | 4 | Sim | - | - |
| QT_CONC_FINANC_REEMB | INTEGER | 4 | Sim | - | - |
| QT_CONC_FIES | INTEGER | 4 | Sim | - | - |
| QT_CONC_RPFIES | INTEGER | 4 | Sim | - | - |
| QT_CONC_FINANC_REEMB_OUTROS | INTEGER | 4 | Sim | - | - |
| QT_CONC_FINANC_NREEMB | INTEGER | 4 | Sim | - | - |
| QT_CONC_PROUNII | INTEGER | 4 | Sim | - | - |
| QT_CONC_PROUNIP | INTEGER | 4 | Sim | - | - |
| QT_CONC_NRPFIES | INTEGER | 4 | Sim | - | - |
| QT_CONC_FINANC_NREEMB_OUTROS | INTEGER | 4 | Sim | - | - |
| QT_ING_RESERVA_VAGA | INTEGER | 4 | Sim | - | - |
| QT_ING_RVREDEPUBLICA | INTEGER | 4 | Sim | - | - |
| QT_ING_RVETINICO | INTEGER | 4 | Sim | - | - |
| QT_ING_RVPDEF | INTEGER | 4 | Sim | - | - |
| QT_ING_RVSOCIAL_RF | INTEGER | 4 | Sim | - | - |
| QT_ING_RVOUTROS | INTEGER | 4 | Sim | - | - |
| QT_MAT_RESERVA_VAGA | INTEGER | 4 | Sim | - | - |
| QT_MAT_RVREDEPUBLICA | INTEGER | 4 | Sim | - | - |
| QT_MAT_RVETINICO | INTEGER | 4 | Sim | - | - |
| QT_MAT_RVPDEF | INTEGER | 4 | Sim | - | - |
| QT_MAT_RVSOCIAL_RF | INTEGER | 4 | Sim | - | - |
| QT_MAT_RVOUTROS | INTEGER | 4 | Sim | - | - |
| QT_CONC_RESERVA_VAGA | INTEGER | 4 | Sim | - | - |
| QT_CONC_RVREDEPUBLICA | INTEGER | 4 | Sim | - | - |
| QT_CONC_RVETINICO | INTEGER | 4 | Sim | - | - |
| QT_CONC_RVPDEF | INTEGER | 4 | Sim | - | - |
| QT_CONC_RVSOCIAL_RF | INTEGER | 4 | Sim | - | - |
| QT_CONC_RVOUTROS | INTEGER | 4 | Sim | - | - |
| QT_SIT_TRANCADA | INTEGER | 4 | Sim | - | - |
| QT_SIT_DESVINCULADO | INTEGER | 4 | Sim | - | - |
| QT_SIT_TRANSFERIDO | INTEGER | 4 | Sim | - | - |
| QT_SIT_FALECIDO | INTEGER | 4 | Sim | - | - |
| QT_ING_PROCESCPUBLICA | INTEGER | 4 | Sim | - | - |
| QT_ING_PROCESCPRIVADA | INTEGER | 4 | Sim | - | - |
| QT_ING_PROCNAOINFORMADA | INTEGER | 4 | Sim | - | - |
| QT_MAT_PROCESCPUBLICA | INTEGER | 4 | Sim | - | - |
| QT_MAT_PROCESCPRIVADA | INTEGER | 4 | Sim | - | - |
| QT_MAT_PROCNAOINFORMADA | INTEGER | 4 | Sim | - | - |
| QT_CONC_PROCESCPUBLICA | INTEGER | 4 | Sim | - | - |
| QT_CONC_PROCESCPRIVADA | INTEGER | 4 | Sim | - | - |
| QT_CONC_PROCNAOINFORMADA | INTEGER | 4 | Sim | - | - |
| QT_PARFOR | INTEGER | 4 | Sim | - | - |
| QT_ING_PARFOR | INTEGER | 4 | Sim | - | - |
| QT_MAT_PARFOR | INTEGER | 4 | Sim | - | - |
| QT_CONC_PARFOR | INTEGER | 4 | Sim | - | - |
| QT_APOIO_SOCIAL | INTEGER | 4 | Sim | - | - |
| QT_ING_APOIO_SOCIAL | INTEGER | 4 | Sim | - | - |
| QT_MAT_APOIO_SOCIAL | INTEGER | 4 | Sim | - | - |
| QT_CONC_APOIO_SOCIAL | INTEGER | 4 | Sim | - | - |
| QT_ATIV_EXTRACURRICULAR | INTEGER | 4 | Sim | - | - |
| QT_ING_ATIV_EXTRACURRICULAR | INTEGER | 4 | Sim | - | - |
| QT_MAT_ATIV_EXTRACURRICULAR | INTEGER | 4 | Sim | - | - |
| QT_CONC_ATIV_EXTRACURRICULAR | INTEGER | 4 | Sim | - | - |
| QT_MOB_ACADEMICA | INTEGER | 4 | Sim | - | - |
| QT_ING_MOB_ACADEMICA | INTEGER | 4 | Sim | - | - |
| QT_MAT_MOB_ACADEMICA | INTEGER | 4 | Sim | - | - |
| QT_CONC_MOB_ACADEMICA | INTEGER | 4 | Sim | - | - |
| IN_COMUNITARIA | SMALLINT | 2 | Sim | - | - |
| IN_CONFESSIONAL | SMALLINT | 2 | Sim | - | - |

---

## CENSO_CURSOS

**Tipo:** T
**Colunas:** 21
**Chaves primárias:** ID_CURSO, ID_CURSO, ID_CURSO, ID_DISCIPLINA, ID_CURSO, ID_CURSO, COD_CURSO, ID_CURSO, ID_CURSO, ID_CURSO, COD_CURSO, COD_CURSO, COD_CURSO

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| COD_CURSO | INTEGER | 4 | Não | - | - |
| NOME_CURSO | VARCHAR | 254 | Sim | - | - |
| COD_IES | INTEGER | 4 | Sim | - | - |
| COD_MUNICIPIO | CHARACTER | 7 | Sim | - | - |
| ID_GRAU_ACADEMICO | SMALLINT | 2 | Sim | - | - |
| ID_MODALIDADE_ENSINO | SMALLINT | 2 | Sim | - | - |
| ID_NIVEL_ACADEMICO | SMALLINT | 2 | Sim | - | - |
| ID_ATRIBUTO_INGRESSO | SMALLINT | 2 | Sim | - | - |
| DT_INICIO_FUNCIONAMENTO | DATE | 4 | Sim | - | - |
| COD_AREA | INTEGER | 4 | Sim | - | - |
| TURNO_CURSO | CHARACTER | 1 | Sim | - | - |
| CC_ANO | SMALLINT | 2 | Sim | - | - |
| CC_FAIXA | SMALLINT | 2 | Sim | - | - |
| COD_CINE_ROTULO | CHARACTER | 7 | Sim | - | - |
| COD_AREA_TCU | CHARACTER | 3 | Sim | - | - |
| ID_CENTRO_UFSM | INTEGER | 4 | Sim | - | - |
| NOME_CURSO_AJUSTADO | VARCHAR | 300 | Sim | - | - |
| ID_CURSO | INTEGER | 4 | Sim | - | - |
| COD_CINE_ROTULO_N | VARCHAR | 8 | Sim | - | - |
| COD_CINE_AREA_GERAL | VARCHAR | 8 | Sim | - | - |
| TEMPO_INTEGRALIZACAO_ANOS | DOUBLE | 8 | Sim | - | - |

---

## CENSO_GRAUS_ACADEMICOS

**Tipo:** T
**Colunas:** 2
**Chaves primárias:** ID_GRAU_ACADEMICO

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| ID_GRAU_ACADEMICO | INTEGER | 4 | Não | - | - |
| DESCR_GRAU_ACADEMICO | VARCHAR | 128 | Sim | - | - |

---

## CENSO_IES

**Tipo:** T
**Colunas:** 8
**Chaves primárias:** COD_IES, COD_IES, COD_IES

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| COD_IES | INTEGER | 4 | Não | - | - |
| NOME_IES | VARCHAR | 254 | Sim | - | - |
| SIGLA_IES | VARCHAR | 30 | Sim | - | - |
| COD_MANTENEDORA | INTEGER | 4 | Sim | - | - |
| ID_CATEGORIA_ADMINISTRATIVA | INTEGER | 4 | Sim | - | - |
| ID_ORGANIZACAO_ACADEMICA | INTEGER | 4 | Sim | - | - |
| COD_MUNICIPIO | CHARACTER | 7 | Sim | - | - |
| IN_CAPITAL | SMALLINT | 2 | Sim | - | - |

---

## CENSO_MODALIDADES_ENSINO

**Tipo:** T
**Colunas:** 2
**Chaves primárias:** ID_MODALIDADE_ENSINO

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| ID_MODALIDADE_ENSINO | INTEGER | 4 | Não | - | - |
| DESCR_MODALIDADE_ENSINO | VARCHAR | 128 | Sim | - | - |

---

## CENSO_NIVEIS_ACADEMICOS

**Tipo:** T
**Colunas:** 2
**Chaves primárias:** ID_NIVEL_ACADEMICO

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| ID_NIVEL_ACADEMICO | INTEGER | 4 | Não | - | - |
| DESCR_NIVEL_ACADEMICO | VARCHAR | 128 | Sim | - | - |

---

## CENSO_ORGANIZACOES_ACADEMICAS

**Tipo:** T
**Colunas:** 2
**Chaves primárias:** ID_ORGANIZACAO_ACADEMICA, ID_ORGANIZACAO_ACADEMICA, ID_ORGANIZACAO_ACADEMICA

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| ID_ORGANIZACAO_ACADEMICA | INTEGER | 4 | Não | - | - |
| DESCR_ORGANIZACAO_ACADEMICA | VARCHAR | 128 | Sim | - | - |

---

## DADOS_CPC

**Tipo:** T
**Colunas:** 29
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| ID | INTEGER | 4 | Sim | - | - |
| ANO | INTEGER | 4 | Sim | - | - |
| CO_IES | INTEGER | 4 | Sim | - | - |
| CO_CURSO | INTEGER | 4 | Sim | - | - |
| CONC_INSCRITOS | INTEGER | 4 | Sim | - | - |
| CONC_PARTICIPANTES | INTEGER | 4 | Sim | - | - |
| N_BRUTA_FG | DECIMAL | 20,15 | Sim | - | - |
| N_BRUTA_CE | DECIMAL | 20,15 | Sim | - | - |
| ENADE_CONTINUO | DECIMAL | 20,15 | Sim | - | - |
| CONC_PART_N_ENEN | INTEGER | 4 | Sim | - | - |
| PERC_CONC_PART_N_ENEM | DECIMAL | 20,15 | Sim | - | - |
| NB_IDD | DECIMAL | 20,15 | Sim | - | - |
| NP_IDD | DECIMAL | 20,15 | Sim | - | - |
| NB_ORG_DID_PEDAG | DECIMAL | 20,15 | Sim | - | - |
| NP_ORG_DID_PEDAG | DECIMAL | 20,15 | Sim | - | - |
| NB_INFRA_FISICA | DECIMAL | 20,15 | Sim | - | - |
| NP_INFRA_FISICA | DECIMAL | 20,15 | Sim | - | - |
| NB_AMPLIACAO_FORMACAO | DECIMAL | 20,15 | Sim | - | - |
| NP_AMPLIACAO_FORMACAO | DECIMAL | 20,15 | Sim | - | - |
| NB_MESTRES | DECIMAL | 20,15 | Sim | - | - |
| NP_MESTRES | DECIMAL | 20,15 | Sim | - | - |
| NB_DOUTORES | DECIMAL | 20,15 | Sim | - | - |
| NP_DOUTORES | DECIMAL | 20,15 | Sim | - | - |
| NB_REGIME_TRAB | DECIMAL | 20,15 | Sim | - | - |
| NP_REGIME_TRAB | DECIMAL | 20,15 | Sim | - | - |
| CPC_CONTINUO | DECIMAL | 20,15 | Sim | - | - |
| CPC_FAIXA | INTEGER | 4 | Sim | - | - |
| N_PADRONIZADA_FG | DECIMAL | 20,15 | Sim | - | - |
| N_PADRONIZADA_CE | DECIMAL | 20,15 | Sim | - | - |

---

## DADOS_ENADE

**Tipo:** T
**Colunas:** 10
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| ID | INTEGER | 4 | Sim | - | - |
| ANO | INTEGER | 4 | Sim | - | - |
| CO_IES | INTEGER | 4 | Sim | - | - |
| CO_CURSO | INTEGER | 4 | Sim | - | - |
| ENADE_CONTINUO | DECIMAL | 20,15 | Sim | - | - |
| ENADE_FAIXA | VARCHAR | 15 | Sim | - | - |
| N_BRUTA_FG | DECIMAL | 20,15 | Sim | - | - |
| N_PADRONIZADA_FG | DECIMAL | 20,15 | Sim | - | - |
| N_BRUTA_CE | DECIMAL | 20,15 | Sim | - | - |
| N_PADRONIZADA_CE | DECIMAL | 20,15 | Sim | - | - |

---

## DADOS_ENADE_PERCEPCAO_QE_I01

**Tipo:** T
**Descrição:** Qual o seu estado civil?
**Colunas:** 3
**Chaves primárias:** Nenhuma

### Colunas

| Nome | Tipo | Tamanho | Nulo | Padrão | Comentário |
|------|------|---------|------|--------|------------|
| NU_ANO | INTEGER | 4 | Sim | - | - |
| CO_CURSO | INTEGER | 4 | Sim | - | - |
| QE_I01 | CHARACTER | 1 | Sim | - | 
A = Solteiro(a).
B = Casado(a).
C = Separado(a) judicialmente/divorciado(a).
D = Vi�vo(a).
E = Outro. |

---

