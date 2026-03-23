

## 📚 Censo da Educação Superior (Dados Estruturais e Vagas)

Este grupo consolida as tabelas focadas neste domínio específico.

### `censo_curso_vagas_bruto`
- **O que é:** A principal e mais abrangente tabela 'fato' do Censo da Educação Superior (com mais de 200 colunas). Diferente de cadastros simples, esta tabela materializa a oferta quantitativa anual do sistema educacional brasileiro, contendo contagens exatas de vagas, candidatos, ingressantes (calouros), matriculados e concluintes (formandos) por curso.
- **Para que serve na prática:** É indispensável para estudos de concorrência (relação candidato/vaga), acompanhamento de expansões de vagas (EAD x Presencial), e para pesquisas avançadas de inclusão e diversidade, já que permite cruzar quem entra, fica e conclui a universidade pelo recorte de raça/cor, faixa etária, gênero e uso de financiamentos (FIES, PROUNI) ou cotas.
- **Dados principais e Granularidade:** A granularidade é por Ano + Local da Oferta + Curso. Há dezenas de métricas quantitativas divididas em "blocos":
  - **Vagas e Inscritos:** `qt_vg_total`, `qt_inscrito_total` (separados por turno e modalidade).
  - **Alunos:** Contagens precisas segmentadas demograficamente, como gênero (`qt_ing_fem`), idade (`qt_mat_18_24`, `qt_mat_50_59`), e cor/raça (`qt_conc_branca`, `qt_conc_preta`, `qt_conc_indigena`).
  - **Acesso:** Quantidade de alunos com deficiência, apoiados por financiamento (`qt_ing_fies`, `qt_ing_prounip`) ou vagas sociais e étnicas (`qt_ing_rvredepublica`, `qt_ing_rvetnico`).

### `censo_ies_bruto`
- **O que é:** A tabela mais detalhada de Cadastro das Instituições de Educação Superior (IES). Diferente da `censo_ies` (que é apenas um resumo), esta contém 87 colunas com a "fotografia" analítica da infraestrutura, recursos humanos e geografia de cada universidade ou faculdade no país.
- **Para que serve na prática:** Muito usada para entender o "poder" estrutural de uma IES: se ela possui corpo docente altamente qualificado (doutores e mestres com dedicação exclusiva), acervo de biblioteca rico e recursos tecnológicos. Essencial para associar a qualidade estrutural à região demográfica em que atua.
- **Dados principais e Granularidade:** Um registro macro por Instituição/Ano.
  - **Recursos Humanos:** Perfil do corpo técnico e docente. Para professores, disseca a qualificação (`qt_doc_ex_dout`, `qt_doc_ex_mest`), regime de trabalho (dedicação exclusiva, tempo parcializado) e demografia.
  - **Infraestrutura:** Quantidade de periódicos e livros eletrônicos, além de descritores booleanos (`in_acesso_portal_capes`, `in_repositorio_institucional`).
  - **Geografia:** Campos que detalham CEP, bairro, microrregião e mesorregião do IBGE.

### `censo_cursos`
- **O que é:** O cadastro enxuto (tabela "dimensão") dos cursos de graduação do MEC. Identifica as informações essenciais e perenes do currículo que não oscilam numericamente a cada ano.
- **Para que serve na prática:** É o elo de ligação (`JOIN`) para traduzir o código numérico (`cod_curso`) em outras tabelas para seu nome original legível ("Engenharia de Software"). Agrupa e filtra dados pelo tempo de integralização projetado, e alinha a taxonomia de grandes áreas (padrões internacionais CINE e nacional TCU).
- **Dados principais e Granularidade:** Chave única por Curso (`cod_curso`).
  - **Identificadores:** `nome_curso` e data de início de funcionamento.
  - **Características:** Integra-se a dicionários menores de `id_grau_academico` (Bacharelado/Licenciatura) e `id_modalidade_ensino`. Possui o tempo projetado da graduação (em anos) e turno predominante.

### `censo_ies`
- **O que é:** O cadastro resumo (dimensão simplificada) das Instituições de Educação Superior. Uma versão "leve" focada puramente na identidade nominal da IES.
- **Para que serve na prática:** Perfeita para sistemas de *front-end* e filtros em painéis BI. O desenvolvedor utiliza esta tabela leve para popular *dropdowns* ou traduzir rapidamente o `cod_ies` em textos nominais e localizações sem o peso de carregar as centenas de métricas docentes da versão `bruto`.
- **Dados principais e Granularidade:** Oito colunas cruciais por IES: Chaves identificadoras (`cod_ies`), nomes para leitura `nome_ies` e `sigla_ies`, associados a `id_categoria_administrativa` e o município onde a reitoria ou sede se localiza.

