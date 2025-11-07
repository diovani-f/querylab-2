# Schema inep

**Descoberto:** 06/11/2025, 19:57:27
**Total de tabelas:** 50

## capes_cursos_bruto
**Colunas:** 28

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| an_base | integer | ✓ |  |
| nm_grande_area_conhecimento | character varying | ✓ |  |
| nm_area_conhecimento | character varying | ✓ |  |
| nm_subarea_conhecimento | character varying | ✓ |  |
| nm_especialidade | character varying | ✓ |  |
| cd_area_avaliacao | character varying | ✓ |  |
| nm_area_avaliacao | character varying | ✓ |  |
| cd_entidade_capes | character varying | ✓ |  |
| cd_entidade_emec | character varying | ✓ |  |
| sg_entidade_ensino | character varying | ✓ |  |
| nm_entidade_ensino | character varying | ✓ |  |
| cs_status_juridico | character varying | ✓ |  |
| ds_dependencia_administrativa | character varying | ✓ |  |
| ds_organizacao_academica | character varying | ✓ |  |
| nm_regiao | character varying | ✓ |  |
| sg_uf_programa | character varying | ✓ |  |
| nm_municipio_programa_ies | character varying | ✓ |  |
| cd_programa_ies | character varying | ✓ |  |
| nm_programa_ies | character varying | ✓ |  |
| cd_curso_ppg | character varying | ✓ |  |
| nm_curso | character varying | ✓ |  |
| nm_grau_curso | character varying | ✓ |  |
| cd_conceito_curso | integer | ✓ |  |
| an_inicio_previsto | integer | ✓ |  |
| ds_situacao_curso | character varying | ✓ |  |
| dt_situacao_curso | character varying | ✓ |  |
| id_add_foto_programa_ies | integer | ✓ |  |
| id_add_foto_programa | integer | ✓ |  |

---

## capes_programas_bruto
**Colunas:** 34

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| an_base | integer | ✓ |  |
| nm_grande_area_conhecimento | character varying | ✓ |  |
| nm_area_conhecimento | character varying | ✓ |  |
| nm_area_basica | character varying | ✓ |  |
| nm_subarea_conhecimento | character varying | ✓ |  |
| nm_especialidade | character varying | ✓ |  |
| cd_area_avaliacao | character varying | ✓ |  |
| nm_area_avaliacao | character varying | ✓ |  |
| cd_entidade_capes | character varying | ✓ |  |
| cd_entidade_emec | character varying | ✓ |  |
| sg_entidade_ensino | character varying | ✓ |  |
| nm_entidade_ensino | character varying | ✓ |  |
| cs_status_juridico | character varying | ✓ |  |
| ds_dependencia_administrativa | character varying | ✓ |  |
| ds_organizacao_academica | character varying | ✓ |  |
| nm_regiao | character varying | ✓ |  |
| nm_municipio_programa_ies | character varying | ✓ |  |
| nm_modalidade_programa | character varying | ✓ |  |
| cd_programa_ies | character varying | ✓ |  |
| nm_programa_ies | character varying | ✓ |  |
| nm_programa_idioma | character varying | ✓ |  |
| sg_uf_programa | character varying | ✓ |  |
| nm_grau_programa | character varying | ✓ |  |
| cd_conceito_programa | character varying | ✓ |  |
| ano_inicio_programa | character varying | ✓ |  |
| an_inicio_curso | character varying | ✓ |  |
| in_rede | character varying | ✓ |  |
| sg_entidade_ensino_rede | character varying | ✓ |  |
| ds_situacao_programa | character varying | ✓ |  |
| dt_situacao_programa | character varying | ✓ |  |
| id_add_foto_programa_ies | integer | ✓ |  |
| id_add_foto_programa | integer | ✓ |  |
| ds_clientela_quadrienal_2017 | character varying | ✓ |  |
| an_inicio_programa | integer | ✓ |  |

---

## censo_categorias_administrativas
**Colunas:** 3

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id_categoria_administrativa | integer | ✗ | 🔑 |
| descr_categoria_administrativa | character varying | ✓ |  |
| descr_cat_adm_agrupada | character varying | ✓ |  |

---

## censo_cine_area_detalhada
**Colunas:** 3

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_cine_area_detalhada | character | ✗ | 🔑 |
| descr_cine_area_detalhada | character varying | ✓ |  |
| cod_cine_area_especifica | character | ✓ |  |

---

## censo_cine_area_geral
**Colunas:** 2

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_cine_area_geral | character | ✗ | 🔑 |
| descr_cine_area_geral | character varying | ✓ |  |

---

## censo_cine_rotulo
**Colunas:** 5

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_cine_rotulo | character | ✗ | 🔑 |
| descr_cine_rotulo | character varying | ✓ |  |
| cod_cine_area_detalhada | character | ✓ |  |
| area_tcu_1 | character | ✓ |  |
| area_tcu_2 | character | ✓ |  |

---

