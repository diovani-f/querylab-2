# Proposta de Recorte do Schema (Redução de 50 para ~35 Tabelas)

Analisando o seu arquivo `inep-schema-summary.json` e o dicionário `analise_schema_relatorio.md`, identifiquei que você possui exatas **50 tabelas** no resumo atual. 

É **totalmente possível fazer um recorte maior** removendo tabelas que poluem o contexto da IA com dados redundantes, de backup, temporários ou voltados estritamente para o Front-end/Dashboards (ao invés de análise de dados direta).

Aqui estão as tabelas que podem ser **removidas** do schema enviado para a IA sem perda de qualidade:

## 1. Tabelas de Backup (Redundância Direta)
A IA não deve saber que existem backups, isso só causa confusão na hora de escolher qual tabela consultar.
- `censo_cursos_bkp`
- `dados_cpc_bkp`
- `ind_fluxo_ies_bkp`

## 2. Tabelas de Controle de UI / Dashboards (Plataforma Interna)
As tabelas com prefixo `cesta_` servem para o sistema do QueryLab saber o que renderizar na tela (visuais). A IA de texto-para-SQL que responde perguntas de negócios/educação não precisa consultá-las.
- `cesta_dimensoes`
- `cesta_indicadores`
- `cesta_indicadores_visualizacoes`
- `cesta_visualizacao_indicadores`
- `matriculas_municipio` *(segundo o dic. de dados, serve de apoio para o sistema web/visual)*
- `emec_instituicoes` *(tabela transacional legada/apoio de views)*

## 3. Tabelas Auxiliares Temporárias / ETL
Tabelas usadas durante carga ou estruturação de dicionários brutos pelo banco.
- `enade_dic_aux`
- `enade_dic_aux_tmp`

## 4. Tabelas Redundantes (Fatos vs Brutos)
Se você já tem versões agregadas/consolidadas, muitas vezes não é necessário expor a bruta para perguntas gerais (a não ser que a IA vá minerar o microdado no nível aluno). 
*Nota: É recomendável remover as versões duplicadas se o nível de resposta tolerado for apenas agregado. Se precisar manter, deixe claro a distinção.*
- `dados_cpc_brutos` (reduzida se já existe `dados_cpc`)
- `igc_bruto` (reduzida se já existe `dados_igc`)
- `ind_fluxo_ies_tda` (reduzida em prol da `fluxo_tda` ou `ind_fluxo_ies`)
- `microdados_enade_questoes` / `microdados_enade_respostas` (se a IA pode usar apenas as tabalas consolidadas de percepção `dados_percepcao_enade`, ocultar a versão `microdados` economiza tokens).

## Conclusão da Análise
Com essa limpeza conservadora de **13 a 16 tabelas**, seu schema passará de 50 para cerca de **34 a 37 tabelas**, otimizando o envio (menos tokens) e diminuindo drasticamente as alucinações (a IA não fará um join num arquivo `_bkp` acidentalmente). 

Você pode gerar um novo JSON summary ignorando esses nomes de tabelas na sua rotina de extração ou editando o `inep-schema-summary.json` original de forma a excluí-las da propriedade `"tables"`.
