
# Código 001

## 1. Mudança do Formato do Schema: JSON → Texto Corrido (DDL-like)

### Antes

O schema era serializado como um objeto JSON completo (`JSON.stringify`) e enviado ao LLM. O formato JSON desperdiça tokens em caracteres estruturais (chaves, aspas, colchetes) que não agregam contexto semântico relevante para o modelo.

### Depois

O schema passou a ser convertido para uma representação textual compacta, semelhante a DDL (Data Definition Language):

```sql
SCHEMA: inep
Tabela `inep.censo_ies`: Colunas [ cod_ies, nome_ies, in_capital, cod_municipio, ... ]
Tabela `inep.censo_cursos`: Colunas [ cod_curso, nome_curso, cod_ies, ... ]

```

### Impacto

-   Redução significativa da quantidade de tokens consumidos por requisição
    
-   Melhor legibilidade estrutural para o modelo
    
-   Formato mais próximo dos padrões presentes nos dados de treinamento dos LLMs (DDL SQL)
    

----------

## 2. Correção do Bug de Colunas Vazias (Bug Principal)

O método `optimizeSchemaForLLM()` não repassava a propriedade `columns` das tabelas ao construir o objeto otimizado. Como consequência, a lista de colunas enviada à IA ficava sempre vazia, forçando o modelo a “adivinhar” os nomes das colunas — principal causa das alucinações identificadas.

### Correção

Foi adicionado o mapeamento explícito:

```javascript
columns: table.columns || []

```

na função de otimização, garantindo que as colunas reais do schema fossem sempre transmitidas ao LLM.

### Mudança

A lista de colunas passou a ser enviada explicitamente no prompt:

```sql
Tabela `inep.censo_ies`: Colunas [ cod_ies, nome_ies, in_capital, ... ]

```

Para o modelo Cloudflare SQLCoder, o Gemini passou a gerar um subprompt ultra-compacto contendo:

-   Apenas as colunas essenciais da consulta
    
-   Entre 1 e 3 tabelas
    
-   No máximo 5 a 8 colunas por tabela
    
-   Uma seção de “Critical Rules”, listando colunas inexistentes frequentemente alucinadas
    

### Impacto

-   O modelo passou a utilizar apenas colunas reais do schema
    
-   As regras de validação se tornaram efetivas
    
-   Redução expressiva de alucinações
    

> **CAUTION:**  
> Este era o bug mais crítico do sistema. Sem a lista real de colunas, qualquer mecanismo anti-alucinação era ineficaz, pois o modelo não possuía acesso às estruturas corretas do banco.

----------

## 3. Remoção de Tabelas Desnecessárias

### 3.1. Tabelas de Backup (Redundância Direta)

As tabelas de backup não agregavam valor ao processo de geração SQL e apenas aumentavam ambiguidade na escolha das fontes de dados.

#### Tabelas removidas

-   `censo_cursos_bkp`
    
-   `dados_cpc_bkp`
    
-   `ind_fluxo_ies_bkp`
    

----------

### 3.2. Tabelas de Controle de UI / Dashboards

As tabelas com prefixo `cesta_` eram utilizadas apenas pela plataforma interna para renderização de gráficos e dashboards, não sendo relevantes para consultas analíticas em linguagem natural.

#### Tabelas removidas

-   `cesta_dimensoes`
    
-   `cesta_indicadores`
    
-   `cesta_indicadores_visualizacoes`
    
-   `cesta_visualizacao_indicadores`
    
-   `matriculas_municipio`
    
-   `emec_instituicoes`
    

----------

### 3.3. Tabelas Auxiliares Temporárias / ETL

Tabelas temporárias utilizadas em processos de carga e transformação de dados também foram removidas do contexto enviado ao modelo.

#### Tabelas removidas

-   `enade_dic_aux`
    
-   `enade_dic_aux_tmp`
    

----------

### 3.4. Tabelas Redundantes (Brutas vs Consolidadas)

Versões brutas de tabelas foram ocultadas quando já existiam versões agregadas ou consolidadas adequadas para consultas analíticas.

#### Tabelas reduzidas ou removidas

-   `dados_cpc_brutos`
    
-   `igc_bruto`
    
-   `ind_fluxo_ies_tda`
    
-   `microdados_enade_questoes`
    
-   `microdados_enade_respostas`
    

### Impacto

-   Redução do tamanho do schema enviado ao LLM
    
-   Menor ambiguidade na seleção de tabelas
    
-   Redução de tokens consumidos
    
-   Maior assertividade nas consultas geradas
    

----------

## 4. Chain of Thought (Cadeia de Pensamento) para Validação de Colunas

### Mudança

O prompt passou a instruir explicitamente o modelo a seguir uma sequência de raciocínio antes de gerar o SQL:

1.  Explicar a intenção da consulta e as tabelas escolhidas
    
2.  Listar explicitamente as colunas que serão utilizadas
    
3.  Confirmar visualmente que as colunas existem no schema fornecido
    
4.  Gerar apenas então o SQL final
    

### Impacto

Ao forçar o modelo a verificar as colunas antes da geração da query, houve redução significativa de alucinações, pois o modelo passou a consultar o schema explicitamente em vez de confiar apenas na memória estatística de treinamento.

----------

## 5. Exemplos Práticos no Prompt

### Mudança

