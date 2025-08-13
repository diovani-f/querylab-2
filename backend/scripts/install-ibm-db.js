#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Tentando instalar IBM DB2 driver...');

try {
  // Verificar se já está instalado
  try {
    require('ibm_db');
    console.log('✅ IBM DB2 driver já está instalado');
    process.exit(0);
  } catch (e) {
    console.log('📦 IBM DB2 driver não encontrado, tentando instalar...');
  }

  // Tentar instalar com diferentes estratégias
  const strategies = [
    'npm install ibm_db@3.3.2 --build-from-source --verbose',
    'npm install ibm_db@3.2.4 --build-from-source',
    'npm install ibm_db@3.2.3',
    'npm install ibm_db@3.3.2'
  ];

  for (const strategy of strategies) {
    try {
      console.log(`🔄 Tentando: ${strategy}`);
      execSync(strategy, {
        stdio: 'inherit',
        timeout: 300000 // 5 minutos
      });

      // Verificar se a instalação funcionou
      require('ibm_db');
      console.log('✅ IBM DB2 driver instalado com sucesso!');
      process.exit(0);
    } catch (error) {
      console.log(`❌ Falha com estratégia: ${strategy}`);
      console.log(`Erro: ${error.message}`);
    }
  }

  console.log('⚠️ Não foi possível instalar o IBM DB2 driver');
  console.log('💡 O sistema funcionará apenas com JSON Server');

} catch (error) {
  console.error('❌ Erro durante instalação do IBM DB2:', error.message);
  console.log('💡 O sistema funcionará apenas com JSON Server');
}
