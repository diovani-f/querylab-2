const axios = require('axios')
const fs = require('fs')
const path = require('path')

const client = axios.create({
  baseURL: 'http://localhost:3002',
  headers: { 'Authorization': 'Bearer sua_chave_secreta_super_forte_123456' },
  timeout: 300000
})

async function discoverSchema() {
  try {
    console.log('🔍 Descobrindo schema INEP...')
    
    await client.get('/health')
    console.log('✅ Proxy funcionando')
    
    const response = await client.get('/schema/INEP')
    if (!response.data.success) throw new Error(response.data.error)
    
    const schema = response.data.data
    console.log(`✅ ${schema.totalTables} tabelas encontradas`)
    
    const outputDir = path.join(__dirname, '..', 'backend', 'data', 'schema-discovery')
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
    
    // Salvar arquivos
    fs.writeFileSync(path.join(outputDir, 'inep-schema-full.json'), JSON.stringify(schema, null, 2))
    fs.writeFileSync(path.join(outputDir, 'inep-schema-summary.json'), JSON.stringify(createAISummary(schema), null, 2))
    fs.writeFileSync(path.join(outputDir, 'inep-schema-docs.md'), createMarkdownDoc(schema))
    
    console.log(`💾 Arquivos salvos em: ${outputDir}`)
    console.log(`📊 ${schema.tables.length} tabelas processadas`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
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
  }
}

function createMarkdownDoc(schema) {
  let md = `# Schema ${schema.schemaName}\n\n`
  md += `**Descoberto:** ${new Date(schema.discoveredAt).toLocaleString('pt-BR')}\n`
  md += `**Total de tabelas:** ${schema.totalTables}\n\n`
  
  schema.tables.forEach(table => {
    md += `## ${table.name}\n`
    md += `**Tipo:** ${table.type} | **Colunas:** ${table.columns.length}\n\n`
    
    if (table.columns.length > 0) {
      md += `| Nome | Tipo | Nulo |\n|------|------|------|\n`
      table.columns.forEach(col => {
        md += `| ${col.name} | ${col.dataType} | ${col.nullable ? 'Sim' : 'Não'} |\n`
      })
      md += `\n`
    }
    md += `---\n\n`
  })
  
  return md
}

if (require.main === module) {
  discoverSchema()
}

module.exports = { discoverSchema }
