'use client'

import { EvaluationSummaryComponent } from '@/components/evaluation/evaluation-summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function EvaluationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Chat
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center space-x-2">
                <BarChart3 className="h-6 w-6" />
                <span>Avaliações LLM</span>
              </h1>
              <p className="text-muted-foreground">
                Análise de qualidade das respostas geradas pela IA
              </p>
            </div>
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Resumo Geral</h2>
          <EvaluationSummaryComponent />
        </div>

        {/* Informações sobre o Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona o Sistema de Avaliação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Critérios de Avaliação</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Correção do SQL:</strong> Sintaxe e execução sem erros</li>
                  <li>• <strong>Precisão da Consulta:</strong> Retorna os dados solicitados</li>
                  <li>• <strong>Performance:</strong> Eficiência e otimização</li>
                  <li>• <strong>Completude:</strong> Atende completamente à pergunta</li>
                  <li>• <strong>Clareza:</strong> Legibilidade e estrutura do código</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Sistema de Pontuação</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>8-10:</strong> Excelente - Aprovado automaticamente</li>
                  <li>• <strong>6-7.9:</strong> Bom - Correto mas pode melhorar</li>
                  <li>• <strong>5-5.9:</strong> Regular - Precisa revisão</li>
                  <li>• <strong>0-4.9:</strong> Ruim - Incorreto ou inadequado</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Como Avaliar</h3>
              <p className="text-sm text-muted-foreground">
                Para cada resposta da IA que gera SQL, você pode clicar em &quot;Avaliar&quot; para
                analisar a qualidade da resposta baseada nos critérios estabelecidos. 
                Suas avaliações ajudam a melhorar continuamente o sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