## censo_curso_vagas_bruto
**Colunas:** 202

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| nu_ano_censo | integer | ✓ |  |
| no_regiao | character varying | ✓ |  |
| co_regiao | integer | ✓ |  |
| no_uf | character varying | ✓ |  |
| sg_uf | character varying | ✓ |  |
| co_uf | integer | ✓ |  |
| no_municipio | character varying | ✓ |  |
| co_municipio | integer | ✓ |  |
| in_capital | integer | ✓ |  |
| tp_dimensao | integer | ✓ |  |
| tp_organizacao_academica | integer | ✓ |  |
| tp_rede | integer | ✓ |  |
| tp_categoria_administrativa | integer | ✓ |  |
| in_comunitaria | integer | ✓ |  |
| in_confessional | integer | ✓ |  |
| co_ies | integer | ✓ |  |
| no_curso | character varying | ✓ |  |
| co_curso | integer | ✓ |  |
| no_cine_rotulo | character varying | ✓ |  |
| co_cine_rotulo | character varying | ✓ |  |
| co_cine_area_geral | integer | ✓ |  |
| no_cine_area_geral | character varying | ✓ |  |
| co_cine_area_especifica | integer | ✓ |  |
| no_cine_area_especifica | character varying | ✓ |  |
| co_cine_area_detalhada | integer | ✓ |  |
| no_cine_area_detalhada | character varying | ✓ |  |
| tp_grau_academico | integer | ✓ |  |
| in_gratuito | integer | ✓ |  |
| tp_modalidade_ensino | integer | ✓ |  |
| tp_nivel_academico | integer | ✓ |  |
| qt_curso | integer | ✓ |  |
| qt_vg_total | integer | ✓ |  |
| qt_vg_total_diurno | integer | ✓ |  |
| qt_vg_total_noturno | integer | ✓ |  |
| qt_vg_total_ead | integer | ✓ |  |
| qt_vg_nova | integer | ✓ |  |
| qt_vg_proc_seletivo | integer | ✓ |  |
| qt_vg_remanesc | integer | ✓ |  |
| qt_vg_prog_especial | integer | ✓ |  |
| qt_inscrito_total | integer | ✓ |  |
| qt_inscrito_total_diurno | integer | ✓ |  |
| qt_inscrito_total_noturno | integer | ✓ |  |
| qt_inscrito_total_ead | integer | ✓ |  |
| qt_insc_vg_nova | integer | ✓ |  |
| qt_insc_proc_seletivo | integer | ✓ |  |
| qt_insc_vg_remanesc | integer | ✓ |  |
| qt_insc_vg_prog_especial | integer | ✓ |  |
| qt_ing | integer | ✓ |  |
| qt_ing_fem | integer | ✓ |  |
| qt_ing_masc | integer | ✓ |  |
| qt_ing_diurno | integer | ✓ |  |
| qt_ing_noturno | integer | ✓ |  |
| qt_ing_vg_nova | integer | ✓ |  |
| qt_ing_vestibular | integer | ✓ |  |
| qt_ing_enem | integer | ✓ |  |
| qt_ing_avaliacao_seriada | integer | ✓ |  |
| qt_ing_selecao_simplifica | integer | ✓ |  |
| qt_ing_egr | integer | ✓ |  |
| qt_ing_outro_tipo_selecao | integer | ✓ |  |
| qt_ing_proc_seletivo | integer | ✓ |  |
| qt_ing_vg_remanesc | integer | ✓ |  |
| qt_ing_vg_prog_especial | integer | ✓ |  |
| qt_ing_outra_forma | integer | ✓ |  |
| qt_ing_0_17 | integer | ✓ |  |
| qt_ing_18_24 | integer | ✓ |  |
| qt_ing_25_29 | integer | ✓ |  |
| qt_ing_30_34 | integer | ✓ |  |
| qt_ing_35_39 | integer | ✓ |  |
| qt_ing_40_49 | integer | ✓ |  |
| qt_ing_50_59 | integer | ✓ |  |
| qt_ing_60_mais | integer | ✓ |  |
| qt_ing_branca | integer | ✓ |  |
| qt_ing_preta | integer | ✓ |  |
| qt_ing_parda | integer | ✓ |  |
| qt_ing_amarela | integer | ✓ |  |
| qt_ing_indigena | integer | ✓ |  |
| qt_ing_cornd | integer | ✓ |  |
| qt_mat | integer | ✓ |  |
| qt_mat_fem | integer | ✓ |  |
| qt_mat_masc | integer | ✓ |  |
| qt_mat_diurno | integer | ✓ |  |
| qt_mat_noturno | integer | ✓ |  |
| qt_mat_0_17 | integer | ✓ |  |
| qt_mat_18_24 | integer | ✓ |  |
| qt_mat_25_29 | integer | ✓ |  |
| qt_mat_30_34 | integer | ✓ |  |
| qt_mat_35_39 | integer | ✓ |  |
| qt_mat_40_49 | integer | ✓ |  |
| qt_mat_50_59 | integer | ✓ |  |
| qt_mat_60_mais | integer | ✓ |  |
| qt_mat_branca | integer | ✓ |  |
| qt_mat_preta | integer | ✓ |  |
| qt_mat_parda | integer | ✓ |  |
| qt_mat_amarela | integer | ✓ |  |
| qt_mat_indigena | integer | ✓ |  |
| qt_mat_cornd | integer | ✓ |  |
| qt_conc | integer | ✓ |  |
| qt_conc_fem | integer | ✓ |  |
| qt_conc_masc | integer | ✓ |  |
| qt_conc_diurno | integer | ✓ |  |
| qt_conc_noturno | integer | ✓ |  |
| qt_conc_0_17 | integer | ✓ |  |
| qt_conc_18_24 | integer | ✓ |  |
| qt_conc_25_29 | integer | ✓ |  |
| qt_conc_30_34 | integer | ✓ |  |
| qt_conc_35_39 | integer | ✓ |  |
| qt_conc_40_49 | integer | ✓ |  |
| qt_conc_50_59 | integer | ✓ |  |
| qt_conc_60_mais | integer | ✓ |  |
| qt_conc_branca | integer | ✓ |  |
| qt_conc_preta | integer | ✓ |  |
| qt_conc_parda | integer | ✓ |  |
| qt_conc_amarela | integer | ✓ |  |
| qt_conc_indigena | integer | ✓ |  |
| qt_conc_cornd | integer | ✓ |  |
| qt_ing_nacbras | integer | ✓ |  |
| qt_ing_nacestrang | integer | ✓ |  |
| qt_mat_nacbras | integer | ✓ |  |
| qt_mat_nacestrang | integer | ✓ |  |
| qt_conc_nacbras | integer | ✓ |  |
| qt_conc_nacestrang | integer | ✓ |  |
| qt_aluno_deficiente | integer | ✓ |  |
| qt_ing_deficiente | integer | ✓ |  |
| qt_mat_deficiente | integer | ✓ |  |
| qt_conc_deficiente | integer | ✓ |  |
| qt_ing_financ | integer | ✓ |  |
| qt_ing_financ_reemb | integer | ✓ |  |
| qt_ing_fies | integer | ✓ |  |
| qt_ing_rpfies | integer | ✓ |  |
| qt_ing_financ_reemb_outros | integer | ✓ |  |
| qt_ing_financ_nreemb | integer | ✓ |  |
| qt_ing_prounii | integer | ✓ |  |
| qt_ing_prounip | integer | ✓ |  |
| qt_ing_nrpfies | integer | ✓ |  |
| qt_ing_financ_nreemb_outros | integer | ✓ |  |
| qt_mat_financ | integer | ✓ |  |
| qt_mat_financ_reemb | integer | ✓ |  |
| qt_mat_fies | integer | ✓ |  |
| qt_mat_rpfies | integer | ✓ |  |
| qt_mat_financ_reemb_outros | integer | ✓ |  |
| qt_mat_financ_nreemb | integer | ✓ |  |
| qt_mat_prounii | integer | ✓ |  |
| qt_mat_prounip | integer | ✓ |  |
| qt_mat_nrpfies | integer | ✓ |  |
| qt_mat_financ_nreemb_outros | integer | ✓ |  |
| qt_conc_financ | integer | ✓ |  |
| qt_conc_financ_reemb | integer | ✓ |  |
| qt_conc_fies | integer | ✓ |  |
| qt_conc_rpfies | integer | ✓ |  |
| qt_conc_financ_reemb_outros | integer | ✓ |  |
| qt_conc_financ_nreemb | integer | ✓ |  |
| qt_conc_prounii | integer | ✓ |  |
| qt_conc_prounip | integer | ✓ |  |
| qt_conc_nrpfies | integer | ✓ |  |
| qt_conc_financ_nreemb_outros | integer | ✓ |  |
| qt_ing_reserva_vaga | integer | ✓ |  |
| qt_ing_rvredepublica | integer | ✓ |  |
| qt_ing_rvetnico | integer | ✓ |  |
| qt_ing_rvpdef | integer | ✓ |  |
| qt_ing_rvsocial_rf | integer | ✓ |  |
| qt_ing_rvoutros | integer | ✓ |  |
| qt_mat_reserva_vaga | integer | ✓ |  |
| qt_mat_rvredepublica | integer | ✓ |  |
| qt_mat_rvetnico | integer | ✓ |  |
| qt_mat_rvpdef | integer | ✓ |  |
| qt_mat_rvsocial_rf | integer | ✓ |  |
| qt_mat_rvoutros | integer | ✓ |  |
| qt_conc_reserva_vaga | integer | ✓ |  |
| qt_conc_rvredepublica | integer | ✓ |  |
| qt_conc_rvetnico | integer | ✓ |  |
| qt_conc_rvpdef | integer | ✓ |  |
| qt_conc_rvsocial_rf | integer | ✓ |  |
| qt_conc_rvoutros | integer | ✓ |  |
| qt_sit_trancada | integer | ✓ |  |
| qt_sit_desvinculado | integer | ✓ |  |
| qt_sit_transferido | integer | ✓ |  |
| qt_sit_falecido | integer | ✓ |  |
| qt_ing_procescpublica | integer | ✓ |  |
| qt_ing_procescprivada | integer | ✓ |  |
| qt_ing_procnaoinformada | integer | ✓ |  |
| qt_mat_procescpublica | integer | ✓ |  |
| qt_mat_procescprivada | integer | ✓ |  |
| qt_mat_procnaoinformada | integer | ✓ |  |
| qt_conc_procescpublica | integer | ✓ |  |
| qt_conc_procescprivada | integer | ✓ |  |
| qt_conc_procnaoinformada | integer | ✓ |  |
| qt_parfor | integer | ✓ |  |
| qt_ing_parfor | integer | ✓ |  |
| qt_mat_parfor | integer | ✓ |  |
| qt_conc_parfor | integer | ✓ |  |
| qt_apoio_social | integer | ✓ |  |
| qt_ing_apoio_social | integer | ✓ |  |
| qt_mat_apoio_social | integer | ✓ |  |
| qt_conc_apoio_social | integer | ✓ |  |
| qt_ativ_extracurricular | integer | ✓ |  |
| qt_ing_ativ_extracurricular | integer | ✓ |  |
| qt_mat_ativ_extracurricular | integer | ✓ |  |
| qt_conc_ativ_extracurricular | integer | ✓ |  |
| qt_mob_academica | integer | ✓ |  |
| qt_ing_mob_academica | integer | ✓ |  |
| qt_mat_mob_academica | integer | ✓ |  |
| qt_conc_mob_academica | integer | ✓ |  |

