# Schema inep

**Descoberto:** 28/08/2025, 22:24:37
**Total de tabelas:** 87

## capes_cursos_bruto
**Tipo:** TABLE | **Colunas:** 28

| Nome | Tipo | Nulo |
|------|------|------|
| an_base | integer | Sim |
| nm_grande_area_conhecimento | character varying | Sim |
| nm_area_conhecimento | character varying | Sim |
| nm_subarea_conhecimento | character varying | Sim |
| nm_especialidade | character varying | Sim |
| cd_area_avaliacao | character varying | Sim |
| nm_area_avaliacao | character varying | Sim |
| cd_entidade_capes | character varying | Sim |
| cd_entidade_emec | character varying | Sim |
| sg_entidade_ensino | character varying | Sim |
| nm_entidade_ensino | character varying | Sim |
| cs_status_juridico | character varying | Sim |
| ds_dependencia_administrativa | character varying | Sim |
| ds_organizacao_academica | character varying | Sim |
| nm_regiao | character varying | Sim |
| sg_uf_programa | character varying | Sim |
| nm_municipio_programa_ies | character varying | Sim |
| cd_programa_ies | character varying | Sim |
| nm_programa_ies | character varying | Sim |
| cd_curso_ppg | character varying | Sim |
| nm_curso | character varying | Sim |
| nm_grau_curso | character varying | Sim |
| cd_conceito_curso | integer | Sim |
| an_inicio_previsto | integer | Sim |
| ds_situacao_curso | character varying | Sim |
| dt_situacao_curso | character varying | Sim |
| id_add_foto_programa_ies | integer | Sim |
| id_add_foto_programa | integer | Sim |

---

## municipios_ibge
**Tipo:** TABLE | **Colunas:** 9

| Nome | Tipo | Nulo |
|------|------|------|
| cod_municipio | character | Sim |
| cod_ibge | character | Não |
| nome_municipio | character varying | Sim |
| cod_microregiao_ibge | character | Sim |
| latitude | numeric | Sim |
| longitude | numeric | Sim |
| populacao | integer | Sim |
| densidade | numeric | Sim |
| nome_municipio_sem_acento | character varying | Sim |

---

## dados_enade
**Tipo:** TABLE | **Colunas:** 10

| Nome | Tipo | Nulo |
|------|------|------|
| id | integer | Sim |
| ano | integer | Sim |
| co_ies | integer | Sim |
| co_curso | integer | Sim |
| enade_continuo | numeric | Sim |
| enade_faixa | character varying | Sim |
| n_bruta_fg | numeric | Sim |
| n_padronizada_fg | numeric | Sim |
| n_bruta_ce | numeric | Sim |
| n_padronizada_ce | numeric | Sim |

---

## ibge_demografia_por_idade_bruto
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| cd_mun | character varying | Sim |
| idade | character varying | Sim |
| quantidade | integer | Sim |

---

## uf_ibge
**Tipo:** TABLE | **Colunas:** 7

| Nome | Tipo | Nulo |
|------|------|------|
| uf_ibge | character | Não |
| num_uf_ibge | smallint | Sim |
| nome_uf_ibge | character varying | Sim |
| cod_regiao_ibge | smallint | Sim |
| latitude | numeric | Sim |
| longitude | numeric | Sim |
| nome_uf_ibge_sem_acento | character varying | Sim |

---

## dados_cpc_bkp
**Tipo:** TABLE | **Colunas:** 27

| Nome | Tipo | Nulo |
|------|------|------|
| id | integer | Sim |
| ano | integer | Sim |
| co_ies | integer | Sim |
| co_curso | integer | Sim |
| conc_inscritos | integer | Sim |
| conc_participantes | integer | Sim |
| n_bruta_fg | numeric | Sim |
| n_bruta_ce | numeric | Sim |
| enade_continuo | numeric | Sim |
| conc_part_n_enen | integer | Sim |
| perc_conc_part_n_enem | numeric | Sim |
| nb_idd | numeric | Sim |
| np_idd | numeric | Sim |
| nb_org_did_pedag | numeric | Sim |
| np_org_did_pedag | numeric | Sim |
| nb_infra_fisica | numeric | Sim |
| np_infra_fisica | numeric | Sim |
| nb_ampliacao_formacao | numeric | Sim |
| np_ampliacao_formacao | numeric | Sim |
| nb_mestres | numeric | Sim |
| np_mestres | numeric | Sim |
| nb_doutores | numeric | Sim |
| np_doutores | numeric | Sim |
| nb_regime_trab | numeric | Sim |
| np_regime_trab | numeric | Sim |
| cpc_continuo | numeric | Sim |
| cpc_faixa | integer | Sim |

---

## cesta_indicadores_visualizacoes
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| id | integer | Não |
| id_indicador | integer | Não |
| id_visualizacao | integer | Não |

---

## microdados_enade_arq1
**Tipo:** TABLE | **Colunas:** 10

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| co_ies | integer | Sim |
| co_categad | integer | Sim |
| co_orgacad | integer | Sim |
| co_grupo | integer | Sim |
| co_modalidade | integer | Sim |
| co_munic_curso | integer | Sim |
| co_uf_curso | integer | Sim |
| co_regiao_curso | integer | Sim |

---

## cesta_visualizacao_indicadores
**Tipo:** TABLE | **Colunas:** 4

| Nome | Tipo | Nulo |
|------|------|------|
| id | integer | Não |
| descr_visualizacao | character varying | Não |
| tipo_visualizacao | character varying | Não |
| forma | character | Sim |

---

## censo_cursos
**Tipo:** TABLE | **Colunas:** 21

| Nome | Tipo | Nulo |
|------|------|------|
| cod_curso | integer | Não |
| nome_curso | character varying | Sim |
| cod_ies | integer | Sim |
| cod_municipio | character | Sim |
| id_grau_academico | smallint | Sim |
| id_modalidade_ensino | smallint | Sim |
| id_nivel_academico | smallint | Sim |
| id_atributo_ingresso | smallint | Sim |
| dt_inicio_funcionamento | date | Sim |
| cod_area | integer | Sim |
| turno_curso | character | Sim |
| cc_ano | smallint | Sim |
| cc_faixa | smallint | Sim |
| cod_cine_rotulo | character | Sim |
| cod_area_tcu | character | Sim |
| id_centro_ufsm | integer | Sim |
| nome_curso_ajustado | character varying | Sim |
| id_curso | integer | Sim |
| cod_cine_rotulo_n | character varying | Sim |
| cod_cine_area_geral | character varying | Sim |
| tempo_integralizacao_anos | numeric | Sim |

---

## censo_cine_area_geral
**Tipo:** TABLE | **Colunas:** 2

| Nome | Tipo | Nulo |
|------|------|------|
| cod_cine_area_geral | character | Não |
| descr_cine_area_geral | character varying | Sim |

---

## variaveis_pib_municipios_ibge
**Tipo:** TABLE | **Colunas:** 7

| Nome | Tipo | Nulo |
|------|------|------|
| cod_ibge | character | Não |
| ano | integer | Não |
| cod_variavel | integer | Não |
| variavel | character varying | Não |
| valor | numeric | Sim |
| cod_unidade_medida | integer | Não |
| unidade_medida | character varying | Não |