## 📚 Avaliação e Qualidade do Ensino Público (Notas)

Este grupo consolida as tabelas focadas neste domínio específico.

### `dados_enade`
- **O que é:** Exame Nacional de Desempenho dos Estudantes. Avalia o rendimento dos concluintes dos cursos de graduação.
- **Para que serve na prática:** Mensurar a qualidade da educação ofertada aos alunos e comparar o rendimento das IES nas provas de Formação Geral e Componente Específico.
- **Dados principais e Granularidade:** Códigos do curso/IES, a nota bruta e nota padronizada, e em qual "faixa" do ENADE o curso se enquadrou.

### `dados_cpc_brutos`
- **O que é:** Conceito Preliminar de Curso. É a nota de qualidade avaliada **por curso** que unifica o ENADE, infraestrutura e corpo docente.
- **Para que serve na prática:** O principal indicador público para dizer se um curso específico em uma faculdade específica é de alta, média ou baixa qualidade.
- **Dados principais e Granularidade:** Nota final contínua do CPC e desdobramentos sobre a proporção de mestres, doutores, organização didático-pedagógica e desempenho dos estudantes.

### `dados_cpc`
- **O que é:** Conceito Preliminar de Curso. É a nota de qualidade avaliada **por curso** que unifica o ENADE, infraestrutura e corpo docente.
- **Para que serve na prática:** O principal indicador público para dizer se um curso específico em uma faculdade específica é de alta, média ou baixa qualidade.
- **Dados principais e Granularidade:** Nota final contínua do CPC e desdobramentos sobre a proporção de mestres, doutores, organização didático-pedagógica e desempenho dos estudantes.


### `igc_bruto`
- **O que é:** Índice Geral de Cursos Avaliados da Instituição. É a nota de qualidade avaliada **da IES (Faculdade como um todo)**.
- **Para que serve na prática:** Sintetizar em uma única nota a qualidade global da universidade (média de todos os cursos de graduação + os programas de mestrado/doutorado).
- **Dados principais e Granularidade:** O valor contínuo do IGC, o número de cursos avaliados no triênio da instituição e pesos de proporção.

### `dados_igc`
- **O que é:** Índice Geral de Cursos Avaliados da Instituição. É a nota de qualidade avaliada **da IES (Faculdade como um todo)**.
- **Para que serve na prática:** Sintetizar em uma única nota a qualidade global da universidade (média de todos os cursos de graduação + os programas de mestrado/doutorado).
- **Dados principais e Granularidade:** O valor contínuo do IGC, o número de cursos avaliados no triênio da instituição e pesos de proporção.

### `igc_fatos`
- **O que é:** Índice Geral de Cursos Avaliados da Instituição. É a nota de qualidade avaliada **da IES (Faculdade como um todo)**.
- **Para que serve na prática:** Sintetizar em uma única nota a qualidade global da universidade (média de todos os cursos de graduação + os programas de mestrado/doutorado).
- **Dados principais e Granularidade:** O valor contínuo do IGC, o número de cursos avaliados no triênio da instituição e pesos de proporção.

### `dados_percepcao_enade`
- **O que é:** Dados granulares do questionário socioeconômico preenchido pelo estudante ao fazer a prova do ENADE.
- **Para que serve na prática:** Cruzar a nota teórica do aluno com a sua condição de vida, percepção da prova, esforço empreendido e avaliação que ele faz do próprio curso.
- **Dados principais e Granularidade:** Mapeamento das questões do questionário, alternativas respondidas (`qe_i27`, `qe_i28`, etc.) e respostas brutas da prova.

### `dados_enade_percepcao_respostas`
- **O que é:** Dados granulares do questionário socioeconômico preenchido pelo estudante ao fazer a prova do ENADE.
- **Para que serve na prática:** Cruzar a nota teórica do aluno com a sua condição de vida, percepção da prova, esforço empreendido e avaliação que ele faz do próprio curso.
- **Dados principais e Granularidade:** Mapeamento das questões do questionário, alternativas respondidas (`qe_i27`, `qe_i28`, etc.) e respostas brutas da prova.

