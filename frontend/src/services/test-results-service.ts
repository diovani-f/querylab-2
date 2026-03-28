import { apiService as api } from '@/lib/api'

export interface TestResultRecord {
    Pergunta: string
    Provider: string
    'Prompt Enviado': string
    'SQL Gerado': string
    'Status Execucao': string
    Erro: string
}

class TestResultsService {
    async listFiles(): Promise<string[]> {
        try {
            const response = await api.get('/test-results/files')
            return response
        } catch (error) {
            console.error('Erro ao listar arquivos de teste:', error)
            throw error
        }
    }

    async getFileData(filename: string): Promise<TestResultRecord[]> {
        try {
            const response = await api.get(`/test-results/data/${encodeURIComponent(filename)}`)
            return response
        } catch (error) {
            console.error('Erro ao ler dados do arquivo de teste:', error)
            throw error
        }
    }
}

export const testResultsService = new TestResultsService()