---

## censo_cursos
**Colunas:** 21

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_curso | integer | ✗ | 🔑 |
| nome_curso | character varying | ✓ |  |
| cod_ies | integer | ✓ |  |
| cod_municipio | character | ✓ |  |
| id_grau_academico | smallint | ✓ |  |
| id_modalidade_ensino | smallint | ✓ |  |
| id_nivel_academico | smallint | ✓ |  |
| id_atributo_ingresso | smallint | ✓ |  |
| dt_inicio_funcionamento | date | ✓ |  |
| cod_area | integer | ✓ |  |
| turno_curso | character | ✓ |  |
| cc_ano | smallint | ✓ |  |
| cc_faixa | smallint | ✓ |  |
| cod_cine_rotulo | character | ✓ |  |
| cod_area_tcu | character | ✓ |  |
| id_centro_ufsm | integer | ✓ |  |
| nome_curso_ajustado | character varying | ✓ |  |
| id_curso | integer | ✓ |  |
| cod_cine_rotulo_n | character varying | ✓ |  |
| cod_cine_area_geral | character varying | ✓ |  |
| tempo_integralizacao_anos | numeric | ✓ |  |

---

## censo_cursos_bkp
**Colunas:** 21

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_curso | integer | ✗ | 🔑 |
| nome_curso | character varying | ✓ |  |
| cod_ies | integer | ✓ |  |
| cod_municipio | character | ✓ |  |
| id_grau_academico | smallint | ✓ |  |
| id_modalidade_ensino | smallint | ✓ |  |
| id_nivel_academico | smallint | ✓ |  |
| id_atributo_ingresso | smallint | ✓ |  |
| dt_inicio_funcionamento | date | ✓ |  |
| cod_area | integer | ✓ |  |
| turno_curso | character | ✓ |  |
| cc_ano | smallint | ✓ |  |
| cc_faixa | smallint | ✓ |  |
| cod_cine_rotulo | character | ✓ |  |
| cod_area_tcu | character | ✓ |  |
| id_centro_ufsm | integer | ✓ |  |
| nome_curso_ajustado | character varying | ✓ |  |
| id_curso | integer | ✓ |  |
| cod_cine_rotulo_n | character varying | ✓ |  |
| cod_cine_area_geral | character varying | ✓ |  |
| tempo_integralizacao_anos | numeric | ✓ |  |