---

## censo_niveis_academicos
**Tipo:** TABLE | **Colunas:** 2

| Nome | Tipo | Nulo |
|------|------|------|
| id_nivel_academico | integer | Não |
| descr_nivel_academico | character varying | Sim |

---

## censo_cine_area_especifica
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| cod_cine_area_especifica | character | Não |
| descr_cine_area_especifica | character varying | Sim |
| cod_cine_area_geral | character | Sim |

---

## microdados_enade_arq3
**Tipo:** TABLE | **Colunas:** 52

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| nu_item_ofg | integer | Sim |
| nu_item_ofg_z | integer | Sim |
| nu_item_ofg_x | integer | Sim |
| nu_item_ofg_n | integer | Sim |
| nu_item_oce | integer | Sim |
| nu_item_oce_z | integer | Sim |
| nu_item_oce_x | integer | Sim |
| nu_item_oce_n | integer | Sim |
| ds_vt_gab_ofg_fin | character | Sim |
| ds_vt_gab_oce_fin | character | Sim |
| ds_vt_esc_ofg | character | Sim |
| ds_vt_ace_ofg | character | Sim |
| ds_vt_esc_oce | character | Sim |
| ds_vt_ace_oce | character | Sim |
| tp_pres | integer | Sim |
| tp_pr_ger | integer | Sim |
| tp_pr_ob_fg | integer | Sim |
| tp_pr_di_fg | integer | Sim |
| tp_pr_ob_ce | integer | Sim |
| tp_pr_di_ce | integer | Sim |
| tp_sfg_d1 | integer | Sim |
| tp_sfg_d2 | integer | Sim |
| tp_sce_d1 | integer | Sim |
| tp_sce_d2 | integer | Sim |
| tp_sce_d3 | integer | Sim |
| nt_ger | numeric | Sim |
| nt_fg | numeric | Sim |
| nt_obj_fg | numeric | Sim |
| nt_dis_fg | numeric | Sim |
| nt_fg_d1 | numeric | Sim |
| nt_fg_d1_pt | numeric | Sim |
| nt_fg_d1_ct | numeric | Sim |
| nt_fg_d2 | numeric | Sim |
| nt_fg_d2_pt | numeric | Sim |
| nt_fg_d2_ct | numeric | Sim |
| nt_ce | numeric | Sim |
| nt_obj_ce | numeric | Sim |
| nt_dis_ce | numeric | Sim |
| nt_ce_d1 | numeric | Sim |
| nt_ce_d2 | numeric | Sim |
| nt_ce_d3 | numeric | Sim |
| co_rs_i1 | character | Sim |
| co_rs_i2 | character | Sim |
| co_rs_i3 | character | Sim |
| co_rs_i4 | character | Sim |
| co_rs_i5 | character | Sim |
| co_rs_i6 | character | Sim |
| co_rs_i7 | character | Sim |
| co_rs_i8 | character | Sim |
| co_rs_i9 | character | Sim |

---

## enade_dic_aux_tmp
**Tipo:** TABLE | **Colunas:** 2

| Nome | Tipo | Nulo |
|------|------|------|
| arquivo | character varying | Sim |
| campo | character varying | Sim |

---

## censo_ies
**Tipo:** TABLE | **Colunas:** 8

| Nome | Tipo | Nulo |
|------|------|------|
| cod_ies | integer | Não |
| nome_ies | character varying | Sim |
| sigla_ies | character varying | Sim |
| cod_mantenedora | integer | Sim |
| id_categoria_administrativa | integer | Sim |
| id_organizacao_academica | integer | Sim |
| cod_municipio | character | Sim |
| in_capital | smallint | Sim |

---

## microregioes_ibge
**Tipo:** TABLE | **Colunas:** 5

| Nome | Tipo | Nulo |
|------|------|------|
| cod_microregiao_ibge | character | Não |
| num_microregiao_ibge | character | Sim |
| nome_microregiao_ibge | character varying | Sim |
| cod_mesoregiao_ibge | character | Sim |
| nome_microregiao_ibge_sem_acento | character varying | Sim |

---

## censo_cine_area_detalhada
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| cod_cine_area_detalhada | character | Não |
| descr_cine_area_detalhada | character varying | Sim |
| cod_cine_area_especifica | character | Sim |

---

## censo_cine_rotulo
**Tipo:** TABLE | **Colunas:** 5

| Nome | Tipo | Nulo |
|------|------|------|
| cod_cine_rotulo | character | Não |
| descr_cine_rotulo | character varying | Sim |
| cod_cine_area_detalhada | character | Sim |
| area_tcu_1 | character | Sim |
| area_tcu_2 | character | Sim |

---

## censo_graus_academicos
**Tipo:** TABLE | **Colunas:** 2

| Nome | Tipo | Nulo |
|------|------|------|
| id_grau_academico | integer | Não |
| descr_grau_academico | character varying | Sim |

---

## regioes_ibge
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| cod_regiao_ibge | smallint | Não |
| descr_regiao_ibge | character varying | Sim |
| sigla_regiao_ibge | character | Sim |

---

