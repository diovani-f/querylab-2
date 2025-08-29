const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configurações do banco de dados (usando variáveis de ambiente)
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function discoverSchema() {
  try {
    console.log('🔍 Conectando e descobrindo schema INEP...');
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
      keyColumns: table.columns.filter(col =>
        table.primaryKeys.includes(col.name) || col.name.toLowerCase().includes('id')
      ).map(col => ({ name: col.name, dataType: col.dataType, nullable: col.nullable })),
      importantColumns: table.columns.filter(col =>
        col.name.toLowerCase().includes('nome') ||
        col.name.toLowerCase().includes('codigo') ||
        col.name.toLowerCase().includes('ano') ||
        col.name.toLowerCase().includes('data')
      ).map(col => ({ name: col.name, dataType: col.dataType, nullable: col.nullable }))
    }))
  };
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
