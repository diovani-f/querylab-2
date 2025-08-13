export interface CredentialValidation {
  isValid: boolean
  missingFields: string[]
  warnings: string[]
  recommendations: string[]
}

export class CredentialsValidator {
  /**
   * Valida credenciais DB2 baseado no status da VPN
   */
  static validateDB2Credentials(isVPNConnected: boolean): CredentialValidation {
    const result: CredentialValidation = {
      isValid: true,
      missingFields: [],
      warnings: [],
      recommendations: []
    }

    if (isVPNConnected) {
      // Validar credenciais VPN
      result.recommendations.push('VPN detectada - usando configurações VPN')
      
      if (!process.env.DB2_VPN_HOST) {
        result.missingFields.push('DB2_VPN_HOST')
        result.isValid = false
      }
      
      if (!process.env.DB2_VPN_USERNAME) {
        result.missingFields.push('DB2_VPN_USERNAME')
        result.isValid = false
      }
      
      if (!process.env.DB2_VPN_PASSWORD) {
        result.missingFields.push('DB2_VPN_PASSWORD')
        result.isValid = false
      }
      
      if (!process.env.DB2_VPN_DATABASE) {
        result.warnings.push('DB2_VPN_DATABASE não configurado - usando padrão: UNIVDB')
      }
      
      if (!process.env.DB2_VPN_PORT) {
        result.warnings.push('DB2_VPN_PORT não configurado - usando padrão: 50000')
      }
    } else {
      // Validar credenciais locais
      result.recommendations.push('VPN não detectada - usando configurações locais')
      
      if (!process.env.DB2_HOST) {
        result.missingFields.push('DB2_HOST')
        result.isValid = false
      }
      
      if (!process.env.DB2_USERNAME) {
        result.missingFields.push('DB2_USERNAME')
        result.isValid = false
      }
      
      if (!process.env.DB2_PASSWORD) {
        result.missingFields.push('DB2_PASSWORD')
        result.isValid = false
      }
      
      if (!process.env.DB2_DATABASE) {
        result.warnings.push('DB2_DATABASE não configurado - usando padrão: UNIVDB')
      }
      
      if (!process.env.DB2_PORT) {
        result.warnings.push('DB2_PORT não configurado - usando padrão: 50000')
      }
    }

    // Validações gerais
    this.validateGeneralSettings(result)
    
    return result
  }

  /**
   * Valida configurações gerais
   */
  private static validateGeneralSettings(result: CredentialValidation): void {
    // Validar timeouts
    const connectionTimeout = parseInt(process.env.DB2_CONNECTION_TIMEOUT || '30000')
    if (connectionTimeout < 5000) {
      result.warnings.push('DB2_CONNECTION_TIMEOUT muito baixo - recomendado: >= 5000ms')
    }
    
    const queryTimeout = parseInt(process.env.DB2_QUERY_TIMEOUT || '60000')
    if (queryTimeout < 10000) {
      result.warnings.push('DB2_QUERY_TIMEOUT muito baixo - recomendado: >= 10000ms')
    }
    
    // Validar retry settings
    const retryAttempts = parseInt(process.env.DB2_RETRY_ATTEMPTS || '3')
    if (retryAttempts < 1) {
      result.warnings.push('DB2_RETRY_ATTEMPTS deve ser >= 1')
    }
    
    const retryDelay = parseInt(process.env.DB2_RETRY_DELAY || '5000')
    if (retryDelay < 1000) {
      result.warnings.push('DB2_RETRY_DELAY muito baixo - recomendado: >= 1000ms')
    }

    // Recomendações de segurança
    if (process.env.NODE_ENV === 'production') {
      if (process.env.DB2_SSL_ENABLED !== 'true') {
        result.warnings.push('SSL não habilitado em produção - recomendado habilitar')
      }
      
      if (process.env.JWT_SECRET === 'querylab-secret-key-2024-change-in-production') {
        result.warnings.push('JWT_SECRET usando valor padrão - altere em produção!')
      }
    }
  }

  /**
   * Gera relatório de validação formatado
   */
  static generateValidationReport(validation: CredentialValidation): string {
    let report = '\n📋 RELATÓRIO DE VALIDAÇÃO DE CREDENCIAIS\n'
    report += '=' .repeat(50) + '\n'
    
    // Status geral
    report += `\n✅ Status: ${validation.isValid ? 'VÁLIDO' : 'INVÁLIDO'}\n`
    
    // Campos obrigatórios faltando
    if (validation.missingFields.length > 0) {
      report += '\n❌ CAMPOS OBRIGATÓRIOS FALTANDO:\n'
      validation.missingFields.forEach(field => {
        report += `   - ${field}\n`
      })
    }
    
    // Avisos
    if (validation.warnings.length > 0) {
      report += '\n⚠️ AVISOS:\n'
      validation.warnings.forEach(warning => {
        report += `   - ${warning}\n`
      })
    }
    
    // Recomendações
    if (validation.recommendations.length > 0) {
      report += '\n💡 RECOMENDAÇÕES:\n'
      validation.recommendations.forEach(rec => {
        report += `   - ${rec}\n`
      })
    }
    
    report += '\n' + '=' .repeat(50) + '\n'
    
    return report
  }

  /**
   * Valida e exibe relatório
   */
  static validateAndReport(isVPNConnected: boolean): CredentialValidation {
    const validation = this.validateDB2Credentials(isVPNConnected)
    const report = this.generateValidationReport(validation)
    
    console.log(report)
    
    return validation
  }

  /**
   * Gera template de arquivo .env baseado no status da VPN
   */
  static generateEnvTemplate(isVPNConnected: boolean): string {
    let template = '# Configurações DB2 - QueryLab\n'
    template += '# Gerado automaticamente baseado no status da VPN\n\n'
    
    if (isVPNConnected) {
      template += '# VPN DETECTADA - Configure as credenciais VPN:\n'
      template += 'DB2_VPN_HOST=seu-host-vpn-aqui\n'
      template += 'DB2_VPN_PORT=50000\n'
      template += 'DB2_VPN_DATABASE=UNIVDB\n'
      template += 'DB2_VPN_USERNAME=seu_usuario_vpn\n'
      template += 'DB2_VPN_PASSWORD=sua_senha_vpn\n\n'
    } else {
      template += '# VPN NÃO DETECTADA - Configure as credenciais locais:\n'
      template += 'DB2_HOST=seu-host-db2-aqui\n'
      template += 'DB2_PORT=50000\n'
      template += 'DB2_DATABASE=UNIVDB\n'
      template += 'DB2_USERNAME=seu_usuario\n'
      template += 'DB2_PASSWORD=sua_senha\n\n'
    }
    
    template += '# Configurações avançadas (opcionais):\n'
    template += 'DB2_CONNECTION_TIMEOUT=30000\n'
    template += 'DB2_QUERY_TIMEOUT=60000\n'
    template += 'DB2_RETRY_ATTEMPTS=3\n'
    template += 'DB2_RETRY_DELAY=5000\n'
    template += 'DB2_SSL_ENABLED=true\n'
    
    return template
  }
}