---

## censo_graus_academicos
**Colunas:** 2

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id_grau_academico | integer | ✗ | 🔑 |
| descr_grau_academico | character varying | ✓ |  |

---

## censo_ies
**Colunas:** 8

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_ies | integer | ✗ | 🔑 |
| nome_ies | character varying | ✓ |  |
| sigla_ies | character varying | ✓ |  |
| cod_mantenedora | integer | ✓ |  |
| id_categoria_administrativa | integer | ✓ |  |
| id_organizacao_academica | integer | ✓ |  |
| cod_municipio | character | ✓ |  |
| in_capital | smallint | ✓ |  |

---

## censo_ies_bruto
**Colunas:** 87

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| nu_ano_censo | integer | ✓ |  |
| no_regiao_ies | character varying | ✓ |  |
| co_regiao_ies | integer | ✓ |  |
| no_uf_ies | character varying | ✓ |  |
| sg_uf_ies | character varying | ✓ |  |
| co_uf_ies | integer | ✓ |  |
| no_municipio_ies | character varying | ✓ |  |
| co_municipio_ies | integer | ✓ |  |
| in_capital_ies | integer | ✓ |  |
| no_mesorregiao_ies | character varying | ✓ |  |
| co_mesorregiao_ies | integer | ✓ |  |
| no_microrregiao_ies | character varying | ✓ |  |
| co_microrregiao_ies | integer | ✓ |  |
| tp_organizacao_academica | integer | ✓ |  |
| tp_categoria_administrativa | integer | ✓ |  |
| no_mantenedora | character varying | ✓ |  |
| co_mantenedora | integer | ✓ |  |
| co_ies | integer | ✓ |  |
| no_ies | character varying | ✓ |  |
| sg_ies | character varying | ✓ |  |
| ds_endereco_ies | character varying | ✓ |  |
| ds_numero_endereco_ies | character varying | ✓ |  |
| ds_complemento_endereco_ies | character varying | ✓ |  |
| no_bairro_ies | character varying | ✓ |  |
| nu_cep_ies | integer | ✓ |  |
| qt_tec_total | integer | ✓ |  |
| qt_tec_fundamental_incomp_fem | integer | ✓ |  |
| qt_tec_fundamental_incomp_masc | integer | ✓ |  |
| qt_tec_fundamental_comp_fem | integer | ✓ |  |
| qt_tec_fundamental_comp_masc | integer | ✓ |  |
| qt_tec_medio_fem | integer | ✓ |  |
| qt_tec_medio_masc | integer | ✓ |  |
| qt_tec_superior_fem | integer | ✓ |  |
| qt_tec_superior_masc | integer | ✓ |  |
| qt_tec_especializacao_fem | integer | ✓ |  |
| qt_tec_especializacao_masc | integer | ✓ |  |
| qt_tec_mestrado_fem | integer | ✓ |  |
| qt_tec_mestrado_masc | integer | ✓ |  |
| qt_tec_doutorado_fem | integer | ✓ |  |
| qt_tec_doutorado_masc | integer | ✓ |  |
| in_acesso_portal_capes | integer | ✓ |  |
| in_acesso_outras_bases | integer | ✓ |  |
| in_assina_outra_base | integer | ✓ |  |
| in_repositorio_institucional | integer | ✓ |  |
| in_busca_integrada | integer | ✓ |  |
| in_servico_internet | integer | ✓ |  |
| in_participa_rede_social | integer | ✓ |  |
| in_catalogo_online | integer | ✓ |  |
| qt_periodico_eletronico | integer | ✓ |  |
| qt_livro_eletronico | integer | ✓ |  |
| qt_doc_total | integer | ✓ |  |
| qt_doc_exe | integer | ✓ |  |
| qt_doc_ex_femi | integer | ✓ |  |
| qt_doc_ex_masc | integer | ✓ |  |
| qt_doc_ex_sem_grad | integer | ✓ |  |
| qt_doc_ex_grad | integer | ✓ |  |
| qt_doc_ex_esp | integer | ✓ |  |
| qt_doc_ex_mest | integer | ✓ |  |
| qt_doc_ex_dout | integer | ✓ |  |
| qt_doc_ex_int | integer | ✓ |  |
| qt_doc_ex_int_de | integer | ✓ |  |
| qt_doc_ex_int_sem_de | integer | ✓ |  |
| qt_doc_ex_parc | integer | ✓ |  |
| qt_doc_ex_hor | integer | ✓ |  |
| qt_doc_ex_0_29 | integer | ✓ |  |
| qt_doc_ex_30_34 | integer | ✓ |  |
| qt_doc_ex_35_39 | integer | ✓ |  |
| qt_doc_ex_40_44 | integer | ✓ |  |
| qt_doc_ex_45_49 | integer | ✓ |  |
| qt_doc_ex_50_54 | integer | ✓ |  |
| qt_doc_ex_55_59 | integer | ✓ |  |
| qt_doc_ex_60_mais | integer | ✓ |  |
| qt_doc_ex_branca | integer | ✓ |  |
| qt_doc_ex_preta | integer | ✓ |  |
| qt_doc_ex_parda | integer | ✓ |  |
| qt_doc_ex_amarela | integer | ✓ |  |
| qt_doc_ex_indigena | integer | ✓ |  |
| qt_doc_ex_cor_nd | integer | ✓ |  |
| qt_doc_ex_bra | integer | ✓ |  |
| qt_doc_ex_est | integer | ✓ |  |
| qt_doc_ex_com_deficiencia | integer | ✓ |  |
| in_comunitaria | smallint | ✓ |  |
| in_confessional | smallint | ✓ |  |
| tp_rede | smallint | ✓ |  |
| co_projeto | integer | ✓ |  |
| co_local_oferta | integer | ✓ |  |
| no_local_oferta | character varying | ✓ |  |