### `dados_percepcao_enade_questoes`
- **O que é:** Dados granulares do questionário socioeconômico preenchido pelo estudante ao fazer a prova do ENADE.
- **Para que serve na prática:** Cruzar a nota teórica do aluno com a sua condição de vida, percepção da prova, esforço empreendido e avaliação que ele faz do próprio curso.
- **Dados principais e Granularidade:** Mapeamento das questões do questionário, alternativas respondidas (`qe_i27`, `qe_i28`, etc.) e respostas brutas da prova.

### `microdados_enade_respostas`
- **O que é:** Dados granulares do questionário socioeconômico preenchido pelo estudante ao fazer a prova do ENADE.
- **Para que serve na prática:** Cruzar a nota teórica do aluno com a sua condição de vida, percepção da prova, esforço empreendido e avaliação que ele faz do próprio curso.
- **Dados principais e Granularidade:** Mapeamento das questões do questionário, alternativas respondidas (`qe_i27`, `qe_i28`, etc.) e respostas brutas da prova.

### `microdados_enade_questoes`
- **O que é:** Dados granulares do questionário socioeconômico preenchido pelo estudante ao fazer a prova do ENADE.
- **Para que serve na prática:** Cruzar a nota teórica do aluno com a sua condição de vida, percepção da prova, esforço empreendido e avaliação que ele faz do próprio curso.
- **Dados principais e Granularidade:** Mapeamento das questões do questionário, alternativas respondidas (`qe_i27`, `qe_i28`, etc.) e respostas brutas da prova.

## 📚 Pós-Graduação (Dados da CAPES)

Este grupo consolida as tabelas focadas neste domínio específico.

### `capes_programas_bruto`
- **O que é:** Lista dos Programas de Pós-Graduação *Stricto Sensu* (Mestrado/Doutorado) autorizados no Brasil.
- **Para que serve na prática:** Dimensionar o tamanho e a distribuição da pesquisa avançada e ecossistema de pesquisadores nas instituições de ensino.
- **Dados principais e Granularidade:** Nome do programa, área de conhecimento (CAPES), ano de início e o conceito (nota avaliativa da CAPES do programa inteiro).

### `capes_cursos_bruto`
- **O que é:** Lista dos Cursos ofertados dentro dos Programas de Pós-Graduação catalogados.
- **Para que serve na prática:** Entender a granularidade abaixo do programa (ex: um programa de Biologia com um Mestrado Acadêmico e um Doutorado separadamente).
- **Dados principais e Granularidade:** Nome específico do curso, nota de conceito individual do curso e a situação cadastral dele.

## 📚 Dicionários do Censo (Tabelas Auxiliares de Tradução)

Este grupo consolida as tabelas focadas neste domínio específico.

### `censo_categorias_administrativas`
- **O que é:** Tabela Dicionário (Domínio) do Censo, usada para catalogar sob qual modelo de negócio e administração a IES opera.
- **Para que serve na prática:** Funciona como a principal *dimensão* de tradução para responder à pergunta: "Essa faculdade é Pública, Privada com Fins Lucrativos, ou Comunitária?". Ela poupa dezenas de megabytes na carga do banco por manter a tabela 'fato' apenas com o código numérico (`id_categoria_administrativa`).
- **Dados principais e Granularidade:** Possui uma chave primária inteira e duas frentes descritivas. O campo `descr_categoria_administrativa` detalha (ex: "Pública Federal", "Privada com fins lucrativos"), e o `descr_cat_adm_agrupada` resume em guarda-chuvas maiores (ex: "Pública", "Privada").

### `censo_cine_area_detalhada`
- **O que é:** O nível mais granular e específico (Level 3) da classificação internacional da UNESCO conhecida como CINE (Classificação Internacional Normalizada da Educação).
- **Para que serve na prática:** Evita que os analistas se percam nos mais de 30 mil cursos distintos que existem. A partir dessa tabela, um modelo BI consegue unificar e somar todas as vagas de cursos similares ("Medicina Veterinária" com "Med. Veterinaria Noturno" e "Vet.") no bloco unificado CINE 0841.
- **Dados principais e Granularidade:** Três chaves principais. O `cod_cine_area_detalhada` (a PK exata, ex: "0111"), a descrição em texto `descr_cine_area_detalhada` (ex: "Ciência da educação") e a chave para `cod_cine_area_especifica` (que serve para o 'rollup' macro para o nível 2 da hierarquia).