## censo_curso_vagas_bruto
**Tipo:** TABLE | **Colunas:** 202

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano_censo | integer | Sim |
| no_regiao | character varying | Sim |
| co_regiao | integer | Sim |
| no_uf | character varying | Sim |
| sg_uf | character varying | Sim |
| co_uf | integer | Sim |
| no_municipio | character varying | Sim |
| co_municipio | integer | Sim |
| in_capital | integer | Sim |
| tp_dimensao | integer | Sim |
| tp_organizacao_academica | integer | Sim |
| tp_rede | integer | Sim |
| tp_categoria_administrativa | integer | Sim |
| in_comunitaria | integer | Sim |
| in_confessional | integer | Sim |
| co_ies | integer | Sim |
| no_curso | character varying | Sim |
| co_curso | integer | Sim |
| no_cine_rotulo | character varying | Sim |
| co_cine_rotulo | character varying | Sim |
| co_cine_area_geral | integer | Sim |
| no_cine_area_geral | character varying | Sim |
| co_cine_area_especifica | integer | Sim |
| no_cine_area_especifica | character varying | Sim |
| co_cine_area_detalhada | integer | Sim |
| no_cine_area_detalhada | character varying | Sim |
| tp_grau_academico | integer | Sim |
| in_gratuito | integer | Sim |
| tp_modalidade_ensino | integer | Sim |
| tp_nivel_academico | integer | Sim |
| qt_curso | integer | Sim |
| qt_vg_total | integer | Sim |
| qt_vg_total_diurno | integer | Sim |
| qt_vg_total_noturno | integer | Sim |
| qt_vg_total_ead | integer | Sim |
| qt_vg_nova | integer | Sim |
| qt_vg_proc_seletivo | integer | Sim |
| qt_vg_remanesc | integer | Sim |
| qt_vg_prog_especial | integer | Sim |
| qt_inscrito_total | integer | Sim |
| qt_inscrito_total_diurno | integer | Sim |
| qt_inscrito_total_noturno | integer | Sim |
| qt_inscrito_total_ead | integer | Sim |
| qt_insc_vg_nova | integer | Sim |
| qt_insc_proc_seletivo | integer | Sim |
| qt_insc_vg_remanesc | integer | Sim |
| qt_insc_vg_prog_especial | integer | Sim |
| qt_ing | integer | Sim |
| qt_ing_fem | integer | Sim |
| qt_ing_masc | integer | Sim |
| qt_ing_diurno | integer | Sim |
| qt_ing_noturno | integer | Sim |
| qt_ing_vg_nova | integer | Sim |
| qt_ing_vestibular | integer | Sim |
| qt_ing_enem | integer | Sim |
| qt_ing_avaliacao_seriada | integer | Sim |
| qt_ing_selecao_simplifica | integer | Sim |
| qt_ing_egr | integer | Sim |
| qt_ing_outro_tipo_selecao | integer | Sim |
| qt_ing_proc_seletivo | integer | Sim |
| qt_ing_vg_remanesc | integer | Sim |
| qt_ing_vg_prog_especial | integer | Sim |
| qt_ing_outra_forma | integer | Sim |
| qt_ing_0_17 | integer | Sim |
| qt_ing_18_24 | integer | Sim |
| qt_ing_25_29 | integer | Sim |
| qt_ing_30_34 | integer | Sim |
| qt_ing_35_39 | integer | Sim |
| qt_ing_40_49 | integer | Sim |
| qt_ing_50_59 | integer | Sim |
| qt_ing_60_mais | integer | Sim |
| qt_ing_branca | integer | Sim |
| qt_ing_preta | integer | Sim |
| qt_ing_parda | integer | Sim |
| qt_ing_amarela | integer | Sim |
| qt_ing_indigena | integer | Sim |
| qt_ing_cornd | integer | Sim |
| qt_mat | integer | Sim |
| qt_mat_fem | integer | Sim |
| qt_mat_masc | integer | Sim |
| qt_mat_diurno | integer | Sim |
| qt_mat_noturno | integer | Sim |
| qt_mat_0_17 | integer | Sim |
| qt_mat_18_24 | integer | Sim |
| qt_mat_25_29 | integer | Sim |
| qt_mat_30_34 | integer | Sim |
| qt_mat_35_39 | integer | Sim |
| qt_mat_40_49 | integer | Sim |
| qt_mat_50_59 | integer | Sim |
| qt_mat_60_mais | integer | Sim |
| qt_mat_branca | integer | Sim |
| qt_mat_preta | integer | Sim |
| qt_mat_parda | integer | Sim |
| qt_mat_amarela | integer | Sim |
| qt_mat_indigena | integer | Sim |
| qt_mat_cornd | integer | Sim |
| qt_conc | integer | Sim |
| qt_conc_fem | integer | Sim |
| qt_conc_masc | integer | Sim |
| qt_conc_diurno | integer | Sim |
| qt_conc_noturno | integer | Sim |
| qt_conc_0_17 | integer | Sim |
| qt_conc_18_24 | integer | Sim |
| qt_conc_25_29 | integer | Sim |
| qt_conc_30_34 | integer | Sim |
| qt_conc_35_39 | integer | Sim |
| qt_conc_40_49 | integer | Sim |
| qt_conc_50_59 | integer | Sim |
| qt_conc_60_mais | integer | Sim |
| qt_conc_branca | integer | Sim |
| qt_conc_preta | integer | Sim |
| qt_conc_parda | integer | Sim |
| qt_conc_amarela | integer | Sim |
| qt_conc_indigena | integer | Sim |
| qt_conc_cornd | integer | Sim |
| qt_ing_nacbras | integer | Sim |
| qt_ing_nacestrang | integer | Sim |
| qt_mat_nacbras | integer | Sim |
| qt_mat_nacestrang | integer | Sim |
| qt_conc_nacbras | integer | Sim |
| qt_conc_nacestrang | integer | Sim |
| qt_aluno_deficiente | integer | Sim |
| qt_ing_deficiente | integer | Sim |
| qt_mat_deficiente | integer | Sim |
| qt_conc_deficiente | integer | Sim |
| qt_ing_financ | integer | Sim |
| qt_ing_financ_reemb | integer | Sim |
| qt_ing_fies | integer | Sim |
| qt_ing_rpfies | integer | Sim |
| qt_ing_financ_reemb_outros | integer | Sim |
| qt_ing_financ_nreemb | integer | Sim |
| qt_ing_prounii | integer | Sim |
| qt_ing_prounip | integer | Sim |
| qt_ing_nrpfies | integer | Sim |
| qt_ing_financ_nreemb_outros | integer | Sim |
| qt_mat_financ | integer | Sim |
| qt_mat_financ_reemb | integer | Sim |
| qt_mat_fies | integer | Sim |
| qt_mat_rpfies | integer | Sim |
| qt_mat_financ_reemb_outros | integer | Sim |
| qt_mat_financ_nreemb | integer | Sim |
| qt_mat_prounii | integer | Sim |
| qt_mat_prounip | integer | Sim |
| qt_mat_nrpfies | integer | Sim |
| qt_mat_financ_nreemb_outros | integer | Sim |
| qt_conc_financ | integer | Sim |
| qt_conc_financ_reemb | integer | Sim |
| qt_conc_fies | integer | Sim |
| qt_conc_rpfies | integer | Sim |
| qt_conc_financ_reemb_outros | integer | Sim |
| qt_conc_financ_nreemb | integer | Sim |
| qt_conc_prounii | integer | Sim |
| qt_conc_prounip | integer | Sim |
| qt_conc_nrpfies | integer | Sim |
| qt_conc_financ_nreemb_outros | integer | Sim |
| qt_ing_reserva_vaga | integer | Sim |
| qt_ing_rvredepublica | integer | Sim |
| qt_ing_rvetnico | integer | Sim |
| qt_ing_rvpdef | integer | Sim |
| qt_ing_rvsocial_rf | integer | Sim |
| qt_ing_rvoutros | integer | Sim |
| qt_mat_reserva_vaga | integer | Sim |
| qt_mat_rvredepublica | integer | Sim |
| qt_mat_rvetnico | integer | Sim |
| qt_mat_rvpdef | integer | Sim |
| qt_mat_rvsocial_rf | integer | Sim |
| qt_mat_rvoutros | integer | Sim |
| qt_conc_reserva_vaga | integer | Sim |
| qt_conc_rvredepublica | integer | Sim |
| qt_conc_rvetnico | integer | Sim |
| qt_conc_rvpdef | integer | Sim |
| qt_conc_rvsocial_rf | integer | Sim |
| qt_conc_rvoutros | integer | Sim |
| qt_sit_trancada | integer | Sim |
| qt_sit_desvinculado | integer | Sim |
| qt_sit_transferido | integer | Sim |
| qt_sit_falecido | integer | Sim |
| qt_ing_procescpublica | integer | Sim |
| qt_ing_procescprivada | integer | Sim |
| qt_ing_procnaoinformada | integer | Sim |
| qt_mat_procescpublica | integer | Sim |
| qt_mat_procescprivada | integer | Sim |
| qt_mat_procnaoinformada | integer | Sim |
| qt_conc_procescpublica | integer | Sim |
| qt_conc_procescprivada | integer | Sim |
| qt_conc_procnaoinformada | integer | Sim |
| qt_parfor | integer | Sim |
| qt_ing_parfor | integer | Sim |
| qt_mat_parfor | integer | Sim |
| qt_conc_parfor | integer | Sim |
| qt_apoio_social | integer | Sim |
| qt_ing_apoio_social | integer | Sim |
| qt_mat_apoio_social | integer | Sim |
| qt_conc_apoio_social | integer | Sim |
| qt_ativ_extracurricular | integer | Sim |
| qt_ing_ativ_extracurricular | integer | Sim |
| qt_mat_ativ_extracurricular | integer | Sim |
| qt_conc_ativ_extracurricular | integer | Sim |
| qt_mob_academica | integer | Sim |
| qt_ing_mob_academica | integer | Sim |
| qt_mat_mob_academica | integer | Sim |
| qt_conc_mob_academica | integer | Sim |

