const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

// Configurações do banco de dados
const client = new Client({
  host: process.env.QUERY_DB_HOST,
  port: process.env.QUERY_DB_PORT,
  user: process.env.QUERY_DB_USER,
  password: process.env.QUERY_DB_PASSWORD,
  database: process.env.QUERY_DB_TYPE,
});

async function regenerateEnhancedSchema() {
  try {
    console.log('🔄 Regenerando schema com melhorias semânticas...');
    await client.connect();
    console.log('✅ Conectado ao banco de dados.');

    // Obter todas as tabelas do schema 'inep'
    const tablesQuery = `
      SELECT tablename as table_name
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'inep'
      ORDER BY tablename
    `;
    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows.map(row => row.table_name);

    if (tables.length === 0) {
      console.warn('⚠️ Nenhuma tabela encontrada no schema "inep".');
      await client.end();
      process.exit(0);
    }

    console.log(`📊 Processando ${tables.length} tabelas...`);
    let discoveredTables = [];

    for (const tableName of tables) {
      console.log(`🔍 Analisando tabela: ${tableName}`);

      // Obter informações das colunas
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'inep' AND table_name = $1
        ORDER BY ordinal_position
      `;
      const columnsResult = await client.query(columnsQuery, [tableName]);
      const columns = columnsResult.rows.map(col => ({
        name: col.column_name,
        dataType: col.data_type,
        nullable: col.is_nullable === 'YES'
      }));

      // Obter chaves primárias
      const primaryKeysQuery = `
        SELECT a.attname AS column_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_index i ON i.indrelid = c.oid
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
        WHERE n.nspname = 'inep' AND c.relname = $1 AND i.indisprimary
      `;
      const primaryKeysResult = await client.query(primaryKeysQuery, [tableName]);
      const primaryKeys = primaryKeysResult.rows.map(row => row.column_name);

      // Obter estatísticas da tabela (estimativa de tamanho)
      let estimatedRows = 0;
      try {
        const statsQuery = `
          SELECT n_tup_ins - n_tup_del as estimated_rows
          FROM pg_stat_user_tables
          WHERE schemaname = 'inep' AND relname = $1
        `;
        const statsResult = await client.query(statsQuery, [tableName]);
        if (statsResult.rows.length > 0) {
          estimatedRows = statsResult.rows[0].estimated_rows || 0;
        }
      } catch (error) {
        // Ignorar erros de estatísticas
      }

      discoveredTables.push({
        name: tableName,
        type: 'TABLE',
        columns: columns,
        primaryKeys: primaryKeys,
        estimatedRows: estimatedRows
      });
    }

    // Criar schema completo
    const fullSchema = {
      schemaName: 'inep',
      totalTables: discoveredTables.length,
      tables: discoveredTables,
      discoveredAt: new Date().toISOString(),
    };

    // Criar schema otimizado para IA com as novas funções
    const aiOptimizedSchema = createEnhancedAISummary(fullSchema);

    // Criar documentação markdown melhorada
    const enhancedDocs = createEnhancedMarkdownDoc(fullSchema, aiOptimizedSchema);

    // Salvar arquivos
    const outputDir = path.join(__dirname, '..', 'backend', 'data', 'schema-discovery');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Backup dos arquivos antigos
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(outputDir, 'backup', timestamp);
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    // Fazer backup se arquivos existirem
    const filesToBackup = [
      'inep-schema-full.json',
      'inep-schema-summary.json',
      'inep-schema-docs.md'
    ];

    filesToBackup.forEach(filename => {
      const filePath = path.join(outputDir, filename);
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, path.join(backupDir, filename));
      }
    });

    // Salvar novos arquivos
    fs.writeFileSync(
      path.join(outputDir, 'inep-schema-full.json'),
      JSON.stringify(fullSchema, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, 'inep-schema-summary.json'),
      JSON.stringify(aiOptimizedSchema, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, 'inep-schema-docs.md'),
      enhancedDocs
    );

    // Criar arquivo de estatísticas
    const stats = generateSchemaStatistics(aiOptimizedSchema);
    fs.writeFileSync(
      path.join(outputDir, 'inep-schema-stats.json'),
      JSON.stringify(stats, null, 2)
    );

    console.log(`✅ ${discoveredTables.length} tabelas processadas com sucesso!`);
    console.log(`💾 Arquivos salvos em: ${outputDir}`);
    console.log(`📦 Backup criado em: ${backupDir}`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Categorias: ${stats.categoriesCount}`);
    console.log(`   - Tabelas com dados temporais: ${stats.tablesWithTemporalData}`);
    console.log(`   - Tabelas com dados geográficos: ${stats.tablesWithGeographicData}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Função melhorada para criar resumo otimizado para IA
function createEnhancedAISummary(schema) {
  return {
    schemaName: schema.schemaName,
    totalTables: schema.totalTables,
    processedTables: schema.tables.length,
    discoveredAt: schema.discoveredAt,
    tables: schema.tables.map(table => ({
      name: table.name,
      type: table.type,
      columnCount: table.columns.length,
      primaryKeys: table.primaryKeys,

      // Categorizar tabela por domínio educacional
      category: categorizeTable(table.name),

      // Gerar descrição semântica da tabela
      description: generateTableDescription(table.name, table.columns),

      // Palavras-chave para busca semântica
      keywords: extractTableKeywords(table.name, table.columns),

      // Colunas chave (IDs, PKs, FKs)
      keyColumns: table.columns.filter(col =>
        table.primaryKeys.includes(col.name) ||
        col.name.toLowerCase().includes('id') ||
        col.name.toLowerCase().includes('codigo') ||
        col.name.toLowerCase().includes('co_')
      ).map(col => ({
        name: col.name,
        dataType: col.dataType,
        nullable: col.nullable,
        isPrimaryKey: table.primaryKeys.includes(col.name),
        isIdentifier: col.name.toLowerCase().includes('id') || col.name.toLowerCase().includes('codigo')
      })),

      // Colunas importantes (nomes, descrições, valores, datas)
      importantColumns: table.columns.filter(col =>
        col.name.toLowerCase().includes('nome') ||
        col.name.toLowerCase().includes('descricao') ||
        col.name.toLowerCase().includes('data') ||
        col.name.toLowerCase().includes('ano') ||
        col.name.toLowerCase().includes('valor') ||
        col.name.toLowerCase().includes('numero') ||
        col.name.toLowerCase().includes('qtd') ||
        col.name.toLowerCase().includes('quantidade') ||
        col.name.toLowerCase().includes('nota') ||
        col.name.toLowerCase().includes('conceito')
      ).map(col => ({
        name: col.name,
        dataType: col.dataType,
        nullable: col.nullable,
        semanticType: getColumnSemanticType(col.name)
      })),

      // Estimativa de relevância para diferentes tipos de consulta
      relevanceScores: {
        students: calculateRelevanceScore(table.name, table.columns, 'students'),
        courses: calculateRelevanceScore(table.name, table.columns, 'courses'),
        institutions: calculateRelevanceScore(table.name, table.columns, 'institutions'),
        performance: calculateRelevanceScore(table.name, table.columns, 'performance'),
        demographics: calculateRelevanceScore(table.name, table.columns, 'demographics')
      },

      // Indicadores de qualidade dos dados
      dataQuality: {
        hasTemporalData: table.columns.some(col =>
          col.name.toLowerCase().includes('ano') ||
          col.name.toLowerCase().includes('data')
        ),
        hasGeographicData: table.columns.some(col =>
          col.name.toLowerCase().includes('municipio') ||
          col.name.toLowerCase().includes('uf') ||
          col.name.toLowerCase().includes('regiao')
        ),
        estimatedSize: estimateTableSize(table.name, table.columns, table.estimatedRows)
      },

      // Informações adicionais
      estimatedRows: table.estimatedRows || 0,
      sampleDataAvailable: table.estimatedRows > 0
    })),

    // Relacionamentos potenciais baseados em nomes de colunas
    relationships: findPotentialRelationships(schema.tables)
  };
}

// Funções auxiliares (importadas do discover-schema.js melhorado)
function categorizeTable(tableName) {
  const name = tableName.toLowerCase();

  if (name.includes('aluno') || name.includes('estudante') || name.includes('discente')) {
    return 'students';
  } else if (name.includes('curso') || name.includes('programa')) {
    return 'courses';
  } else if (name.includes('instituicao') || name.includes('ies') || name.includes('universidade')) {
    return 'institutions';
  } else if (name.includes('enade') || name.includes('avaliacao') || name.includes('nota')) {
    return 'performance';
  } else if (name.includes('censo') || name.includes('microdados')) {
    return 'census';
  } else if (name.includes('municipio') || name.includes('ibge') || name.includes('regiao')) {
    return 'geography';
  } else if (name.includes('modalidade') || name.includes('tipo')) {
    return 'metadata';
  }

  return 'other';
}

function generateTableDescription(tableName, columns) {
  const name = tableName.toLowerCase();
  const columnNames = columns.map(c => c.name.toLowerCase());

  if (name.includes('censo_cursos')) {
    return 'Dados do Censo da Educação Superior sobre cursos oferecidos pelas instituições';
  } else if (name.includes('censo_aluno')) {
    return 'Informações dos estudantes matriculados no ensino superior';
  } else if (name.includes('enade')) {
    return 'Resultados e dados do Exame Nacional de Desempenho dos Estudantes';
  } else if (name.includes('dm_aluno')) {
    return 'Dimensão de alunos com dados demográficos e acadêmicos';
  } else if (name.includes('municipios')) {
    return 'Dados geográficos e demográficos dos municípios brasileiros';
  } else if (name.includes('modalidade')) {
    return 'Tipos e modalidades de ensino (presencial, EAD, etc.)';
  }

  if (columnNames.some(c => c.includes('curso'))) {
    return `Tabela relacionada a cursos com ${columns.length} atributos`;
  } else if (columnNames.some(c => c.includes('aluno') || c.includes('estudante'))) {
    return `Dados de estudantes com ${columns.length} atributos`;
  }

  return `Tabela ${tableName} com ${columns.length} colunas`;
}

function extractTableKeywords(tableName, columns) {
  const keywords = new Set();

  tableName.toLowerCase().split('_').forEach(word => {
    if (word.length > 2) keywords.add(word);
  });

  columns.forEach(col => {
    col.name.toLowerCase().split('_').forEach(word => {
      if (word.length > 2 && !word.match(/^(co|nu|tp|in|sg|cs|qt)$/)) {
        keywords.add(word);
      }
    });
  });

  return Array.from(keywords).slice(0, 10);
}

function getColumnSemanticType(columnName) {
  const name = columnName.toLowerCase();

  if (name.includes('nome') || name.includes('nm_')) return 'name';
  if (name.includes('descricao') || name.includes('ds_')) return 'description';
  if (name.includes('data') || name.includes('dt_')) return 'date';
  if (name.includes('ano') || name.includes('nu_ano')) return 'year';
  if (name.includes('valor') || name.includes('vl_')) return 'value';
  if (name.includes('quantidade') || name.includes('qtd') || name.includes('qt_')) return 'quantity';
  if (name.includes('nota') || name.includes('conceito')) return 'score';
  if (name.includes('codigo') || name.includes('co_')) return 'code';
  if (name.includes('id')) return 'identifier';

  return 'other';
}

function calculateRelevanceScore(tableName, columns, domain) {
  const name = tableName.toLowerCase();
  const columnNames = columns.map(c => c.name.toLowerCase()).join(' ');
  let score = 0;

  switch (domain) {
    case 'students':
      if (name.includes('aluno') || name.includes('estudante') || name.includes('discente')) score += 10;
      if (columnNames.includes('aluno') || columnNames.includes('estudante')) score += 5;
      if (columnNames.includes('idade') || columnNames.includes('sexo')) score += 3;
      break;

    case 'courses':
      if (name.includes('curso') || name.includes('programa')) score += 10;
      if (columnNames.includes('curso') || columnNames.includes('programa')) score += 5;
      if (columnNames.includes('modalidade') || columnNames.includes('grau')) score += 3;
      break;

    case 'institutions':
      if (name.includes('ies') || name.includes('instituicao') || name.includes('universidade')) score += 10;
      if (columnNames.includes('instituicao') || columnNames.includes('ies')) score += 5;
      break;

    case 'performance':
      if (name.includes('enade') || name.includes('avaliacao') || name.includes('nota')) score += 10;
      if (columnNames.includes('nota') || columnNames.includes('conceito')) score += 5;
      break;

    case 'demographics':
      if (name.includes('municipio') || name.includes('regiao') || name.includes('ibge')) score += 10;
      if (columnNames.includes('municipio') || columnNames.includes('uf')) score += 5;
      break;
  }

  return Math.min(score, 10);
}

function estimateTableSize(tableName, columns, estimatedRows) {
  const name = tableName.toLowerCase();

  // Usar dados reais se disponíveis
  if (estimatedRows > 1000000) return 'large';
  if (estimatedRows > 100000) return 'medium';
  if (estimatedRows > 0) return 'small';

  // Fallback para estimativas baseadas em conhecimento
  if (name.includes('microdados')) return 'large';
  if (name.includes('censo')) return 'large';
  if (name.includes('dm_')) return 'medium';
  if (name.includes('municipios')) return 'small';
  if (name.includes('modalidade') || name.includes('tipo')) return 'small';

  return 'medium';
}

function findPotentialRelationships(tables) {
  const relationships = [];

  tables.forEach(table => {
    table.columns.forEach(column => {
      const colName = column.name.toLowerCase();

      // Procurar por possíveis chaves estrangeiras
      if (colName.includes('co_') || colName.includes('id_')) {
        const potentialTargets = tables.filter(t =>
          t.name !== table.name &&
          t.primaryKeys.some(pk => pk.toLowerCase() === colName)
        );

        potentialTargets.forEach(target => {
          relationships.push({
            fromTable: table.name,
            fromColumn: column.name,
            toTable: target.name,
            toColumn: target.primaryKeys.find(pk => pk.toLowerCase() === colName),
            type: 'foreign_key_potential'
          });
        });
      }
    });
  });

  return relationships.slice(0, 50); // Limitar relacionamentos
}

function generateSchemaStatistics(schema) {
  const tables = schema.tables || [];

  return {
    totalTables: tables.length,
    categoriesCount: [...new Set(tables.map(t => t.category))].length,
    categories: [...new Set(tables.map(t => t.category))],
    tablesWithTemporalData: tables.filter(t => t.dataQuality?.hasTemporalData).length,
    tablesWithGeographicData: tables.filter(t => t.dataQuality?.hasGeographicData).length,
    tablesWithPrimaryKeys: tables.filter(t => t.primaryKeys && t.primaryKeys.length > 0).length,
    averageColumnsPerTable: Math.round(tables.reduce((sum, t) => sum + t.columnCount, 0) / tables.length),
    sizeDistribution: {
      small: tables.filter(t => t.dataQuality?.estimatedSize === 'small').length,
      medium: tables.filter(t => t.dataQuality?.estimatedSize === 'medium').length,
      large: tables.filter(t => t.dataQuality?.estimatedSize === 'large').length
    },
    topRelevanceScores: {
      students: Math.max(...tables.map(t => t.relevanceScores?.students || 0)),
      courses: Math.max(...tables.map(t => t.relevanceScores?.courses || 0)),
      institutions: Math.max(...tables.map(t => t.relevanceScores?.institutions || 0)),
      performance: Math.max(...tables.map(t => t.relevanceScores?.performance || 0)),
      demographics: Math.max(...tables.map(t => t.relevanceScores?.demographics || 0))
    }
  };
}

function createEnhancedMarkdownDoc(fullSchema, aiSchema) {
  let md = `# Schema INEP - Documentação Melhorada\n\n`;
  md += `**Descoberto:** ${new Date(fullSchema.discoveredAt).toLocaleString('pt-BR')}\n`;
  md += `**Total de tabelas:** ${fullSchema.totalTables}\n`;
  md += `**Tabelas processadas:** ${aiSchema.tables.length}\n\n`;

  // Estatísticas por categoria
  const categories = [...new Set(aiSchema.tables.map(t => t.category))];
  md += `## Distribuição por Categorias\n\n`;
  categories.forEach(category => {
    const count = aiSchema.tables.filter(t => t.category === category).length;
    md += `- **${category}**: ${count} tabelas\n`;
  });
  md += `\n`;

  // Top tabelas por categoria
  categories.forEach(category => {
    const tablesInCategory = aiSchema.tables
      .filter(t => t.category === category)
      .sort((a, b) => b.columnCount - a.columnCount)
      .slice(0, 5);

    if (tablesInCategory.length > 0) {
      md += `## Categoria: ${category}\n\n`;
      tablesInCategory.forEach(table => {
        md += `### ${table.name}\n`;
        md += `**Descrição:** ${table.description}\n`;
        md += `**Colunas:** ${table.columnCount} | **Tamanho estimado:** ${table.dataQuality.estimatedSize}\n`;
        md += `**Palavras-chave:** ${table.keywords.join(', ')}\n\n`;
      });
    }
  });

  return md;
}

if (require.main === module) {
  regenerateEnhancedSchema();
}

module.exports = {
  regenerateEnhancedSchema,
  createEnhancedAISummary
};