### `censo_cine_area_geral`
- **O que é:** O topo da hierarquia (Level 1) da classificação CINE. Resumo das "grandes indústrias" do conhecimento.
- **Para que serve na prática:** É usada primariamente nos painéis e gráficos mais executivos do Ministério da Educação para mostrar de forma geral se o Brasil forma mais profissionais em "Negócios" ou em "Saúde", ignorando o nome minucioso de cada curso.
- **Dados principais e Granularidade:** Tabela enxuta contendo apenas a PK `cod_cine_area_geral` de 2 dígitos (ex: "01", "04") e o respectivo rótulo de exibição `descr_cine_area_geral` ("Negócios, administração e direito", "Saúde e bem-estar").

### `censo_cine_rotulo`
- **O que é:** O dicionário validador completo para a nomenclatura oficial dos milhares de cursos mapeados no país, adaptado ao formato padrão da classificação CINE e exigências governamentais do TCU.
- **Para que serve na prática:** Serve de base ("de/para") para a geração e batimento de relatórios de auditoria educacional e financeira perante o TCU (Tribunal de Contas da União), permitindo a correta alocação de metas versus os gastos efetuados pelas IES públicas.
- **Dados principais e Granularidade:** A chave principal alfanumérica é o `cod_cine_rotulo` (ex: "0011A01"). Conta com o campo extensional `descr_cine_rotulo` para detalhar e possui duas colunas valiosas extras próprias para os relatórios do TCU: `area_tcu_1` e `area_tcu_2`.

### `censo_graus_academicos`
- **O que é:** O diminuto dicionário referencial para mapear internamente as modalidades de diploma de saída e titulações outorgadas por um curso ou programa de capacitação ao educando.
- **Para que serve na prática:** Imprescindível para filtrar o modelo de formação de uma query analítica. Ex: Auxilia quem quer auditar a formação de professores, permitindo limitar as buscas na tabela "Fato" exclusivamente aos id's da "Licenciatura", separando do bloco "Bacharel" comum.
- **Dados principais e Granularidade:** Tabela simples e crucial tipo chave-valor: `id_grau_academico` atua como PK numérica (1=Bacharelado, 2=Licenciatura, 3=Tecnológico) em relação ao seu respectivo valor literal no campo `descr_grau_academico`.

### `censo_modalidades_ensino`
- **O que é:** Dicionario Presencial / EAD
- **Para que serve na prática:** É o alicerce essencial e principal referencial para gerar dashboards do comparativo e da colisão que moldou a última década universitária do Brasil: Quantificar o avanço abissal em lucros e vagas que as matrizes Educação à Distância (EAD) conseguiram perante às estagnadas Universidades Físicas.

### `censo_niveis_academicos`
- **O que é:** Dicionario graduação / Seqüencial de Formação Específica.
- **Para que serve na prática:** Isolamento para limpeza de relatórios. Quase a totalidade estaria na "Graduação", todavia possuir a separação na query assegura a não-contaminação dos registros quando algum registro temporário cai no banco com os "Cursos Sequenciais de Formações Específicas".


### `censo_organizacoes_academicas`
- **O que é:** Universidades x Centro Universitario x Institutos Federais/Cefet x Faculdade.
- **Para que serve na prática:** Um relatório financeiro sério, num painel analítico do BI, nunca junta as minúsculas Faculdades Locais Especializadas de bairro que dão poucas aulas e vivem da mensalidade particular com as Gigantestas Universidades e Institutos Federais obrigadas com cotas de Mestres e Doutores perenes voltados 90% para Pesquisas Pesadas do Estado. Esta dimensão resolve este fatiamento.


### `enade_dic_aux`
- **O que é:** Mapa de variaveis
- **Para que serve na prática:** Tipicamente elaborada em ecossistemas de migrações e ETL para servir passivamente como "Mapas de Variáveis" nos momentos de ingestão dos arquivos textuais flat das provas (onde "Key" de resposta 3 mapeia pra uma "questão de múltipla escola específica").


### `enade_dic_aux_tmp`
- **O que é:** Mapa de variaveis
- **Para que serve na prática:** Alojada no sistema para reter as sub-lotes e blocos soltos de leituras do exame das entidades durante os batches de limpeza massivos até os dados saneados do exame serem imputados sem poluição estrutural dentro da matriz Oficial fato e matrizes dimensões Enade finais.

## 📚 Contexto Geográfico, Demográfico e Econômico (IBGE)