---

## capes_programas_bruto
**Tipo:** TABLE | **Colunas:** 34

| Nome | Tipo | Nulo |
|------|------|------|
| an_base | integer | Sim |
| nm_grande_area_conhecimento | character varying | Sim |
| nm_area_conhecimento | character varying | Sim |
| nm_area_basica | character varying | Sim |
| nm_subarea_conhecimento | character varying | Sim |
| nm_especialidade | character varying | Sim |
| cd_area_avaliacao | character varying | Sim |
| nm_area_avaliacao | character varying | Sim |
| cd_entidade_capes | character varying | Sim |
| cd_entidade_emec | character varying | Sim |
| sg_entidade_ensino | character varying | Sim |
| nm_entidade_ensino | character varying | Sim |
| cs_status_juridico | character varying | Sim |
| ds_dependencia_administrativa | character varying | Sim |
| ds_organizacao_academica | character varying | Sim |
| nm_regiao | character varying | Sim |
| nm_municipio_programa_ies | character varying | Sim |
| nm_modalidade_programa | character varying | Sim |
| cd_programa_ies | character varying | Sim |
| nm_programa_ies | character varying | Sim |
| nm_programa_idioma | character varying | Sim |
| sg_uf_programa | character varying | Sim |
| nm_grau_programa | character varying | Sim |
| cd_conceito_programa | character varying | Sim |
| ano_inicio_programa | character varying | Sim |
| an_inicio_curso | character varying | Sim |
| in_rede | character varying | Sim |
| sg_entidade_ensino_rede | character varying | Sim |
| ds_situacao_programa | character varying | Sim |
| dt_situacao_programa | character varying | Sim |
| id_add_foto_programa_ies | integer | Sim |
| id_add_foto_programa | integer | Sim |
| ds_clientela_quadrienal_2017 | character varying | Sim |
| an_inicio_programa | integer | Sim |

---

## ind_fluxo_ies
**Tipo:** TABLE | **Colunas:** 18

| Nome | Tipo | Nulo |
|------|------|------|
| periodo | character varying | Sim |
| co_curso | integer | Sim |
| nu_ano_ingresso | integer | Sim |
| nu_ano_referencia | integer | Sim |
| nu_prazo_integralizacao | smallint | Sim |
| nu_ano_integralizacao | integer | Sim |
| nu_prazo_acompanhamento | smallint | Sim |
| nu_ano_maximo_acompanhamento | integer | Sim |
| qt_ingressante | integer | Sim |
| qt_permanencia | integer | Sim |
| qt_concluinte | integer | Sim |
| qt_desistencia | integer | Sim |
| qt_falecido | integer | Sim |
| taxa_permanencia | numeric | Sim |
| taxa_conclusao_acumulada | numeric | Sim |
| taxa_desistencia_acumulada | numeric | Sim |
| taxa_conclusao_anual | numeric | Sim |
| taxa_desistencia_anual | numeric | Sim |

---

## censo_ies_bruto
**Tipo:** TABLE | **Colunas:** 87

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano_censo | integer | Sim |
| no_regiao_ies | character varying | Sim |
| co_regiao_ies | integer | Sim |
| no_uf_ies | character varying | Sim |
| sg_uf_ies | character varying | Sim |
| co_uf_ies | integer | Sim |
| no_municipio_ies | character varying | Sim |
| co_municipio_ies | integer | Sim |
| in_capital_ies | integer | Sim |
| no_mesorregiao_ies | character varying | Sim |
| co_mesorregiao_ies | integer | Sim |
| no_microrregiao_ies | character varying | Sim |
| co_microrregiao_ies | integer | Sim |
| tp_organizacao_academica | integer | Sim |
| tp_categoria_administrativa | integer | Sim |
| no_mantenedora | character varying | Sim |
| co_mantenedora | integer | Sim |
| co_ies | integer | Sim |
| no_ies | character varying | Sim |
| sg_ies | character varying | Sim |
| ds_endereco_ies | character varying | Sim |
| ds_numero_endereco_ies | character varying | Sim |
| ds_complemento_endereco_ies | character varying | Sim |
| no_bairro_ies | character varying | Sim |
| nu_cep_ies | integer | Sim |
| qt_tec_total | integer | Sim |
| qt_tec_fundamental_incomp_fem | integer | Sim |
| qt_tec_fundamental_incomp_masc | integer | Sim |
| qt_tec_fundamental_comp_fem | integer | Sim |
| qt_tec_fundamental_comp_masc | integer | Sim |
| qt_tec_medio_fem | integer | Sim |
| qt_tec_medio_masc | integer | Sim |
| qt_tec_superior_fem | integer | Sim |
| qt_tec_superior_masc | integer | Sim |
| qt_tec_especializacao_fem | integer | Sim |
| qt_tec_especializacao_masc | integer | Sim |
| qt_tec_mestrado_fem | integer | Sim |
| qt_tec_mestrado_masc | integer | Sim |
| qt_tec_doutorado_fem | integer | Sim |
| qt_tec_doutorado_masc | integer | Sim |
| in_acesso_portal_capes | integer | Sim |
| in_acesso_outras_bases | integer | Sim |
| in_assina_outra_base | integer | Sim |
| in_repositorio_institucional | integer | Sim |
| in_busca_integrada | integer | Sim |
| in_servico_internet | integer | Sim |
| in_participa_rede_social | integer | Sim |
| in_catalogo_online | integer | Sim |
| qt_periodico_eletronico | integer | Sim |
| qt_livro_eletronico | integer | Sim |
| qt_doc_total | integer | Sim |
| qt_doc_exe | integer | Sim |
| qt_doc_ex_femi | integer | Sim |
| qt_doc_ex_masc | integer | Sim |
| qt_doc_ex_sem_grad | integer | Sim |
| qt_doc_ex_grad | integer | Sim |
| qt_doc_ex_esp | integer | Sim |
| qt_doc_ex_mest | integer | Sim |
| qt_doc_ex_dout | integer | Sim |
| qt_doc_ex_int | integer | Sim |
| qt_doc_ex_int_de | integer | Sim |
| qt_doc_ex_int_sem_de | integer | Sim |
| qt_doc_ex_parc | integer | Sim |
| qt_doc_ex_hor | integer | Sim |
| qt_doc_ex_0_29 | integer | Sim |
| qt_doc_ex_30_34 | integer | Sim |
| qt_doc_ex_35_39 | integer | Sim |
| qt_doc_ex_40_44 | integer | Sim |
| qt_doc_ex_45_49 | integer | Sim |
| qt_doc_ex_50_54 | integer | Sim |
| qt_doc_ex_55_59 | integer | Sim |
| qt_doc_ex_60_mais | integer | Sim |
| qt_doc_ex_branca | integer | Sim |
| qt_doc_ex_preta | integer | Sim |
| qt_doc_ex_parda | integer | Sim |
| qt_doc_ex_amarela | integer | Sim |
| qt_doc_ex_indigena | integer | Sim |
| qt_doc_ex_cor_nd | integer | Sim |
| qt_doc_ex_bra | integer | Sim |
| qt_doc_ex_est | integer | Sim |
| qt_doc_ex_com_deficiencia | integer | Sim |
| in_comunitaria | smallint | Sim |
| in_confessional | smallint | Sim |
| tp_rede | smallint | Sim |
| co_projeto | integer | Sim |
| co_local_oferta | integer | Sim |
| no_local_oferta | character varying | Sim |