Foram adicionados quatro exemplos práticos de SQL ao prompt, cobrindo cenários recorrentes:

1.  Uso de `censo_ies` para consultas sobre capitais
    
2.  Uso de `emec_instituicoes` para dados de contato
    
3.  Cadeia geográfica completa utilizando múltiplos JOINs
    
4.  Cruzamento entre `censo_cursos` e `emec_instituicoes`
    

### Impacto

A técnica de Few-Shot Prompting passou a orientar o modelo para padrões corretos de construção SQL, reduzindo inconsistências e variações inesperadas.

----------

## 6. Prompt Especializado para SQLCoder via Gemini (Cloudflare)

### Mudança

Foi implementado um pipeline em dois estágios para o modelo Cloudflare SQLCoder-7b-2, devido à limitação reduzida de contexto:

1.  O Gemini analisa a pergunta e o schema completo, gerando um prompt ultra-compacto contendo:
    
    -   Task (em inglês)
        
    -   Schema mínimo necessário
        
    -   Critical Rules
        
    -   Example SQL
        
2.  O SQLCoder recebe apenas esse prompt otimizado
    

### Impacto

-   Melhor aproveitamento do contexto limitado do SQLCoder
    
-   Redução de desperdício de tokens
    
-   Geração de consultas mais coerentes e estáveis
    

----------

# Código 002/003/004

## 1. Auto-Correção e Tratamento de Erros SQL (Feedback Loop)

Foi implementado um ciclo de auto-correção com limite máximo de uma rodada adicional.

### Funcionamento

Quando a query SQL gerada pela IA falha na execução:

1.  O sistema captura o erro retornado pelo banco
    
2.  O erro e a query original são reenviados ao modelo
    
3.  O modelo retorna apenas a versão corrigida da consulta SQL
    

### Exemplos de erros tratados

-   Coluna inexistente
    
-   Erros de tipagem
    
-   JOIN incorreto
    
-   Problemas sintáticos
    

### Impacto

Redução significativa da taxa de falhas completas em consultas que apresentavam apenas pequenos erros estruturais.

----------

## 2. Implementação de Fuzzy Matching (Correção Semântica de Colunas)

Para reduzir alucinações de nomes de colunas, foi implementada validação baseada em Distância de Levenshtein.

### Funcionamento

O sistema:

1.  Extrai referências `tabela.coluna`
    
2.  Verifica se a coluna existe
    
3.  Caso não exista, procura a coluna válida mais próxima semanticamente
    

### Exemplo

```text
cod_istituicao → cod_ies

```

### Auto-Fix

Quando a distância encontrada é menor ou igual a 3:

-   O SQL é corrigido automaticamente
    
-   A substituição ocorre de forma transparente
    

O algoritmo também corrige colunas mencionadas sem alias de tabela, desde que não sejam palavras reservadas SQL.

### Impacto

-   Redução de falhas por pequenos erros ortográficos
    
-   Menor necessidade de reprocessamento via IA
    
-   Maior robustez na execução das queries
    

----------

## 3. Auto-Fixer de Alucinações Comuns (Hardcoded Typos)

Foi criada a função `autoFixCommonHallucinations` para corrigir automaticamente erros recorrentes observados nos modelos.

### Correções implementadas

-   `co_ies` → `cod_ies`
    
-   `co_curso` → `cod_curso`
    
-   `co_municipio` → `cod_municipio`
    
-   `sg_uf_ies` → `cod_municipio`
    
-   `nome_uf` → `nome_uf_ibge`
    
-   `sigla_uf` → `uf_ibge`
    

### Impacto

Esses erros deixam de chegar ao banco de dados e não consomem a rodada adicional do mecanismo de auto-correção.

----------

## 4. Exemplos Dinâmicos Baseados em Contexto (Dynamic Few-Shot)

O mecanismo de Few-Shot Prompting foi remodelado para reduzir tokens e aumentar precisão contextual.

### Funcionamento

Foram criados cinco exemplos fortes categorizados por tags:

-   `capital`
    
-   `contato`
    
-   `regiao`
    
-   `medicina`
    
-   `ead`
    

Quando o usuário faz uma pergunta:

1.  O sistema compara as palavras da pergunta com as tags
    
2.  Cada exemplo recebe uma pontuação
    
3.  Apenas os dois exemplos mais relevantes são enviados ao prompt
    

### Impacto

-   Redução de tokens
    
-   Maior aderência contextual
    
-   SQLs mais alinhados com a intenção da pergunta
    

----------

## 5. Garantia de Tabelas Core e Cadeia Geográfica no Redutor de Schema

O `SmartSchemaReducer` foi aprimorado para preservar tabelas essenciais durante a redução do schema.

### Tabelas sempre incluídas

-   `censo_ies`
    
-   `censo_cursos`
    
-   `municipios_ibge`
    
-   `microregioes_ibge`
    
-   `mesoregioes_ibge`
    
-   `uf_ibge`
    
-   `regioes_ibge`
    

### Melhorias adicionais

-   O algoritmo passou a pontuar tabelas também por similaridade entre colunas e pergunta do usuário
    
-   Cada coluna relevante adiciona peso adicional na seleção da tabela
    

### Impacto

-   Redução de falhas em consultas geográficas
    
-   Prevenção de JOINs alucinados
    
-   Melhor escolha de tabelas em perguntas específicas