Este grupo consolida as tabelas focadas neste domínio específico.

### `municipios_ibge`
- **O que é:** Informações geograficas de municipios.
- **Para que serve na prática:** Ser o 'chassi' geográfico da base. Aglutinar os resultados educacionais (vagas, notas IGC) pelas coordenadas, cidades, ou macro/micro áreas de relevância política ou desenvolvimento regional.

### `uf_ibge`
- **O que é:** informações geograficas de estados.
- **Para que serve na prática:** Ser o 'chassi' geográfico da base. Aglutinar os resultados educacionais (vagas, notas IGC) pelas coordenadas, cidades, ou macro/micro áreas de relevância política ou desenvolvimento regional.


### `variaveis_pib_municipios_ibge`
- **O que é:** VAriaveis sobre o pib dos municipios brasileiros


### `mesoregioes_ibge`
- **O que é:** Mesoregiões geograficas

### `microregioes_ibge`
- **O que é:** Microregiões geograficas

### `regioes_ibge`
- **O que é:** NORTE / SUL / NORDESTE....

### `ibge_demografia_idade_grupos`
- **O que é:** Grupo de idades

### `ibge_demografia_por_idade_bruto`
- **O que é:** Quantidade por grupo de idade

### `idhms`
- **O que é:** IDHM por cod do ibge e ano

### `pibs_per_capita`
- **O que é:** PIB por cod do ibge e ano

## 📚 Indicadores de Fluxo Educacional

### `fluxo_tda`
- **O que é:** Indicador de Fluxo da Educação Superior, um cruzamento complexo para tentar demonstrar a eficiência do fluxo escolar.
- **Para que serve na prática:** Acompanhar a 'jornada do aluno': avaliar permanência, evasão escolar (desistência do curso ao longo do tempo), conclusão no prazo adequado, trancamento e abandono nas IES.
- **Dados principais e Granularidade:** Taxas de Desistência Acumulada (TDA) e outros percentuais analíticos longitudinais de retenção/formação ano-base institucional.

### `ind_fluxo_ies`
- **O que é:** Indicador de Fluxo da Educação Superior, um cruzamento complexo para tentar demonstrar a eficiência do fluxo escolar.
- **Para que serve na prática:** Acompanhar a 'jornada do aluno': avaliar permanência, evasão escolar (desistência do curso ao longo do tempo), conclusão no prazo adequado, trancamento e abandono nas IES.
- **Dados principais e Granularidade:** Taxas de Desistência Acumulada (TDA) e outros percentuais analíticos longitudinais de retenção/formação ano-base institucional.

### `ind_fluxo_ies_bkp`
- **O que é:** Indicador de Fluxo da Educação Superior, um cruzamento complexo para tentar demonstrar a eficiência do fluxo escolar.
- **Para que serve na prática:** Acompanhar a 'jornada do aluno': avaliar permanência, evasão escolar (desistência do curso ao longo do tempo), conclusão no prazo adequado, trancamento e abandono nas IES.
- **Dados principais e Granularidade:** Taxas de Desistência Acumulada (TDA) e outros percentuais analíticos longitudinais de retenção/formação ano-base institucional.

### `ind_fluxo_ies_tda`
- **O que é:** Indicador de Fluxo da Educação Superior, um cruzamento complexo para tentar demonstrar a eficiência do fluxo escolar.
- **Para que serve na prática:** Acompanhar a 'jornada do aluno': avaliar permanência, evasão escolar (desistência do curso ao longo do tempo), conclusão no prazo adequado, trancamento e abandono nas IES.
- **Dados principais e Granularidade:** Taxas de Desistência Acumulada (TDA) e outros percentuais analíticos longitudinais de retenção/formação ano-base institucional.

## 📚 Métricas Diversas e Plataformas de Visualização

Este grupo consolida as tabelas focadas neste domínio específico.

### `matriculas_municipio`
- **O que é:** Tabelas provavelmente usadas pelo módulo do sistema de painéis analíticos internos (Visualizações) ou dados complementares legados.
- **Para que serve na prática:** São as matrizes usadas para mapear quais indicadores serão exibidos nos visuais web front-end para o usuário da plataforma administrativa, ligando tabelas às dimensões construídas de painel.
- **Dados principais e Granularidade:** Controle de software mapeando id da dimensão e descrições do indicador (ex: `id_visualizacao`). Além da `emec_instituicoes` que pode servir de checagem do E-MEC online para fins transacionais do MEC versus IES do Brasil e matriculas prefeiturais simplificadas.