---

## censo_modalidades_ensino
**Colunas:** 2

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id_modalidade_ensino | integer | ✗ | 🔑 |
| descr_modalidade_ensino | character varying | ✓ |  |

---

## censo_niveis_academicos
**Colunas:** 2

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id_nivel_academico | integer | ✗ | 🔑 |
| descr_nivel_academico | character varying | ✓ |  |

---

## censo_organizacoes_academicas
**Colunas:** 3

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id_organizacao_academica | integer | ✗ | 🔑 |
| descr_organizacao_academica | character varying | ✓ |  |
| descr_org_acad_agrupada | character varying | ✓ |  |

---

## cesta_dimensoes
**Colunas:** 2

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id | integer | ✗ | 🔑 |
| descr_dimensao | character varying | ✗ |  |

---

## cesta_indicadores
**Colunas:** 4

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id | integer | ✗ | 🔑 |
| nome_indicador | character varying | ✗ |  |
| descr_indicador | character varying | ✗ |  |
| id_dimensao | integer | ✗ |  |

---

## cesta_indicadores_visualizacoes
**Colunas:** 3

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id | integer | ✗ | 🔑 |
| id_indicador | integer | ✗ |  |
| id_visualizacao | integer | ✗ |  |

---

## cesta_visualizacao_indicadores
**Colunas:** 4

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id | integer | ✗ | 🔑 |
| descr_visualizacao | character varying | ✗ |  |
| tipo_visualizacao | character varying | ✗ |  |
| forma | character | ✓ |  |

---

## dados_cpc
**Colunas:** 29

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id | integer | ✓ |  |
| ano | integer | ✓ |  |
| co_ies | integer | ✓ |  |
| co_curso | integer | ✓ |  |
| conc_inscritos | integer | ✓ |  |
| conc_participantes | integer | ✓ |  |
| n_bruta_fg | numeric | ✓ |  |
| n_bruta_ce | numeric | ✓ |  |
| enade_continuo | numeric | ✓ |  |
| conc_part_n_enen | integer | ✓ |  |
| perc_conc_part_n_enem | numeric | ✓ |  |
| nb_idd | numeric | ✓ |  |
| np_idd | numeric | ✓ |  |
| nb_org_did_pedag | numeric | ✓ |  |
| np_org_did_pedag | numeric | ✓ |  |
| nb_infra_fisica | numeric | ✓ |  |
| np_infra_fisica | numeric | ✓ |  |
| nb_ampliacao_formacao | numeric | ✓ |  |
| np_ampliacao_formacao | numeric | ✓ |  |
| nb_mestres | numeric | ✓ |  |
| np_mestres | numeric | ✓ |  |
| nb_doutores | numeric | ✓ |  |
| np_doutores | numeric | ✓ |  |
| nb_regime_trab | numeric | ✓ |  |
| np_regime_trab | numeric | ✓ |  |
| cpc_continuo | numeric | ✓ |  |
| cpc_faixa | integer | ✓ |  |
| n_padronizada_fg | numeric | ✓ |  |
| n_padronizada_ce | numeric | ✓ |  |

---

## dados_cpc_bkp
**Colunas:** 27

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id | integer | ✓ |  |
| ano | integer | ✓ |  |
| co_ies | integer | ✓ |  |
| co_curso | integer | ✓ |  |
| conc_inscritos | integer | ✓ |  |
| conc_participantes | integer | ✓ |  |
| n_bruta_fg | numeric | ✓ |  |
| n_bruta_ce | numeric | ✓ |  |
| enade_continuo | numeric | ✓ |  |
| conc_part_n_enen | integer | ✓ |  |
| perc_conc_part_n_enem | numeric | ✓ |  |
| nb_idd | numeric | ✓ |  |
| np_idd | numeric | ✓ |  |
| nb_org_did_pedag | numeric | ✓ |  |
| np_org_did_pedag | numeric | ✓ |  |
| nb_infra_fisica | numeric | ✓ |  |
| np_infra_fisica | numeric | ✓ |  |
| nb_ampliacao_formacao | numeric | ✓ |  |
| np_ampliacao_formacao | numeric | ✓ |  |
| nb_mestres | numeric | ✓ |  |
| np_mestres | numeric | ✓ |  |
| nb_doutores | numeric | ✓ |  |
| np_doutores | numeric | ✓ |  |
| nb_regime_trab | numeric | ✓ |  |
| np_regime_trab | numeric | ✓ |  |
| cpc_continuo | numeric | ✓ |  |
| cpc_faixa | integer | ✓ |  |

---

