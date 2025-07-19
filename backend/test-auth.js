// Script simples para testar a autenticação
const fetch = require('node-fetch');

async function testAuth() {
  try {
    console.log('🧪 Testando autenticação...\n');

    // Teste 1: Login com credenciais do admin
    console.log('1. Testando login do admin...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@querylab.com',
        senha: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Status:', loginResponse.status);
    console.log('Resposta:', JSON.stringify(loginData, null, 2));

    if (loginData.success && loginData.token) {
      console.log('✅ Login bem-sucedido!\n');

      // Teste 2: Verificar token
      console.log('2. Testando verificação de token...');
      const meResponse = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${loginData.token}`
        }
      });

      const meData = await meResponse.json();
      console.log('Status:', meResponse.status);
      console.log('Resposta:', JSON.stringify(meData, null, 2));

      if (meData.success) {
        console.log('✅ Token válido!\n');
      } else {
        console.log('❌ Token inválido!\n');
      }
    } else {
      console.log('❌ Login falhou!\n');
    }

    // Teste 3: Login com credenciais inválidas
    console.log('3. Testando login com credenciais inválidas...');
    const invalidLoginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@querylab.com',
        senha: 'senhaerrada'
      })
    });

    const invalidLoginData = await invalidLoginResponse.json();
    console.log('Status:', invalidLoginResponse.status);
    console.log('Resposta:', JSON.stringify(invalidLoginData, null, 2));

    if (!invalidLoginData.success) {
      console.log('✅ Credenciais inválidas rejeitadas corretamente!\n');
    } else {
      console.log('❌ Credenciais inválidas aceitas incorretamente!\n');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.log('\n📝 Certifique-se de que:');
    console.log('   - O JSON Server está rodando na porta 3001');
    console.log('   - O Backend está rodando na porta 5000');
    console.log('   - As dependências estão instaladas');
  }
}

testAuth();