---

## microdados_enade_arq30
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i24 | character | Sim |

---

## censo_modalidades_ensino
**Tipo:** TABLE | **Colunas:** 2

| Nome | Tipo | Nulo |
|------|------|------|
| id_modalidade_ensino | integer | Não |
| descr_modalidade_ensino | character varying | Sim |

---

## dados_cpc
**Tipo:** TABLE | **Colunas:** 29

| Nome | Tipo | Nulo |
|------|------|------|
| id | integer | Sim |
| ano | integer | Sim |
| co_ies | integer | Sim |
| co_curso | integer | Sim |
| conc_inscritos | integer | Sim |
| conc_participantes | integer | Sim |
| n_bruta_fg | numeric | Sim |
| n_bruta_ce | numeric | Sim |
| enade_continuo | numeric | Sim |
| conc_part_n_enen | integer | Sim |
| perc_conc_part_n_enem | numeric | Sim |
| nb_idd | numeric | Sim |
| np_idd | numeric | Sim |
| nb_org_did_pedag | numeric | Sim |
| np_org_did_pedag | numeric | Sim |
| nb_infra_fisica | numeric | Sim |
| np_infra_fisica | numeric | Sim |
| nb_ampliacao_formacao | numeric | Sim |
| np_ampliacao_formacao | numeric | Sim |
| nb_mestres | numeric | Sim |
| np_mestres | numeric | Sim |
| nb_doutores | numeric | Sim |
| np_doutores | numeric | Sim |
| nb_regime_trab | numeric | Sim |
| np_regime_trab | numeric | Sim |
| cpc_continuo | numeric | Sim |
| cpc_faixa | integer | Sim |
| n_padronizada_fg | numeric | Sim |
| n_padronizada_ce | numeric | Sim |

---

## censo_categorias_administrativas
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| id_categoria_administrativa | integer | Não |
| descr_categoria_administrativa | character varying | Sim |
| descr_cat_adm_agrupada | character varying | Sim |

---

## microdados_enade_arq31
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i25 | character | Sim |

---

## microdados_enade_arq33
**Tipo:** TABLE | **Colunas:** 13

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i69 | integer | Sim |
| qe_i70 | integer | Sim |
| qe_i71 | integer | Sim |
| qe_i72 | integer | Sim |
| qe_i73 | integer | Sim |
| qe_i74 | integer | Sim |
| qe_i75 | integer | Sim |
| qe_i76 | integer | Sim |
| qe_i77 | integer | Sim |
| qe_i78 | integer | Sim |
| qe_i79 | integer | Sim |

---

## censo_cursos_bkp
**Tipo:** TABLE | **Colunas:** 21

| Nome | Tipo | Nulo |
|------|------|------|
| cod_curso | integer | Não |
| nome_curso | character varying | Sim |
| cod_ies | integer | Sim |
| cod_municipio | character | Sim |
| id_grau_academico | smallint | Sim |
| id_modalidade_ensino | smallint | Sim |
| id_nivel_academico | smallint | Sim |
| id_atributo_ingresso | smallint | Sim |
| dt_inicio_funcionamento | date | Sim |
| cod_area | integer | Sim |
| turno_curso | character | Sim |
| cc_ano | smallint | Sim |
| cc_faixa | smallint | Sim |
| cod_cine_rotulo | character | Sim |
| cod_area_tcu | character | Sim |
| id_centro_ufsm | integer | Sim |
| nome_curso_ajustado | character varying | Sim |
| id_curso | integer | Sim |
| cod_cine_rotulo_n | character varying | Sim |
| cod_cine_area_geral | character varying | Sim |
| tempo_integralizacao_anos | numeric | Sim |

---

## dm_aluno
**Tipo:** TABLE | **Colunas:** 75

| Nome | Tipo | Nulo |
|------|------|------|
| co_ies | integer | Sim |
| co_categoria_administrativa | integer | Sim |
| co_organizacao_academica | integer | Sim |
| co_curso | integer | Sim |
| co_nivel_academico | integer | Sim |
| co_modalidade_ensino | integer | Sim |
| co_grau_academico | integer | Sim |
| co_vinculo_aluno_curso | character varying | Sim |
| co_aluno | character varying | Sim |
| co_aluno_situacao | integer | Sim |
| in_ing_processo_seletivo | integer | Sim |
| in_ing_vestibular | integer | Sim |
| in_ing_enem | integer | Sim |
| in_ing_outra_forma_selecao | integer | Sim |
| in_ing_processo_outras_formas | integer | Sim |
| in_ing_convenio_pecg | integer | Sim |
| in_ing_outras_formas_ingresso | integer | Sim |
| in_apoio_social | integer | Sim |
| in_apoio_alimentacao | integer | Sim |
| in_apoio_moradia | integer | Sim |
| in_apoio_transporte | integer | Sim |
| in_apoio_material_didatico | integer | Sim |
| in_apoio_bolsa_permanencia | integer | Sim |
| in_apoio_bolsa_trabalho | integer | Sim |
| in_aluno_deficiencia | integer | Sim |
| in_cegueira | integer | Sim |
| in_baixa_visao | integer | Sim |
| in_surdez | integer | Sim |
| in_def_auditiva | integer | Sim |
| in_def_fisica | integer | Sim |
| in_surdocegueira | integer | Sim |
| in_def_multipla | integer | Sim |
| in_def_mental | integer | Sim |
| in_reserva_vagas | integer | Sim |
| in_reserva_ensino_publico | integer | Sim |
| in_reserva_etnico | integer | Sim |
| in_reserva_deficiencia | integer | Sim |
| in_reserva_renda_familiar | integer | Sim |
| in_reserva_outros | integer | Sim |
| in_atividade_complementar | integer | Sim |
| in_ativ_pesquisa_rem | integer | Sim |
| in_ativ_pesquisa_nao_rem | integer | Sim |
| in_ativ_extensao_rem | integer | Sim |
| in_ativ_extensao_nao_rem | integer | Sim |
| in_ativ_monitoria_rem | integer | Sim |
| in_ativ_monitoria_nao_rem | integer | Sim |
| in_ativ_estag_n_obrig_rem | integer | Sim |
| in_ativ_estag_n_obrig_nao_rem | integer | Sim |
| in_financ_estudantil | integer | Sim |
| in_financ_externas | integer | Sim |
| in_financ_externas_reemb | integer | Sim |
| in_financ_ies | integer | Sim |
| in_financ_ies_reemb | integer | Sim |
| in_financ_municipal | integer | Sim |
| in_financ_municipal_reemb | integer | Sim |
| in_financ_estadual | integer | Sim |
| in_financ_estadual_reemb | integer | Sim |
| in_financ_outros | integer | Sim |
| in_financ_outros_reemb | integer | Sim |
| in_prouni_integral | integer | Sim |
| in_prouni_parcial | integer | Sim |
| in_fies | integer | Sim |
| in_sexo_aluno | integer | Sim |
| co_cor_raca_aluno | integer | Sim |
| co_nacionalidade_aluno | integer | Sim |
| co_pais_origem_aluno | integer | Sim |
| nu_ano_aluno_nasc | integer | Sim |
| nu_dia_aluno_nasc | integer | Sim |
| nu_mes_aluno_nasc | integer | Sim |
| nu_idade_aluno | integer | Sim |
| in_matricula | integer | Sim |
| in_concluinte | integer | Sim |
| in_ingresso | integer | Sim |
| dt_ingresso_curso | character varying | Sim |
| ano_ingresso | integer | Sim |

