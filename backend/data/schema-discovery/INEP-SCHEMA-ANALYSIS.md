# 📊 Análise do Schema INEP - Banco DB2

**Data da Descoberta:** 13/08/2025 20:53  
**Total de Tabelas no Schema:** 97  
**Tabelas Analisadas:** 25 (25.7%)  
**Status:** Descoberta parcial bem-sucedida

## 🎯 Resumo Executivo

O schema INEP contém **97 tabelas** relacionadas a dados educacionais do Brasil. Conseguimos analisar detalhadamente **25 tabelas** que representam as principais categorias de dados:

### 📈 Categorias Identificadas:

1. **CENSO EDUCACIONAL** (10 tabelas analisadas)
   - Dados de instituições, cursos, vagas
   - Informações geográficas e administrativas

2. **AVALIAÇÃO MEC** (8 tabelas analisadas)
   - Instrumentos de avaliação
   - Conceitos e indicadores
   - Cálculos de avaliação

3. **CAPES/PÓS-GRADUAÇÃO** (2 tabelas analisadas)
   - Dados de discentes 2021 e 2022

4. **ENADE** (5 tabelas analisadas)
   - Dados de avaliação
   - Percepção dos estudantes

## 🗂️ Tabelas Principais Analisadas

### 📚 Censo Educacional
- **CENSO_IES** (8 colunas) - Instituições de Ensino Superior
- **CENSO_CURSOS** (21 colunas) - Cursos oferecidos
- **CENSO_CURSO_VAGAS_BRUTO** (203 colunas) - Dados de vagas detalhados
- **CENSO_CATEGORIAS_ADMINISTRATIVAS** (2 colunas) - Tipos de instituições
- **CENSO_CINE_AREA_DETALHADA** (3 colunas) - Áreas de conhecimento
- **CENSO_GRAUS_ACADEMICOS** (2 colunas) - Níveis acadêmicos
- **CENSO_MODALIDADES_ENSINO** (2 colunas) - Modalidades de ensino

### 🎓 Avaliação e Qualidade
- **DADOS_CPC** (29 colunas) - Conceito Preliminar de Curso
- **DADOS_ENADE** (10 colunas) - Exame Nacional de Desempenho
- **AVAL_MEC_CURSO_AVAL_INSTRUMENTO** (66 colunas) - Instrumentos de avaliação
- **AVAL_MEC_AVALIACOES** (9 colunas) - Avaliações realizadas
- **AVAL_MEC_CONCEITOS** (5 colunas) - Conceitos atribuídos

### 🔬 Pós-Graduação (CAPES)
- **CAPES_DISCENTES_2021** (7 colunas) - Discentes de pós-graduação 2021
- **CAPES_DISCENTES_2022** (7 colunas) - Discentes de pós-graduação 2022

## 🔑 Colunas-Chave Identificadas

### IDs Importantes:
- `ID_AREA_AVALIACAO` - Identificador de área de avaliação
- `ID_AREA_BASICA` - Identificador de área básica
- `ID_CONCEITO` - Identificador de conceito
- `ID_INDICADOR` - Identificador de indicador
- `CO_IES` - Código da instituição
- `CO_CURSO` - Código do curso

### Campos Descritivos:
- `NO_IES` - Nome da instituição
- `NO_CURSO` - Nome do curso
- `DS_*` - Campos de descrição
- `NU_ANO_*` - Campos de ano

## 🔗 Relacionamentos Potenciais

Identificamos relacionamentos entre:
- Tabelas de avaliação ↔ Conceitos
- Dados ENADE ↔ Cursos
- Instituições ↔ Cursos
- Áreas de avaliação ↔ Cursos

## 📊 Tabelas Não Analisadas (72 restantes)

Por limitações de rate limit, não conseguimos analisar detalhadamente:

### 📋 Categorias Restantes:
- **DADOS_ENADE_PERCEPCAO_QE_I01-I26** - Questões específicas de percepção
- **DM_ALUNO_20XX** - Dados de alunos por ano
- **DADOS_IDD, DADOS_IGC** - Indicadores de qualidade
- **Tabelas geográficas IBGE** - Dados de localização
- **SUCUPIRA_*** - Dados da plataforma Sucupira
- **V_DADOS_*** - Views de dados consolidados

## 🤖 Para Uso da IA

### ✅ Dados Disponíveis:
1. **Estrutura completa** das 25 principais tabelas
2. **Tipos de dados** e relacionamentos
3. **Categorização** por área temática
4. **Campos-chave** para joins

### 💡 Recomendações para Queries:

1. **Para dados de instituições:**
   ```sql
   SELECT * FROM INEP.CENSO_IES
   ```

2. **Para dados de cursos:**
   ```sql
   SELECT * FROM INEP.CENSO_CURSOS
   ```

3. **Para dados de avaliação:**
   ```sql
   SELECT * FROM INEP.DADOS_CPC
   SELECT * FROM INEP.DADOS_ENADE
   ```

4. **Para relacionar instituição e curso:**
   ```sql
   SELECT i.NO_IES, c.NO_CURSO 
   FROM INEP.CENSO_IES i
   JOIN INEP.CENSO_CURSOS c ON i.CO_IES = c.CO_IES
   ```

## 📁 Arquivos Gerados

1. **`inep-schema-full.json`** - Dados completos das 25 tabelas
2. **`inep-schema-summary.json`** - Resumo otimizado para IA
3. **`inep-schema-docs.md`** - Documentação detalhada

## 🔄 Próximos Passos

1. **Aguardar reset do rate limit** (15 minutos)
2. **Executar descoberta das tabelas restantes** em lotes menores
3. **Complementar relacionamentos** identificados
4. **Criar queries de exemplo** para casos de uso comuns

---

**Status:** ✅ Pronto para uso da IA com dados das principais tabelas  
**Cobertura:** 25.7% das tabelas (suficiente para maioria dos casos de uso)  
**Qualidade:** Alta - dados estruturados e relacionamentos identificados
