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

// Tabelas principais do INEP (excluindo tabelas de alunos por anonimidade)
const MAIN_TABLES = [
  // Cursos e Programas
  'capes_cursos_bruto',
  'capes_programas_bruto',
  'censo_cursos',
  'censo_cursos_bkp',
  'censo_curso_vagas_bruto',

  // Modalidades e Categorias
  'censo_modalidades_ensino',
  'censo_categorias_administrativas',
  'censo_cine_area_detalhada',
  'censo_cine_area_geral',
  'censo_cine_rotulo',

  // Instituições
  'emec_instituicoes',

  // Graus Acadêmicos
  'censo_graus_academicos',

  // IES (Instituições de Ensino Superior)
  'censo_ies',
  'censo_ies_bruto',

  // Níveis Acadêmicos
  'censo_niveis_academicos',

  // Organizações Acadêmicas
  'censo_organizacoes_academicas',

  // Dimensões e Indicadores
  'cesta_dimensoes',
  'cesta_indicadores',
  'cesta_indicadores_visualizacoes',
  'cesta_visualizacao_indicadores',

  // Dados CPC
  'dados_cpc',
  'dados_cpc_bkp',
  'dados_cpc_brutos',

  // Dados ENADE
  'dados_enade',
  'dados_enade_percepcao_respostas',

  // Dados IGC
  'dados_igc',
  'dados_percepcao_enade',
  'dados_percepcao_enade_questoes',

  // ENADE Auxiliares
  'enade_dic_aux',
  'enade_dic_aux_tmp',

  // Fluxo
  'fluxo_tda',

  // IBGE Demografia
  'ibge_demografia_idade_grupos',
  'ibge_demografia_por_idade_bruto',

  // IDHMS
  'idhms',

  // IES Área e Cine
  'ies_area_cine_pos',

  // IGC
  'igc_bruto',
  'igc_fatos',

  // Indicadores de Fluxo
  'ind_fluxo_ies',
  'ind_fluxo_ies_bkp',
  'ind_fluxo_ies_tda',

  // Matrículas
  'matriculas_municipio',

  // Mesoregiões
  'mesoregioes_ibge',

  // Microdados ENADE (apenas tabelas de questões e respostas, não de alunos)
  'microdados_enade_questoes',
  'microdados_enade_respostas',

  // Microregiões
  'microregioes_ibge',

  // Municípios
  'municipios_ibge',

  // PIBs
  'pibs_per_capita',

  // Regiões
  'regioes_ibge',

  // UF
  'uf_ibge',

  // Variáveis PIB
  'variaveis_pib_municipios_ibge'
];

async function discoverSchema() {
  try {
    console.log('🔍 Conectando e descobrindo schema inep...');
    await client.connect();
    console.log('✅ Conectado ao banco de dados com sucesso.');

    // Consulta para obter informações apenas das tabelas principais
    const tablesQuery = `
      SELECT tablename as table_name
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'inep'
        AND tablename = ANY($1::text[])
      ORDER BY tablename
    `;
    const tablesResult = await client.query(tablesQuery, [MAIN_TABLES]);
    const tables = tablesResult.rows.map(row => row.table_name);

    if (tables.length === 0) {
      console.warn('⚠️ Nenhuma tabela principal encontrada no schema "inep". Verifique o nome do schema e as permissões.');
      await client.end();
      process.exit(0);
    }

    console.log(`📊 Processando ${tables.length} tabelas principais de ${MAIN_TABLES.length} especificadas...`);

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
    tables: schema.tables.map(table => {
      // Formato compacto: apenas informações essenciais
      return {
        name: table.name,
        columns: table.columns.map(col => {
          // Formato ultra-compacto: "nome:tipo" ou "nome:tipo!" se NOT NULL
          const typeMap = {
            'character varying': 'varchar',
            'integer': 'int',
            'bigint': 'bigint',
            'numeric': 'numeric',
            'text': 'text',
            'boolean': 'bool',
            'date': 'date',
            'timestamp without time zone': 'timestamp',
            'timestamp with time zone': 'timestamptz',
            'double precision': 'float8',
            'real': 'float4',
            'smallint': 'int2'
          };

          const shortType = typeMap[col.dataType] || col.dataType;
          const nullMarker = col.nullable ? '' : '!';
          const pkMarker = table.primaryKeys.includes(col.name) ? '*' : '';

          return `${col.name}:${shortType}${nullMarker}${pkMarker}`;
        })
      };
    })
  };
}

// Função auxiliar para criar documentação markdown simplificada
function createMarkdownDoc(schema) {
  let md = `# Schema ${schema.schemaName}\n\n`;
  md += `**Descoberto:** ${new Date(schema.discoveredAt).toLocaleString('pt-BR')}\n`;
  md += `**Total de tabelas:** ${schema.totalTables}\n\n`;

  schema.tables.forEach(table => {
    md += `## ${table.name}\n`;
    md += `**Colunas:** ${table.columns.length}\n\n`;

    if (table.columns.length > 0) {
      md += `| Coluna | Tipo | Nullable | PK |\n|--------|------|----------|----|\n`;
      table.columns.forEach(col => {
        const isPK = table.primaryKeys.includes(col.name);
        md += `| ${col.name} | ${col.dataType} | ${col.nullable ? '✓' : '✗'} | ${isPK ? '🔑' : ''} |\n`;
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