---

## pibs_per_capita
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| cod_ibge | character | Não |
| ano | integer | Não |
| pib_per_capita | numeric | Sim |

---

## mesoregioes_ibge
**Tipo:** TABLE | **Colunas:** 5

| Nome | Tipo | Nulo |
|------|------|------|
| cod_mesoregiao_ibge | character | Não |
| num_mesoregiao_ibge | character | Sim |
| nome_mesoregiao_ibge | character varying | Sim |
| cod_uf_ibge | character | Sim |
| nome_mesoregiao_ibge_sem_acento | character varying | Sim |

---

## ind_fluxo_ies_tda
**Tipo:** TABLE | **Colunas:** 26

| Nome | Tipo | Nulo |
|------|------|------|
| co_ies | integer | Sim |
| no_ies | character varying | Sim |
| tp_categoria_administrativa | character varying | Sim |
| tp_organizacao_academica | character varying | Sim |
| co_curso | integer | Sim |
| no_curso | character varying | Sim |
| co_uf | integer | Sim |
| co_municipio | integer | Sim |
| tp_grau_academico | integer | Sim |
| tp_modalidade_ensino | character varying | Sim |
| co_cine_rotulo | character varying | Sim |
| no_cine_rotulo | character varying | Sim |
| nu_ano_ingresso | integer | Sim |
| nu_ano_referencia | integer | Sim |
| qt_ingressante | integer | Sim |
| qt_permanencia | integer | Sim |
| qt_concluinte | integer | Sim |
| qt_desistencia | integer | Sim |
| qt_falecido | integer | Sim |
| tda | numeric | Sim |
| tp_rede | character varying | Sim |
| sigla_ies | character varying | Sim |
| nome_ies | character varying | Sim |
| nome_curso | character varying | Sim |
| no_regiao | character varying | Sim |
| capital | character varying | Sim |

---

## fluxo_tda
**Tipo:** TABLE | **Colunas:** 31

| Nome | Tipo | Nulo |
|------|------|------|
| co_ies | integer | Sim |
| no_ies | character varying | Sim |
| tp_categoria_administrativa | smallint | Sim |
| tp_organizacao_academica | smallint | Sim |
| co_curso | integer | Sim |
| no_curso | character varying | Sim |
| co_regiao | character varying | Sim |
| co_uf | character varying | Sim |
| co_municipio | character varying | Sim |
| tp_grau_academico | character varying | Sim |
| tp_modalidade_ensino | smallint | Sim |
| co_cine_rotulo | character varying | Sim |
| no_cine_rotulo | character varying | Sim |
| co_cine_area_geral | character varying | Sim |
| no_cine_area_geral | character varying | Sim |
| nu_ano_ingresso | integer | Sim |
| nu_ano_referencia | integer | Sim |
| nu_prazo_integralizacao | integer | Sim |
| nu_ano_integralizacao | integer | Sim |
| nu_prazo_acompanhamento | integer | Sim |
| nu_ano_maximo_acompanhamento | integer | Sim |
| qt_ingressante | integer | Sim |
| qt_permanencia | integer | Sim |
| qt_concluinte | integer | Sim |
| qt_desistencia | integer | Sim |
| qt_falecido | integer | Sim |
| tap | numeric | Sim |
| tca | numeric | Sim |
| tda | numeric | Sim |
| tcan | numeric | Sim |
| tada | numeric | Sim |

---

## cesta_dimensoes
**Tipo:** TABLE | **Colunas:** 2

| Nome | Tipo | Nulo |
|------|------|------|
| id | integer | Não |
| descr_dimensao | character varying | Não |

---

## cesta_indicadores
**Tipo:** TABLE | **Colunas:** 4

| Nome | Tipo | Nulo |
|------|------|------|
| id | integer | Não |
| nome_indicador | character varying | Não |
| descr_indicador | character varying | Não |
| id_dimensao | integer | Não |

---

## matriculas_municipio
**Tipo:** TABLE | **Colunas:** 10

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano_censo | smallint | Sim |
| cod_municipio | character varying | Sim |
| qt_mat_0_17 | integer | Sim |
| qt_mat_18_24 | integer | Sim |
| qt_mat_25_29 | integer | Sim |
| qt_mat_30_34 | integer | Sim |
| qt_mat_35_39 | integer | Sim |
| qt_mat_40_49 | integer | Sim |
| qt_mat_50_59 | integer | Sim |
| qt_mat_60_mais | integer | Sim |

---

## ibge_demografia_idade_grupos
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| idade | character varying | Sim |
| grupo | character varying | Sim |
| grupo_ajustado | character varying | Sim |

---

## dados_enade_percepcao_respostas
**Tipo:** TABLE | **Colunas:** 5

| Nome | Tipo | Nulo |
|------|------|------|
| questao | character varying | Sim |
| opcao | character varying | Sim |
| resposta | character varying | Sim |
| id | integer | Sim |
| questao_aj | character varying | Sim |

---

## dados_idd
**Tipo:** TABLE | **Colunas:** 7

| Nome | Tipo | Nulo |
|------|------|------|
| id | integer | Sim |
| ano | integer | Sim |
| co_ies | integer | Sim |
| co_curso | integer | Sim |
| idd_bruta | numeric | Sim |
| idd_continuo | numeric | Sim |
| idd_faixa | character varying | Sim |

---