## dados_cpc_brutos
**Colunas:** 40

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| ano | integer | ✓ |  |
| cod_area | character varying | ✓ |  |
| descr_area | character varying | ✓ |  |
| cod_ies | character varying | ✓ |  |
| nome_ies | character varying | ✓ |  |
| sigla_ies | character varying | ✓ |  |
| org_academica | character varying | ✓ |  |
| cat_administrativa | character varying | ✓ |  |
| cod_curso | character varying | ✓ |  |
| modalidade | character varying | ✓ |  |
| cod_municipio | character varying | ✓ |  |
| nome_municipio | character varying | ✓ |  |
| uf | character varying | ✓ |  |
| n_conclu_inscritos | character varying | ✓ |  |
| n_conclu_participantes | character varying | ✓ |  |
| nota_bruta_fg | character varying | ✓ |  |
| nota_padr_fg | character varying | ✓ |  |
| nota_bruta_ce | character varying | ✓ |  |
| nota_padr_ce | character varying | ✓ |  |
| conceito_enade_cont | character varying | ✓ |  |
| num_conclui_part_nota_enem | character varying | ✓ |  |
| prop_conclui_part_nota_enem | character varying | ✓ |  |
| nota_bruta_idd | numeric | ✓ |  |
| nota_padr_idd | numeric | ✓ |  |
| nota_bruta_org_did_pegago | numeric | ✓ |  |
| nota_padr_org_did_pegago | numeric | ✓ |  |
| nota_bruta_infra | numeric | ✓ |  |
| nota_padr_infra | numeric | ✓ |  |
| nota_bruta_oportunidade | numeric | ✓ |  |
| nota_padr_oportunidade | numeric | ✓ |  |
| nota_bruta_mestres | numeric | ✓ |  |
| nota_padr_mestres | numeric | ✓ |  |
| nota_bruta_doutores | numeric | ✓ |  |
| nota_padr_doutores | numeric | ✓ |  |
| nota_bruta_reg_trabalho | numeric | ✓ |  |
| nota_padr_reg_trabalho | numeric | ✓ |  |
| cpc_continuo | numeric | ✓ |  |
| cpc_faixa | character varying | ✓ |  |
| nr_docentes | integer | ✓ |  |
| grau_academico | character varying | ✓ |  |

---

## dados_enade
**Colunas:** 10

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id | integer | ✓ |  |
| ano | integer | ✓ |  |
| co_ies | integer | ✓ |  |
| co_curso | integer | ✓ |  |
| enade_continuo | numeric | ✓ |  |
| enade_faixa | character varying | ✓ |  |
| n_bruta_fg | numeric | ✓ |  |
| n_padronizada_fg | numeric | ✓ |  |
| n_bruta_ce | numeric | ✓ |  |
| n_padronizada_ce | numeric | ✓ |  |

---

## dados_enade_percepcao_respostas
**Colunas:** 5

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| questao | character varying | ✓ |  |
| opcao | character varying | ✓ |  |
| resposta | character varying | ✓ |  |
| id | integer | ✓ |  |
| questao_aj | character varying | ✓ |  |

---

## dados_igc
**Colunas:** 12

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id | integer | ✓ |  |
| ano | integer | ✓ |  |
| co_ies | integer | ✓ |  |
| n_cursos_cpc_trienio | integer | ✓ |  |
| alfa | numeric | ✓ |  |
| conc_med_graduacao | numeric | ✓ |  |
| beta | numeric | ✓ |  |
| conc_med_mestrado | numeric | ✓ |  |
| gama | numeric | ✓ |  |
| conc_med_doutorado | numeric | ✓ |  |
| igc_continuo | numeric | ✓ |  |
| igc_faixa | integer | ✓ |  |

---

## dados_percepcao_enade
**Colunas:** 44

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| nu_ano | smallint | ✓ |  |
| co_curso | integer | ✓ |  |
| qe_i27 | smallint | ✓ |  |
| qe_i28 | smallint | ✓ |  |
| qe_i29 | smallint | ✓ |  |
| qe_i30 | smallint | ✓ |  |
| qe_i31 | smallint | ✓ |  |
| qe_i32 | smallint | ✓ |  |
| qe_i33 | smallint | ✓ |  |
| qe_i34 | smallint | ✓ |  |
| qe_i35 | smallint | ✓ |  |
| qe_i36 | smallint | ✓ |  |
| qe_i37 | smallint | ✓ |  |
| qe_i38 | smallint | ✓ |  |
| qe_i39 | smallint | ✓ |  |
| qe_i40 | smallint | ✓ |  |
| qe_i41 | smallint | ✓ |  |
| qe_i42 | smallint | ✓ |  |
| qe_i43 | smallint | ✓ |  |
| qe_i44 | smallint | ✓ |  |
| qe_i45 | smallint | ✓ |  |
| qe_i46 | smallint | ✓ |  |
| qe_i47 | smallint | ✓ |  |
| qe_i48 | smallint | ✓ |  |
| qe_i49 | smallint | ✓ |  |
| qe_i50 | smallint | ✓ |  |
| qe_i51 | smallint | ✓ |  |
| qe_i52 | smallint | ✓ |  |
| qe_i53 | smallint | ✓ |  |
| qe_i54 | smallint | ✓ |  |
| qe_i55 | smallint | ✓ |  |
| qe_i56 | smallint | ✓ |  |
| qe_i57 | smallint | ✓ |  |
| qe_i58 | smallint | ✓ |  |
| qe_i59 | smallint | ✓ |  |
| qe_i60 | smallint | ✓ |  |
| qe_i61 | smallint | ✓ |  |
| qe_i62 | smallint | ✓ |  |
| qe_i63 | smallint | ✓ |  |
| qe_i64 | smallint | ✓ |  |
| qe_i65 | smallint | ✓ |  |
| qe_i66 | smallint | ✓ |  |
| qe_i67 | smallint | ✓ |  |
| qe_i68 | smallint | ✓ |  |

---

## dados_percepcao_enade_questoes
**Colunas:** 5

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id_questao | character varying | ✓ |  |
| descricao | character varying | ✓ |  |
| grupo | character varying | ✓ |  |
| questao_aj | character varying | ✓ |  |
| questao | character varying | ✓ |  |

---

## emec_instituicoes
**Colunas:** 18

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| id | integer | ✓ |  |
| co_ies | integer | ✓ |  |
| no_ies | character varying | ✓ |  |
| sg_ies | character varying | ✓ |  |
| cnpj | character varying | ✓ |  |
| telefone | character varying | ✓ |  |
| site | character varying | ✓ |  |
| email | character varying | ✓ |  |
| endereco | character varying | ✓ |  |
| no_municipio | character varying | ✓ |  |
| sg_uf | character varying | ✓ |  |
| dt_criacao | character varying | ✓ |  |
| ci | integer | ✓ |  |
| ano_ci | integer | ✓ |  |
| ci_ead | integer | ✓ |  |
| ano_ci_ead | integer | ✓ |  |
| igc | integer | ✓ |  |
| ano_igc | integer | ✓ |  |

