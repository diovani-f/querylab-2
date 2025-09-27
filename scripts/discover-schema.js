const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

// Configurações do banco de dados (usando variáveis de ambiente)
const client = new Client({
  host: process.env.QUERY_DB_HOST,
  port: process.env.QUERY_DB_PORT,
  user: process.env.QUERY_DB_USER,
  password: process.env.QUERY_DB_PASSWORD,
  database: process.env.QUERY_DB_TYPE,
});

async function discoverSchema() {
  try {
    console.log('🔍 Conectando e descobrindo schema inep...');
    await client.connect();
    console.log('✅ Conectado ao banco de dados com sucesso.');

    // Consulta para obter informações de todas as tabelas no schema 'inep'
    const tablesQuery = `
      SELECT tablename as table_name
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'inep'
    `;
    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows.map(row => row.table_name);

    if (tables.length === 0) {
      console.warn('⚠️ Nenhuma tabela encontrada no schema "inep". Verifique o nome do schema e as permissões.');
      await client.end();
      process.exit(0);
    }

    let discoveredTables = [];

    for (const tableName of tables) {
      // Consulta para obter informações das colunas
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'inep' AND table_name = $1
      `;
      const columnsResult = await client.query(columnsQuery, [tableName]);
      const columns = columnsResult.rows.map(col => ({
        name: col.column_name,
        dataType: col.data_type,
        nullable: col.is_nullable === 'YES'
      }));

      // Lógica para extrair chaves primárias
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

      discoveredTables.push({
        name: tableName,
        type: 'TABLE',
        columns: columns,
        primaryKeys: primaryKeys,
      });
    }

    const schema = {
      schemaName: 'inep',
      totalTables: discoveredTables.length,
      tables: discoveredTables,
      discoveredAt: new Date().toISOString(),
    };

    const outputDir = path.join(__dirname, '..', 'backend', 'data', 'schema-discovery');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Salvar arquivos
    fs.writeFileSync(path.join(outputDir, 'inep-schema-full.json'), JSON.stringify(schema, null, 2));
    fs.writeFileSync(path.join(outputDir, 'inep-schema-summary.json'), JSON.stringify(createAISummary(schema), null, 2));
    fs.writeFileSync(path.join(outputDir, 'inep-schema-docs.md'), createMarkdownDoc(schema));

    console.log(`✅ ${discoveredTables.length} tabelas processadas.`);
    console.log(`💾 Arquivos de schema salvos em: ${outputDir}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

function createAISummary(schema) {
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
        col.name.toLowerCase().includes('no_') ||
        col.name.toLowerCase().includes('nm_') ||
        col.name.toLowerCase().includes('descricao') ||
        col.name.toLowerCase().includes('data') ||
        col.name.toLowerCase().includes('ano') ||
        col.name.toLowerCase().includes('valor') ||
        col.name.toLowerCase().includes('numero') ||
        col.name.toLowerCase().includes('qtd') ||
        col.name.toLowerCase().includes('quantidade') ||
        col.name.toLowerCase().includes('nota') ||
        col.name.toLowerCase().includes('conceito') ||
        col.name.toLowerCase().includes('sg_uf') ||
        col.name.toLowerCase().includes('municipio') ||
        col.name.toLowerCase().includes('uf') ||
        col.name.toLowerCase().includes('regiao')
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
        estimatedSize: estimateTableSize(table.name, table.columns)
      }
    }))
  };
}

// Funções auxiliares para enriquecer o schema
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

  // Descrições baseadas em padrões conhecidos do INEP
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

  // Descrição genérica baseada nas colunas
  if (columnNames.some(c => c.includes('curso'))) {
    return `Tabela relacionada a cursos com ${columns.length} atributos`;
  } else if (columnNames.some(c => c.includes('aluno') || c.includes('estudante'))) {
    return `Dados de estudantes com ${columns.length} atributos`;
  }

  return `Tabela ${tableName} com ${columns.length} colunas`;
}

function extractTableKeywords(tableName, columns) {
  const keywords = new Set();

  // Palavras do nome da tabela
  tableName.toLowerCase().split('_').forEach(word => {
    if (word.length > 2) keywords.add(word);
  });

  // Palavras-chave das colunas
  columns.forEach(col => {
    col.name.toLowerCase().split('_').forEach(word => {
      if (word.length > 2 && !word.match(/^(co|nu|tp|in|sg|cs|qt)$/)) {
        keywords.add(word);
      }
    });
  });

  return Array.from(keywords).slice(0, 10); // Limitar a 10 palavras-chave
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

  return Math.min(score, 10); // Normalizar para 0-10
}

function estimateTableSize(tableName, columns) {
  const name = tableName.toLowerCase();

  // Estimativas baseadas em conhecimento do domínio INEP
  if (name.includes('microdados')) return 'large'; // Milhões de registros
  if (name.includes('censo')) return 'large';
  if (name.includes('dm_')) return 'medium'; // Centenas de milhares
  if (name.includes('municipios')) return 'small'; // ~5500 municípios
  if (name.includes('modalidade') || name.includes('tipo')) return 'small'; // Tabelas de lookup

  return 'medium';
}

function createMarkdownDoc(schema) {
  let md = `# Schema ${schema.schemaName}\n\n`;
  md += `**Descoberto:** ${new Date(schema.discoveredAt).toLocaleString('pt-BR')}\n`;
  md += `**Total de tabelas:** ${schema.totalTables}\n\n`;
  schema.tables.forEach(table => {
    md += `## ${table.name}\n`;
    md += `**Tipo:** ${table.type} | **Colunas:** ${table.columns.length}\n\n`;
    if (table.columns.length > 0) {
      md += `| Nome | Tipo | Nulo |\n|------|------|------|\n`;
      table.columns.forEach(col => {
        md += `| ${col.name} | ${col.dataType} | ${col.nullable ? 'Sim' : 'Não'} |\n`;
      });
      md += `\n`;
    }
    md += `---\n\n`;
  });
  return md;
}

if (require.main === module) {
  discoverSchema();
}

module.exports = { discoverSchema };