## dados_ies_docentes
**Tipo:** TABLE | **Colunas:** 14

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano_censo | integer | Sim |
| co_ies | integer | Sim |
| qt_doc_total | integer | Sim |
| qt_doc_exe | integer | Sim |
| qt_doc_ex_sem_grad | integer | Sim |
| qt_doc_ex_grad | integer | Sim |
| qt_doc_ex_esp | integer | Sim |
| qt_doc_ex_mest | integer | Sim |
| qt_doc_ex_dout | integer | Sim |
| qt_doc_ex_int | integer | Sim |
| qt_doc_ex_int_de | integer | Sim |
| qt_doc_ex_int_sem_de | integer | Sim |
| qt_doc_ex_parc | integer | Sim |
| qt_doc_ex_hor | integer | Sim |

---

## dados_igc
**Tipo:** TABLE | **Colunas:** 12

| Nome | Tipo | Nulo |
|------|------|------|
| id | integer | Sim |
| ano | integer | Sim |
| co_ies | integer | Sim |
| n_cursos_cpc_trienio | integer | Sim |
| alfa | numeric | Sim |
| conc_med_graduacao | numeric | Sim |
| beta | numeric | Sim |
| conc_med_mestrado | numeric | Sim |
| gama | numeric | Sim |
| conc_med_doutorado | numeric | Sim |
| igc_continuo | numeric | Sim |
| igc_faixa | integer | Sim |

---

## dados_percepcao_enade
**Tipo:** TABLE | **Colunas:** 44

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | smallint | Sim |
| co_curso | integer | Sim |
| qe_i27 | smallint | Sim |
| qe_i28 | smallint | Sim |
| qe_i29 | smallint | Sim |
| qe_i30 | smallint | Sim |
| qe_i31 | smallint | Sim |
| qe_i32 | smallint | Sim |
| qe_i33 | smallint | Sim |
| qe_i34 | smallint | Sim |
| qe_i35 | smallint | Sim |
| qe_i36 | smallint | Sim |
| qe_i37 | smallint | Sim |
| qe_i38 | smallint | Sim |
| qe_i39 | smallint | Sim |
| qe_i40 | smallint | Sim |
| qe_i41 | smallint | Sim |
| qe_i42 | smallint | Sim |
| qe_i43 | smallint | Sim |
| qe_i44 | smallint | Sim |
| qe_i45 | smallint | Sim |
| qe_i46 | smallint | Sim |
| qe_i47 | smallint | Sim |
| qe_i48 | smallint | Sim |
| qe_i49 | smallint | Sim |
| qe_i50 | smallint | Sim |
| qe_i51 | smallint | Sim |
| qe_i52 | smallint | Sim |
| qe_i53 | smallint | Sim |
| qe_i54 | smallint | Sim |
| qe_i55 | smallint | Sim |
| qe_i56 | smallint | Sim |
| qe_i57 | smallint | Sim |
| qe_i58 | smallint | Sim |
| qe_i59 | smallint | Sim |
| qe_i60 | smallint | Sim |
| qe_i61 | smallint | Sim |
| qe_i62 | smallint | Sim |
| qe_i63 | smallint | Sim |
| qe_i64 | smallint | Sim |
| qe_i65 | smallint | Sim |
| qe_i66 | smallint | Sim |
| qe_i67 | smallint | Sim |
| qe_i68 | smallint | Sim |

---

## dados_percepcao_enade_questoes
**Tipo:** TABLE | **Colunas:** 5

| Nome | Tipo | Nulo |
|------|------|------|
| id_questao | character varying | Sim |
| descricao | character varying | Sim |
| grupo | character varying | Sim |
| questao_aj | character varying | Sim |
| questao | character varying | Sim |

---

## idhms
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| cod_ibge | character | Não |
| ano | integer | Não |
| idhm | numeric | Sim |

---

## ies_area_cine_pos
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| co_ies | integer | Sim |
| num_areas_cine | integer | Sim |
| classificacao_pos | character varying | Sim |

---

## ind_fluxo_ies_bkp
**Tipo:** TABLE | **Colunas:** 18

| Nome | Tipo | Nulo |
|------|------|------|
| periodo | character varying | Sim |
| co_curso | integer | Sim |
| nu_ano_ingresso | integer | Sim |
| nu_ano_referencia | integer | Sim |
| nu_prazo_integralizacao | smallint | Sim |
| nu_ano_integralizacao | integer | Sim |
| nu_prazo_acompanhamento | smallint | Sim |
| nu_ano_maximo_acompanhamento | integer | Sim |
| qt_ingressante | integer | Sim |
| qt_permanencia | integer | Sim |
| qt_concluinte | integer | Sim |
| qt_desistencia | integer | Sim |
| qt_falecido | integer | Sim |
| taxa_permanencia | numeric | Sim |
| taxa_conclusao_acumulada | numeric | Sim |
| taxa_desistencia_acumulada | numeric | Sim |
| taxa_conclusao_anual | numeric | Sim |
| taxa_desistencia_anual | numeric | Sim |

---

## emec_instituicoes
**Tipo:** TABLE | **Colunas:** 18

| Nome | Tipo | Nulo |
|------|------|------|
| id | integer | Sim |
| co_ies | integer | Sim |
| no_ies | character varying | Sim |
| sg_ies | character varying | Sim |
| cnpj | character varying | Sim |
| telefone | character varying | Sim |
| site | character varying | Sim |
| email | character varying | Sim |
| endereco | character varying | Sim |
| no_municipio | character varying | Sim |
| sg_uf | character varying | Sim |
| dt_criacao | character varying | Sim |
| ci | integer | Sim |
| ano_ci | integer | Sim |
| ci_ead | integer | Sim |
| ano_ci_ead | integer | Sim |
| igc | integer | Sim |
| ano_igc | integer | Sim |

---

## dados_cpc_brutos
**Tipo:** TABLE | **Colunas:** 40

| Nome | Tipo | Nulo |
|------|------|------|
| ano | integer | Sim |
| cod_area | character varying | Sim |
| descr_area | character varying | Sim |
| cod_ies | character varying | Sim |
| nome_ies | character varying | Sim |
| sigla_ies | character varying | Sim |
| org_academica | character varying | Sim |
| cat_administrativa | character varying | Sim |
| cod_curso | character varying | Sim |
| modalidade | character varying | Sim |
| cod_municipio | character varying | Sim |
| nome_municipio | character varying | Sim |
| uf | character varying | Sim |
| n_conclu_inscritos | character varying | Sim |
| n_conclu_participantes | character varying | Sim |
| nota_bruta_fg | character varying | Sim |
| nota_padr_fg | character varying | Sim |
| nota_bruta_ce | character varying | Sim |
| nota_padr_ce | character varying | Sim |
| conceito_enade_cont | character varying | Sim |
| num_conclui_part_nota_enem | character varying | Sim |
| prop_conclui_part_nota_enem | character varying | Sim |
| nota_bruta_idd | numeric | Sim |
| nota_padr_idd | numeric | Sim |
| nota_bruta_org_did_pegago | numeric | Sim |
| nota_padr_org_did_pegago | numeric | Sim |
| nota_bruta_infra | numeric | Sim |
| nota_padr_infra | numeric | Sim |
| nota_bruta_oportunidade | numeric | Sim |
| nota_padr_oportunidade | numeric | Sim |
| nota_bruta_mestres | numeric | Sim |
| nota_padr_mestres | numeric | Sim |
| nota_bruta_doutores | numeric | Sim |
| nota_padr_doutores | numeric | Sim |
| nota_bruta_reg_trabalho | numeric | Sim |
| nota_padr_reg_trabalho | numeric | Sim |
| cpc_continuo | numeric | Sim |
| cpc_faixa | character varying | Sim |
| nr_docentes | integer | Sim |
| grau_academico | character varying | Sim |

