// Script para testar arquitetura híbrida
require('dotenv').config()

const { DatabaseService } = require('./dist/services/database-service')
const { QueryDatabaseService } = require('./dist/services/query-database-service')
const { QueryService } = require('./dist/services/query-service')
const { VPNDetector } = require('./dist/utils/vpn-detector')

async function testHybridArchitecture() {
  console.log('🏗️ TESTE DA ARQUITETURA HÍBRIDA')
  console.log('=' .repeat(60))
  console.log('📊 Aplicação: JSON Server (auth, sessões, histórico)')
  console.log('🔍 Consultas: DB2 (queries SQL da LLM)')
  console.log('=' .repeat(60))

  try {
    // 1. Verificar VPN
    console.log('\n📡 1. Verificando status da VPN...')
    const vpnDetector = VPNDetector.getInstance()
    const vpnStatus = await vpnDetector.detectGlobalProtect()
    
    console.log(`VPN: ${vpnStatus.isConnected ? '✅ Conectada' : '❌ Desconectada'}`)
    if (vpnStatus.vpnName) console.log(`Nome: ${vpnStatus.vpnName}`)

    // 2. Testar banco da aplicação (JSON Server)
    console.log('\n📊 2. Testando banco da aplicação (JSON Server)...')
    const dbService = DatabaseService.getInstance()
    await dbService.initialize()
    
    const appDbConnected = await dbService.testConnection()
    console.log(`Status: ${appDbConnected ? '✅ Conectado' : '❌ Desconectado'}`)
    console.log(`Tipo: ${dbService.getCurrentDatabaseType()}`)

    // 3. Testar banco de consultas (DB2)
    console.log('\n🔍 3. Testando banco de consultas (DB2)...')
    const queryDbService = QueryDatabaseService.getInstance()
    await queryDbService.initialize()
    
    const queryDbConnected = await queryDbService.testConnection()
    const queryDbStatus = queryDbService.getStatus()
    
    console.log(`Status: ${queryDbConnected ? '✅ Conectado' : '❌ Desconectado'}`)
    console.log(`Tipo: ${queryDbStatus.queryDbType}`)
    console.log(`Inicializado: ${queryDbStatus.isInitialized ? '✅' : '❌'}`)

    // 4. Testar QueryService (integração)
    console.log('\n🔧 4. Testando QueryService (integração)...')
    const queryService = QueryService.getInstance()
    
    // Testar query simples
    console.log('\nExecutando query teste...')
    const testQuery = 'SELECT COUNT(*) as total FROM SYSIBM.SYSDUMMY1'
    const result = await queryService.executeQuery(testQuery)
    
    console.log('✅ Query executada com sucesso!')
    console.log(`Colunas: ${result.columns.join(', ')}`)
    console.log(`Linhas: ${result.rowCount}`)
    console.log(`Tempo: ${result.executionTime}ms`)
    console.log(`Dados: ${JSON.stringify(result.rows)}`)

    // 5. Testar status do QueryService
    console.log('\n📋 5. Status dos serviços...')
    const serviceStatus = queryService.getQueryServiceStatus()
    console.log(`Query DB Tipo: ${serviceStatus.queryDbType}`)
    console.log(`Inicializado: ${serviceStatus.isInitialized ? '✅' : '❌'}`)
    console.log(`Conectado: ${serviceStatus.isConnected ? '✅' : '❌'}`)

    // 6. Testar schema (se DB2)
    if (queryDbStatus.queryDbType === 'db2' && queryDbConnected) {
      console.log('\n🗄️ 6. Testando obtenção de schema...')
      try {
        const schema = await queryService.getSchemaInfo()
        console.log('✅ Schema obtido com sucesso!')
        console.log(`Tabelas: ${schema.tables?.length || 0}`)
        console.log(`Views: ${schema.views?.length || 0}`)
        console.log(`Procedures: ${schema.procedures?.length || 0}`)
      } catch (error) {
        console.log('⚠️ Erro ao obter schema:', error.message)
      }
    }

    // 7. Resumo final
    console.log('\n' + '=' .repeat(60))
    console.log('📋 RESUMO DA ARQUITETURA HÍBRIDA')
    console.log('=' .repeat(60))
    console.log(`📊 Banco da Aplicação: ${appDbConnected ? '✅ OK' : '❌ ERRO'} (${dbService.getCurrentDatabaseType()})`)
    console.log(`🔍 Banco de Consultas: ${queryDbConnected ? '✅ OK' : '❌ ERRO'} (${queryDbStatus.queryDbType})`)
    console.log(`📡 VPN GlobalProtect: ${vpnStatus.isConnected ? '✅ Conectada' : '❌ Desconectada'}`)
    
    const overallStatus = appDbConnected && queryDbConnected
    console.log(`\n🎯 Status Geral: ${overallStatus ? '✅ SISTEMA OPERACIONAL' : '⚠️ SISTEMA PARCIAL'}`)
    
    if (overallStatus) {
      console.log('\n🎉 ARQUITETURA HÍBRIDA FUNCIONANDO PERFEITAMENTE!')
      console.log('✅ JSON Server para dados da aplicação')
      console.log('✅ DB2 para consultas SQL da LLM')
      console.log('✅ Detecção automática de VPN')
      console.log('✅ Fallback para simulação se necessário')
    } else {
      console.log('\n⚠️ SISTEMA EM MODO PARCIAL')
      if (!appDbConnected) {
        console.log('❌ Problema com banco da aplicação (JSON Server)')
      }
      if (!queryDbConnected) {
        console.log('❌ Problema com banco de consultas (DB2)')
        console.log('💡 Consultas usarão simulação como fallback')
      }
    }

    console.log('\n' + '=' .repeat(60))

  } catch (error) {
    console.log('\n' + '=' .repeat(60))
    console.log('❌ ERRO NO TESTE DA ARQUITETURA:')
    console.error(error.message)
    console.log('=' .repeat(60))
  }
}

// Executar teste
if (require.main === module) {
  testHybridArchitecture()
}

module.exports = { testHybridArchitecture }
