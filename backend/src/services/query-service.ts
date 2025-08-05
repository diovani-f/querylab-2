import { QueryResult } from '../types'

/**
 * Serviço responsável por simular a execução de consultas SQL
 * Centraliza a lógica que estava duplicada entre WebSocket handlers e REST routes
 */
export class QueryService {
  private static instance: QueryService

  public static getInstance(): QueryService {
    if (!QueryService.instance) {
      QueryService.instance = new QueryService()
    }
    return QueryService.instance
  }

  /**
   * Simula a execução de uma consulta SQL e retorna resultados mockados
   */
  async executeQuery(sql: string): Promise<QueryResult> {
    const executionTime = Math.floor(Math.random() * 200) + 50 // 50-250ms
    await new Promise(resolve => setTimeout(resolve, executionTime))

    // Analisar o SQL para gerar dados mais apropriados
    const sqlLower = sql.toLowerCase()

    // Se for COUNT, retornar número
    if (sqlLower.includes('count(')) {
      const count = Math.floor(Math.random() * 50) + 1
      return {
        columns: ['total'],
        rows: [[count]],
        rowCount: 1,
        executionTime
      }
    }

    // Se for sobre universidades federais
    if (sqlLower.includes('federal')) {
      return {
        columns: ['id', 'nome', 'tipo', 'regiao'],
        rows: [
          [1, 'Universidade Federal do Rio de Janeiro', 'Federal', 'Sudeste'],
          [3, 'Universidade Federal de Minas Gerais', 'Federal', 'Sudeste'],
          [4, 'Universidade Federal do Rio Grande do Sul', 'Federal', 'Sul'],
          [5, 'Universidade de Brasília', 'Federal', 'Centro-Oeste'],
          [6, 'Universidade Federal da Bahia', 'Federal', 'Nordeste']
        ],
        rowCount: 5,
        executionTime
      }
    }

    // Se for sobre cursos
    if (sqlLower.includes('curso')) {
      return {
        columns: ['id', 'nome', 'tipo', 'duracao'],
        rows: [
          [1, 'Ciência da Computação', 'Bacharelado', '4 anos'],
          [2, 'Engenharia Civil', 'Bacharelado', '5 anos'],
          [3, 'Medicina', 'Bacharelado', '6 anos'],
          [4, 'Direito', 'Bacharelado', '5 anos']
        ],
        rowCount: 4,
        executionTime
      }
    }

    // Se for sobre professores
    if (sqlLower.includes('professor')) {
      return {
        columns: ['id', 'nome', 'departamento', 'titulacao'],
        rows: [
          [1, 'Dr. João Silva', 'Computação', 'Doutor'],
          [2, 'Dra. Maria Santos', 'Matemática', 'Doutora'],
          [3, 'Dr. Pedro Costa', 'Física', 'Doutor']
        ],
        rowCount: 3,
        executionTime
      }
    }

    // Dados padrão para outras consultas
    return {
      columns: ['id', 'nome', 'tipo', 'regiao'],
      rows: [
        [1, 'Universidade Federal do Rio de Janeiro', 'Federal', 'Sudeste'],
        [2, 'Universidade de São Paulo', 'Estadual', 'Sudeste'],
        [3, 'Universidade Federal de Minas Gerais', 'Federal', 'Sudeste']
      ],
      rowCount: 3,
      executionTime
    }
  }

  /**
   * Cria uma mensagem de resposta formatada baseada no resultado da query
   */
  createResponseMessage(): string {
    return `Consulta processada com sucesso!`
  }
}