---

## enade_dic_aux
**Colunas:** 2

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| arquivo | character varying | ✓ |  |
| variaveis | character varying | ✓ |  |

---

## enade_dic_aux_tmp
**Colunas:** 2

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| arquivo | character varying | ✓ |  |
| campo | character varying | ✓ |  |

---

## fluxo_tda
**Colunas:** 31

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| co_ies | integer | ✓ |  |
| no_ies | character varying | ✓ |  |
| tp_categoria_administrativa | smallint | ✓ |  |
| tp_organizacao_academica | smallint | ✓ |  |
| co_curso | integer | ✓ |  |
| no_curso | character varying | ✓ |  |
| co_regiao | character varying | ✓ |  |
| co_uf | character varying | ✓ |  |
| co_municipio | character varying | ✓ |  |
| tp_grau_academico | character varying | ✓ |  |
| tp_modalidade_ensino | smallint | ✓ |  |
| co_cine_rotulo | character varying | ✓ |  |
| no_cine_rotulo | character varying | ✓ |  |
| co_cine_area_geral | character varying | ✓ |  |
| no_cine_area_geral | character varying | ✓ |  |
| nu_ano_ingresso | integer | ✓ |  |
| nu_ano_referencia | integer | ✓ |  |
| nu_prazo_integralizacao | integer | ✓ |  |
| nu_ano_integralizacao | integer | ✓ |  |
| nu_prazo_acompanhamento | integer | ✓ |  |
| nu_ano_maximo_acompanhamento | integer | ✓ |  |
| qt_ingressante | integer | ✓ |  |
| qt_permanencia | integer | ✓ |  |
| qt_concluinte | integer | ✓ |  |
| qt_desistencia | integer | ✓ |  |
| qt_falecido | integer | ✓ |  |
| tap | numeric | ✓ |  |
| tca | numeric | ✓ |  |
| tda | numeric | ✓ |  |
| tcan | numeric | ✓ |  |
| tada | numeric | ✓ |  |

---

## ibge_demografia_idade_grupos
**Colunas:** 3

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| idade | character varying | ✓ |  |
| grupo | character varying | ✓ |  |
| grupo_ajustado | character varying | ✓ |  |

---

## ibge_demografia_por_idade_bruto
**Colunas:** 3

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cd_mun | character varying | ✓ |  |
| idade | character varying | ✓ |  |
| quantidade | integer | ✓ |  |

---

## idhms
**Colunas:** 3

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_ibge | character | ✗ | 🔑 |
| ano | integer | ✗ | 🔑 |
| idhm | numeric | ✓ |  |

---

## ies_area_cine_pos
**Colunas:** 3

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| co_ies | integer | ✓ |  |
| num_areas_cine | integer | ✓ |  |
| classificacao_pos | character varying | ✓ |  |

---

## igc_bruto
**Colunas:** 21

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| ano | integer | ✓ |  |
| cod_ies | integer | ✓ |  |
| ies | character varying | ✓ |  |
| sigla_ies | character varying | ✓ |  |
| uf_ies | character varying | ✓ |  |
| municipio | character varying | ✓ |  |
| dependencia_adm | character varying | ✓ |  |
| org_academica | character varying | ✓ |  |
| n_curso_enade_ult_3_anos | integer | ✓ |  |
| n_curso_com_cpc_ult_3_anos | integer | ✓ |  |
| conc_medio_graduacao | character varying | ✓ |  |
| conc_medio_mestrado | character varying | ✓ |  |
| conc_medio_doutorado | character varying | ✓ |  |
| porc_grad_equivalente | character varying | ✓ |  |
| porc_mestres_equivalente | character varying | ✓ |  |
| igc_continuo | numeric | ✓ |  |
| igc_faixa | character varying | ✓ |  |
| arquivo_origem | character varying | ✓ |  |
| observacao | character varying | ✓ |  |
| porc_doutores_equivalente | character varying | ✓ |  |
| ano_arquivo | integer | ✓ |  |

---

## igc_fatos
**Colunas:** 11

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| ano | smallint | ✗ |  |
| cod_ies | integer | ✗ |  |
| num_cursos_cpc | smallint | ✓ |  |
| proporcao_graduandos | numeric | ✓ |  |
| conceito_medio_graduacao | numeric | ✓ |  |
| proporcao_mestrandos_equivalente | numeric | ✓ |  |
| conceito_medio_mestrado | numeric | ✓ |  |
| proporcao_doutorandos_equivalente | numeric | ✓ |  |
| conceito_medio_doutorado | numeric | ✓ |  |
| igc_continuo | numeric | ✓ |  |
| igc_faixa | character varying | ✓ |  |

---

## ind_fluxo_ies
**Colunas:** 18

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| periodo | character varying | ✓ |  |
| co_curso | integer | ✓ |  |
| nu_ano_ingresso | integer | ✓ |  |
| nu_ano_referencia | integer | ✓ |  |
| nu_prazo_integralizacao | smallint | ✓ |  |
| nu_ano_integralizacao | integer | ✓ |  |
| nu_prazo_acompanhamento | smallint | ✓ |  |
| nu_ano_maximo_acompanhamento | integer | ✓ |  |
| qt_ingressante | integer | ✓ |  |
| qt_permanencia | integer | ✓ |  |
| qt_concluinte | integer | ✓ |  |
| qt_desistencia | integer | ✓ |  |
| qt_falecido | integer | ✓ |  |
| taxa_permanencia | numeric | ✓ |  |
| taxa_conclusao_acumulada | numeric | ✓ |  |
| taxa_desistencia_acumulada | numeric | ✓ |  |
| taxa_conclusao_anual | numeric | ✓ |  |
| taxa_desistencia_anual | numeric | ✓ |  |

---