---

## censo_organizacoes_academicas
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| id_organizacao_academica | integer | Não |
| descr_organizacao_academica | character varying | Sim |
| descr_org_acad_agrupada | character varying | Sim |

---

## microdados_enade_arq22
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i16 | character | Sim |

---

## microdados_enade_arq32
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i26 | character | Sim |

---

## igc_bruto
**Tipo:** TABLE | **Colunas:** 21

| Nome | Tipo | Nulo |
|------|------|------|
| ano | integer | Sim |
| cod_ies | integer | Sim |
| ies | character varying | Sim |
| sigla_ies | character varying | Sim |
| uf_ies | character varying | Sim |
| municipio | character varying | Sim |
| dependencia_adm | character varying | Sim |
| org_academica | character varying | Sim |
| n_curso_enade_ult_3_anos | integer | Sim |
| n_curso_com_cpc_ult_3_anos | integer | Sim |
| conc_medio_graduacao | character varying | Sim |
| conc_medio_mestrado | character varying | Sim |
| conc_medio_doutorado | character varying | Sim |
| porc_grad_equivalente | character varying | Sim |
| porc_mestres_equivalente | character varying | Sim |
| igc_continuo | numeric | Sim |
| igc_faixa | character varying | Sim |
| arquivo_origem | character varying | Sim |
| observacao | character varying | Sim |
| porc_doutores_equivalente | character varying | Sim |
| ano_arquivo | integer | Sim |

---

## igc_fatos
**Tipo:** TABLE | **Colunas:** 11

| Nome | Tipo | Nulo |
|------|------|------|
| ano | smallint | Não |
| cod_ies | integer | Não |
| num_cursos_cpc | smallint | Sim |
| proporcao_graduandos | numeric | Sim |
| conceito_medio_graduacao | numeric | Sim |
| proporcao_mestrandos_equivalente | numeric | Sim |
| conceito_medio_mestrado | numeric | Sim |
| proporcao_doutorandos_equivalente | numeric | Sim |
| conceito_medio_doutorado | numeric | Sim |
| igc_continuo | numeric | Sim |
| igc_faixa | character varying | Sim |

---

## microdados_enade_respostas
**Tipo:** TABLE | **Colunas:** 5

| Nome | Tipo | Nulo |
|------|------|------|
| ano | integer | Sim |
| cod_questao | character varying | Sim |
| questao | character varying | Sim |
| alternativa | character varying | Sim |
| resposta | character varying | Sim |

---

## enade_dic_aux
**Tipo:** TABLE | **Colunas:** 2

| Nome | Tipo | Nulo |
|------|------|------|
| arquivo | character varying | Sim |
| variaveis | character varying | Sim |

---

## microdados_enade_questoes
**Tipo:** TABLE | **Colunas:** 4

| Nome | Tipo | Nulo |
|------|------|------|
| ano | integer | Sim |
| cod_questao | character varying | Sim |
| questao | character varying | Sim |
| questao_ajustado | character varying | Sim |

---

## microdados_enade_arq2
**Tipo:** TABLE | **Colunas:** 5

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| ano_fim_em | integer | Sim |
| ano_in_grad | integer | Sim |
| co_turno_graduacao | integer | Sim |

---

## microdados_enade_arq4
**Tipo:** TABLE | **Colunas:** 44

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i27 | integer | Sim |
| qe_i28 | integer | Sim |
| qe_i29 | integer | Sim |
| qe_i30 | integer | Sim |
| qe_i31 | integer | Sim |
| qe_i32 | integer | Sim |
| qe_i33 | integer | Sim |
| qe_i34 | integer | Sim |
| qe_i35 | integer | Sim |
| qe_i36 | integer | Sim |
| qe_i37 | integer | Sim |
| qe_i38 | integer | Sim |
| qe_i39 | integer | Sim |
| qe_i40 | integer | Sim |
| qe_i41 | integer | Sim |
| qe_i42 | integer | Sim |
| qe_i43 | integer | Sim |
| qe_i44 | integer | Sim |
| qe_i45 | integer | Sim |
| qe_i46 | integer | Sim |
| qe_i47 | integer | Sim |
| qe_i48 | integer | Sim |
| qe_i49 | integer | Sim |
| qe_i50 | integer | Sim |
| qe_i51 | integer | Sim |
| qe_i52 | integer | Sim |
| qe_i53 | integer | Sim |
| qe_i54 | integer | Sim |
| qe_i55 | integer | Sim |
| qe_i56 | integer | Sim |
| qe_i57 | integer | Sim |
| qe_i58 | integer | Sim |
| qe_i59 | integer | Sim |
| qe_i60 | integer | Sim |
| qe_i61 | integer | Sim |
| qe_i62 | integer | Sim |
| qe_i63 | integer | Sim |
| qe_i64 | integer | Sim |
| qe_i65 | integer | Sim |
| qe_i66 | integer | Sim |
| qe_i67 | integer | Sim |
| qe_i68 | integer | Sim |

---

## microdados_enade_arq7
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i01 | character | Sim |

---

## microdados_enade_arq6
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| nu_idade | integer | Sim |

---

## microdados_enade_arq8
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i02 | character | Sim |

---

## microdados_enade_arq9
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i03 | character | Sim |

---

## microdados_enade_arq10
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i04 | character | Sim |

---

## microdados_enade_arq11
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i05 | character | Sim |

---

## microdados_enade_arq12
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i06 | character | Sim |

---

## microdados_enade_arq13
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i07 | character | Sim |

---

## microdados_enade_arq14
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i08 | character | Sim |

---

## microdados_enade_arq15
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i09 | character | Sim |

---

## microdados_enade_arq16
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i10 | character | Sim |

---

## microdados_enade_arq17
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i11 | character | Sim |

---

## microdados_enade_arq18
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i12 | character | Sim |

---

## microdados_enade_arq19
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i13 | character | Sim |

---

## microdados_enade_arq20
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i14 | character | Sim |

---

## microdados_enade_arq21
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i15 | character | Sim |

---

## microdados_enade_arq23
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i17 | character | Sim |

---

## microdados_enade_arq24
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i18 | character | Sim |

---

## microdados_enade_arq25
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i19 | character | Sim |

---

## microdados_enade_arq26
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i20 | character | Sim |

---

## microdados_enade_arq27
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i21 | character | Sim |

---

## microdados_enade_arq28
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i22 | character | Sim |

---

## microdados_enade_arq29
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| qe_i23 | character | Sim |

---

## microdados_enade_arq5
**Tipo:** TABLE | **Colunas:** 3

| Nome | Tipo | Nulo |
|------|------|------|
| nu_ano | integer | Sim |
| co_curso | integer | Sim |
| tp_sexo | character | Sim |

---

