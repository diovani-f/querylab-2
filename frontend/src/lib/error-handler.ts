/**
 * Sistema de tratamento de erros seguro
 * Abstrai erros técnicos do backend e mostra apenas mensagens amigáveis para o usuário
 */

export interface ErrorInfo {
  userMessage: string
  logMessage: string
  type: 'network' | 'auth' | 'validation' | 'server' | 'unknown'
}

/**
 * Mapeia erros técnicos para mensagens amigáveis
 */
const ERROR_MESSAGES = {
  // Erros de rede/conexão
  network: {
    default: 'Problema de conexão. Verifique sua internet e tente novamente.',
    timeout: 'A operação demorou mais que o esperado. Tente novamente.',
    offline: 'Você parece estar offline. Verifique sua conexão.',
  },
  
  // Erros de autenticação
  auth: {
    default: 'Sua sessão expirou. Faça login novamente.',
    invalid: 'Credenciais inválidas. Verifique seus dados.',
    forbidden: 'Você não tem permissão para esta ação.',
  },
  
  // Erros de validação
  validation: {
    default: 'Dados inválidos. Verifique as informações e tente novamente.',
    required: 'Alguns campos obrigatórios não foram preenchidos.',
    format: 'Formato de dados inválido.',
  },
  
  // Erros do servidor
  server: {
    default: 'Erro interno do sistema. Nossa equipe foi notificada.',
    maintenance: 'Sistema em manutenção. Tente novamente em alguns minutos.',
    overload: 'Sistema temporariamente sobrecarregado. Tente novamente.',
  },
  
  // Erros específicos da aplicação
  chat: {
    default: 'Erro ao processar sua consulta. Tente reformular a pergunta.',
    sql_generation: 'Não foi possível gerar a consulta SQL. Tente ser mais específico.',
    query_execution: 'Erro ao executar a consulta. Verifique os dados solicitados.',
    session_creation: 'Erro ao criar nova conversa. Tente novamente.',
    message_send: 'Erro ao enviar mensagem. Tente novamente.',
  }
}

/**
 * Sanitiza erros e retorna mensagem amigável para o usuário
 */
export function sanitizeError(error: unknown, context?: string): ErrorInfo {
  let userMessage = 'Algo deu errado. Tente novamente.'
  let logMessage = 'Unknown error'
  let type: ErrorInfo['type'] = 'unknown'

  if (error instanceof Error) {
    logMessage = error.message
    
    // Erros de rede
    if (error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('NetworkError')) {
      type = 'network'
      userMessage = ERROR_MESSAGES.network.default
    }
    
    // Erros de timeout
    else if (error.message.includes('timeout') || 
             error.message.includes('aborted')) {
      type = 'network'
      userMessage = ERROR_MESSAGES.network.timeout
    }
    
    // Erros de autenticação
    else if (error.message.includes('401') || 
             error.message.includes('Token inválido') ||
             error.message.includes('unauthorized')) {
      type = 'auth'
      userMessage = ERROR_MESSAGES.auth.default
    }
    
    // Erros de permissão
    else if (error.message.includes('403') || 
             error.message.includes('forbidden')) {
      type = 'auth'
      userMessage = ERROR_MESSAGES.auth.forbidden
    }
    
    // Erros de validação
    else if (error.message.includes('validation') || 
             error.message.includes('invalid') ||
             error.message.includes('required')) {
      type = 'validation'
      userMessage = ERROR_MESSAGES.validation.default
    }
    
    // Erros do servidor
    else if (error.message.includes('500') || 
             error.message.includes('Internal Server Error') ||
             error.message.includes('server error')) {
      type = 'server'
      userMessage = ERROR_MESSAGES.server.default
    }
    
    // Erros específicos do contexto
    else if (context) {
      switch (context) {
        case 'chat':
          userMessage = ERROR_MESSAGES.chat.default
          break
        case 'sql_generation':
          userMessage = ERROR_MESSAGES.chat.sql_generation
          break
        case 'query_execution':
          userMessage = ERROR_MESSAGES.chat.query_execution
          break
        case 'session_creation':
          userMessage = ERROR_MESSAGES.chat.session_creation
          break
        case 'message_send':
          userMessage = ERROR_MESSAGES.chat.message_send
          break
        default:
          userMessage = ERROR_MESSAGES.server.default
      }
      type = 'server'
    }
  }
  
  // Se for string, tratar como erro genérico
  else if (typeof error === 'string') {
    logMessage = error
    userMessage = ERROR_MESSAGES.server.default
    type = 'server'
  }

  return {
    userMessage,
    logMessage,
    type
  }
}

/**
 * Verifica se um erro é crítico (deve ser logado)
 */
export function isCriticalError(error: unknown): boolean {
  if (error instanceof Error) {
    // Erros de autenticação não são críticos (são esperados)
    if (error.message.includes('401') || 
        error.message.includes('403') ||
        error.message.includes('Token inválido')) {
      return false
    }
    
    // Erros de validação não são críticos
    if (error.message.includes('validation') || 
        error.message.includes('required')) {
      return false
    }
  }
  
  return true
}

/**
 * Loga erro de forma segura (sem expor dados sensíveis)
 */
export function logError(error: unknown, context?: string, additionalInfo?: Record<string, any>) {
  const errorInfo = sanitizeError(error, context)
  
  if (isCriticalError(error)) {
    console.error(`[${errorInfo.type.toUpperCase()}] ${context || 'Unknown context'}:`, {
      message: errorInfo.logMessage,
      type: errorInfo.type,
      context,
      timestamp: new Date().toISOString(),
      ...additionalInfo
    })
  }
}

/**
 * Hook para tratamento de erros em componentes
 */
export function useErrorHandler() {
  const handleError = (error: unknown, context?: string) => {
    const errorInfo = sanitizeError(error, context)
    logError(error, context)
    return errorInfo.userMessage
  }

  return { handleError }
}