## ind_fluxo_ies_bkp
**Colunas:** 18

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| periodo | character varying | ✓ |  |
| co_curso | integer | ✓ |  |
| nu_ano_ingresso | integer | ✓ |  |
| nu_ano_referencia | integer | ✓ |  |
| nu_prazo_integralizacao | smallint | ✓ |  |
| nu_ano_integralizacao | integer | ✓ |  |
| nu_prazo_acompanhamento | smallint | ✓ |  |
| nu_ano_maximo_acompanhamento | integer | ✓ |  |
| qt_ingressante | integer | ✓ |  |
| qt_permanencia | integer | ✓ |  |
| qt_concluinte | integer | ✓ |  |
| qt_desistencia | integer | ✓ |  |
| qt_falecido | integer | ✓ |  |
| taxa_permanencia | numeric | ✓ |  |
| taxa_conclusao_acumulada | numeric | ✓ |  |
| taxa_desistencia_acumulada | numeric | ✓ |  |
| taxa_conclusao_anual | numeric | ✓ |  |
| taxa_desistencia_anual | numeric | ✓ |  |

---

## ind_fluxo_ies_tda
**Colunas:** 26

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| co_ies | integer | ✓ |  |
| no_ies | character varying | ✓ |  |
| tp_categoria_administrativa | character varying | ✓ |  |
| tp_organizacao_academica | character varying | ✓ |  |
| co_curso | integer | ✓ |  |
| no_curso | character varying | ✓ |  |
| co_uf | integer | ✓ |  |
| co_municipio | integer | ✓ |  |
| tp_grau_academico | integer | ✓ |  |
| tp_modalidade_ensino | character varying | ✓ |  |
| co_cine_rotulo | character varying | ✓ |  |
| no_cine_rotulo | character varying | ✓ |  |
| nu_ano_ingresso | integer | ✓ |  |
| nu_ano_referencia | integer | ✓ |  |
| qt_ingressante | integer | ✓ |  |
| qt_permanencia | integer | ✓ |  |
| qt_concluinte | integer | ✓ |  |
| qt_desistencia | integer | ✓ |  |
| qt_falecido | integer | ✓ |  |
| tda | numeric | ✓ |  |
| tp_rede | character varying | ✓ |  |
| sigla_ies | character varying | ✓ |  |
| nome_ies | character varying | ✓ |  |
| nome_curso | character varying | ✓ |  |
| no_regiao | character varying | ✓ |  |
| capital | character varying | ✓ |  |

---

## matriculas_municipio
**Colunas:** 10

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| nu_ano_censo | smallint | ✓ |  |
| cod_municipio | character varying | ✓ |  |
| qt_mat_0_17 | integer | ✓ |  |
| qt_mat_18_24 | integer | ✓ |  |
| qt_mat_25_29 | integer | ✓ |  |
| qt_mat_30_34 | integer | ✓ |  |
| qt_mat_35_39 | integer | ✓ |  |
| qt_mat_40_49 | integer | ✓ |  |
| qt_mat_50_59 | integer | ✓ |  |
| qt_mat_60_mais | integer | ✓ |  |

---

## mesoregioes_ibge
**Colunas:** 5

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_mesoregiao_ibge | character | ✗ | 🔑 |
| num_mesoregiao_ibge | character | ✓ |  |
| nome_mesoregiao_ibge | character varying | ✓ |  |
| cod_uf_ibge | character | ✓ |  |
| nome_mesoregiao_ibge_sem_acento | character varying | ✓ |  |

---

## microdados_enade_questoes
**Colunas:** 4

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| ano | integer | ✓ |  |
| cod_questao | character varying | ✓ |  |
| questao | character varying | ✓ |  |
| questao_ajustado | character varying | ✓ |  |

---

## microdados_enade_respostas
**Colunas:** 5

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| ano | integer | ✓ |  |
| cod_questao | character varying | ✓ |  |
| questao | character varying | ✓ |  |
| alternativa | character varying | ✓ |  |
| resposta | character varying | ✓ |  |

---

## microregioes_ibge
**Colunas:** 5

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_microregiao_ibge | character | ✗ | 🔑 |
| num_microregiao_ibge | character | ✓ |  |
| nome_microregiao_ibge | character varying | ✓ |  |
| cod_mesoregiao_ibge | character | ✓ |  |
| nome_microregiao_ibge_sem_acento | character varying | ✓ |  |

---

## municipios_ibge
**Colunas:** 9

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_municipio | character | ✓ |  |
| cod_ibge | character | ✗ | 🔑 |
| nome_municipio | character varying | ✓ |  |
| cod_microregiao_ibge | character | ✓ |  |
| latitude | numeric | ✓ |  |
| longitude | numeric | ✓ |  |
| populacao | integer | ✓ |  |
| densidade | numeric | ✓ |  |
| nome_municipio_sem_acento | character varying | ✓ |  |

---

## pibs_per_capita
**Colunas:** 3

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_ibge | character | ✗ | 🔑 |
| ano | integer | ✗ | 🔑 |
| pib_per_capita | numeric | ✓ |  |

---

## regioes_ibge
**Colunas:** 3

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_regiao_ibge | smallint | ✗ | 🔑 |
| descr_regiao_ibge | character varying | ✓ |  |
| sigla_regiao_ibge | character | ✓ |  |

---

## uf_ibge
**Colunas:** 7

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| uf_ibge | character | ✗ | 🔑 |
| num_uf_ibge | smallint | ✓ |  |
| nome_uf_ibge | character varying | ✓ |  |
| cod_regiao_ibge | smallint | ✓ |  |
| latitude | numeric | ✓ |  |
| longitude | numeric | ✓ |  |
| nome_uf_ibge_sem_acento | character varying | ✓ |  |

---

## variaveis_pib_municipios_ibge
**Colunas:** 7

| Coluna | Tipo | Nullable | PK |
|--------|------|----------|----|
| cod_ibge | character | ✗ | 🔑 |
| ano | integer | ✗ | 🔑 |
| cod_variavel | integer | ✗ | 🔑 |
| variavel | character varying | ✗ |  |
| valor | numeric | ✓ |  |
| cod_unidade_medida | integer | ✗ |  |
| unidade_medida | character varying | ✗ |  |

---

