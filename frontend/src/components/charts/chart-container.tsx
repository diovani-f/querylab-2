"use client"

import { useState } from "react"
import { BarChart3, PieChart, TrendingUp, Table as TableIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    <div className="space-y-4">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div>
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          <p className="text-sm text-muted-foreground">
            {queryResult.rowCount} registro(s) • {queryResult.executionTime}ms
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {getChartIcon(chartType)}
              <span className="ml-2">{getChartLabel(chartType)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Tipo de visualização</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => setChartType('table')}>
              <TableIcon className="mr-2 h-4 w-4" />
              Tabela
            </DropdownMenuItem>
            
            {canShowBar && (
              <DropdownMenuItem onClick={() => setChartType('bar')}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Gráfico de Barras
              </DropdownMenuItem>
            )}
            
            {canShowPie && (
              <DropdownMenuItem onClick={() => setChartType('pie')}>
                <PieChart className="mr-2 h-4 w-4" />
                Gráfico de Pizza
              </DropdownMenuItem>
            )}
            
            {canShowLine && (
              <DropdownMenuItem onClick={() => setChartType('line')}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Gráfico de Linha
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Conteúdo do gráfico */}
      <div className="border rounded-lg p-4 bg-background">
        {renderChart()}
      </div>
    </div>
  )
}
