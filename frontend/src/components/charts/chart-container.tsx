"use client"

import { useState } from "react"
import { BarChart3, PieChart, TrendingUp, Table as TableIcon } from "lucide-react"

import { Button } from "src/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"
import { QueryResult } from "@/types"
import { BarChartComponent } from "./bar-chart"
import { PieChartComponent } from "./pie-chart"
import { LineChartComponent } from "./line-chart"
import { QueryResultsTable } from "../chat/query-results-table"

interface ChartContainerProps {
  queryResult: QueryResult
  title?: string
}

type ChartType = 'table' | 'bar' | 'pie' | 'line'

export function ChartContainer({ queryResult, title }: ChartContainerProps) {
  const [chartType, setChartType] = useState<ChartType>('table')

  // Analisar dados para determinar quais tipos de gráfico são apropriados
  const analyzeData = () => {
    const { columns, rows } = queryResult

    if (rows.length === 0) {
      return { canShowBar: false, canShowPie: false, canShowLine: false }
    }

    // Verificar se há pelo menos uma coluna numérica
    const hasNumericData = rows.some(row =>
      row.some(cell => typeof cell === 'number' || !isNaN(Number(cell)))
    )

    // Verificar se há dados categóricos (strings)
    const hasCategoricalData = rows.some(row =>
      row.some(cell => typeof cell === 'string' && isNaN(Number(cell)))
    )

    return {
      canShowBar: hasNumericData && hasCategoricalData,
      canShowPie: hasNumericData && hasCategoricalData && rows.length <= 20,
      canShowLine: hasNumericData && columns.length >= 2
    }
  }

  const { canShowBar, canShowPie, canShowLine } = analyzeData()

  const getChartIcon = (type: ChartType) => {
    switch (type) {
      case 'bar':
        return <BarChart3 className="h-4 w-4" />
      case 'pie':
        return <PieChart className="h-4 w-4" />
      case 'line':
        return <TrendingUp className="h-4 w-4" />
      case 'table':
      default:
        return <TableIcon className="h-4 w-4" />
    }
  }

  const getChartLabel = (type: ChartType) => {
    switch (type) {
      case 'bar':
        return 'Gráfico de Barras'
      case 'pie':
        return 'Gráfico de Pizza'
      case 'line':
        return 'Gráfico de Linha'
      case 'table':
      default:
        return 'Tabela'
    }
  }

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return canShowBar ? <BarChartComponent queryResult={queryResult} /> : null
      case 'pie':
        return canShowPie ? <PieChartComponent queryResult={queryResult} /> : null
      case 'line':
        return canShowLine ? <LineChartComponent queryResult={queryResult} /> : null
      case 'table':
      default:
        return <QueryResultsTable queryResult={queryResult} />
    }
  }

  return (
    <div className="space-y-2">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {queryResult.rowCount} registro(s) • Executado em {queryResult.executionTime}ms
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {getChartIcon(chartType)}
              <span className="ml-2">Visualização</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Escolha o tipo de visualização</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setChartType('table')}
              className={chartType === 'table' ? 'bg-accent' : ''}
            >
              <TableIcon className="mr-2 h-4 w-4" />
              Tabela Completa
            </DropdownMenuItem>

            {canShowBar && (
              <DropdownMenuItem
                onClick={() => setChartType('bar')}
                className={chartType === 'bar' ? 'bg-accent' : ''}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Gráfico de Barras
              </DropdownMenuItem>
            )}

            {canShowPie && (
              <DropdownMenuItem
                onClick={() => setChartType('pie')}
                className={chartType === 'pie' ? 'bg-accent' : ''}
              >
                <PieChart className="mr-2 h-4 w-4" />
                Gráfico de Pizza
              </DropdownMenuItem>
            )}

            {canShowLine && (
              <DropdownMenuItem
                onClick={() => setChartType('line')}
                className={chartType === 'line' ? 'bg-accent' : ''}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Gráfico de Linha
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Conteúdo do gráfico */}
      {renderChart()}
    </div>
  )
}