### `emec_instituicoes`
- **O que é:** Tabelas provavelmente usadas pelo módulo do sistema de painéis analíticos internos (Visualizações) ou dados complementares legados.
- **Para que serve na prática:** São as matrizes usadas para mapear quais indicadores serão exibidos nos visuais web front-end para o usuário da plataforma administrativa, ligando tabelas às dimensões construídas de painel.
- **Dados principais e Granularidade:** Controle de software mapeando id da dimensão e descrições do indicador (ex: `id_visualizacao`). Além da `emec_instituicoes` que pode servir de checagem do E-MEC online para fins transacionais do MEC versus IES do Brasil e matriculas prefeiturais simplificadas.

### `cesta_indicadores`
- **O que é:** Tabelas provavelmente usadas pelo módulo do sistema de painéis analíticos internos (Visualizações) ou dados complementares legados.
- **Para que serve na prática:** São as matrizes usadas para mapear quais indicadores serão exibidos nos visuais web front-end para o usuário da plataforma administrativa, ligando tabelas às dimensões construídas de painel.
- **Dados principais e Granularidade:** Controle de software mapeando id da dimensão e descrições do indicador (ex: `id_visualizacao`). Além da `emec_instituicoes` que pode servir de checagem do E-MEC online para fins transacionais do MEC versus IES do Brasil e matriculas prefeiturais simplificadas.

### `cesta_visualizacao_indicadores`
- **O que é:** Tabelas provavelmente usadas pelo módulo do sistema de painéis analíticos internos (Visualizações) ou dados complementares legados.
- **Para que serve na prática:** São as matrizes usadas para mapear quais indicadores serão exibidos nos visuais web front-end para o usuário da plataforma administrativa, ligando tabelas às dimensões construídas de painel.
- **Dados principais e Granularidade:** Controle de software mapeando id da dimensão e descrições do indicador (ex: `id_visualizacao`). Além da `emec_instituicoes` que pode servir de checagem do E-MEC online para fins transacionais do MEC versus IES do Brasil e matriculas prefeiturais simplificadas.

### `cesta_indicadores_visualizacoes`
- **O que é:** Tabelas provavelmente usadas pelo módulo do sistema de painéis analíticos internos (Visualizações) ou dados complementares legados.
- **Para que serve na prática:** São as matrizes usadas para mapear quais indicadores serão exibidos nos visuais web front-end para o usuário da plataforma administrativa, ligando tabelas às dimensões construídas de painel.
- **Dados principais e Granularidade:** Controle de software mapeando id da dimensão e descrições do indicador (ex: `id_visualizacao`). Além da `emec_instituicoes` que pode servir de checagem do E-MEC online para fins transacionais do MEC versus IES do Brasil e matriculas prefeiturais simplificadas.

### `cesta_dimensoes`
- **O que é:** Tabelas provavelmente usadas pelo módulo do sistema de painéis analíticos internos (Visualizações) ou dados complementares legados.
- **Para que serve na prática:** São as matrizes usadas para mapear quais indicadores serão exibidos nos visuais web front-end para o usuário da plataforma administrativa, ligando tabelas às dimensões construídas de painel.
- **Dados principais e Granularidade:** Controle de software mapeando id da dimensão e descrições do indicador (ex: `id_visualizacao`). Além da `emec_instituicoes` que pode servir de checagem do E-MEC online para fins transacionais do MEC versus IES do Brasil e matriculas prefeiturais simplificadas.

### `ies_area_cine_pos`
- **O que é:** Tabela auxiliar da modelagem.
- **Para que serve na prática:** Suporte ao ecossistema principal de cruzamentos educacionais.
- **Dados principais e Granularidade:** Colunas diversas relativas.

---

### Sugestão de Abordagem para o Projeto:
Em ferramentas de Business Intelligence ou nos scripts focados na investigação desta base, sua análise deve começar a partir de uma "Tabela Fato" (núcleo da informação, como a **`censo_curso_vagas_bruto`**, **`dados_cpc`** ou a **`capes_programas_bruto`**). As outras servem como dimensão.
Por exemplo, seu motor de query vai solicitar "A quantidade de Vagas `(censo_curso_vagas...)`, filtrado onde Categoria Administrativa é X `(censo_categorias...)`, no município com alto IDHM `(idhms)`".
