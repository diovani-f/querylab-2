"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/ui/data-table"
import { QueryResult } from "@/types"

interface QueryResultsTableProps {
  queryResult: QueryResult
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void
}

// Função para formatar valores de células
function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return "-"
  }
  
  if (typeof value === "number") {
    // Formatar números com separadores de milhares
    return new Intl.NumberFormat('pt-BR').format(value)
  }
  
  if (typeof value === "string") {
    // Verificar se é uma data
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    if (dateRegex.test(value)) {
      try {
        const date = new Date(value)
        return new Intl.DateTimeFormat('pt-BR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).format(date)
      } catch {
        return value
      }
    }
    
    // Verificar se é apenas uma data (YYYY-MM-DD)
    const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (simpleDateRegex.test(value)) {
      try {
        const date = new Date(value + 'T00:00:00')
        return new Intl.DateTimeFormat('pt-BR').format(date)
      } catch {
        return value
      }
    }
  }
  
  return String(value)
}

export function QueryResultsTable({ queryResult, onExport }: QueryResultsTableProps) {
  const { columns: columnNames, rows, rowCount, executionTime } = queryResult

  // Converter dados para formato de tabela
  const data = useMemo(() => {
    return rows.map((row, index) => {
      const rowData: Record<string, any> = { _index: index + 1 }
      columnNames.forEach((columnName, colIndex) => {
        rowData[columnName] = row[colIndex]
      })
      return rowData
    })
  }, [rows, columnNames])

  // Definir colunas da tabela
  const columns: ColumnDef<any>[] = useMemo(() => {
    const cols: ColumnDef<any>[] = [
      {
        accessorKey: "_index",
        header: "#",
        size: 60,
        cell: ({ row }) => (
          <div className="text-center text-muted-foreground">
            {row.getValue("_index")}
          </div>
        ),
      }
    ]

    columnNames.forEach((columnName) => {
      cols.push({
        accessorKey: columnName,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-medium"
            >
              {columnName}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const value = row.getValue(columnName)
          return (
            <div className="font-mono text-sm">
              {formatCellValue(value)}
            </div>
          )
        },
      })
    })

    // Adicionar coluna de ações se necessário
    cols.push({
      id: "actions",
      size: 50,
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  const rowData = Object.entries(row.original)
                    .filter(([key]) => key !== '_index')
                    .map(([key, value]) => `${key}: ${formatCellValue(value)}`)
                    .join('\n')
                  navigator.clipboard.writeText(rowData)
                }}
              >
                Copiar linha
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  console.log("Detalhes da linha:", row.original)
                }}
              >
                Ver detalhes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })

    return cols
  }, [columnNames])

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (onExport) {
      onExport(format)
    } else {
      // Implementação básica de exportação CSV
      if (format === 'csv') {
        const csvContent = [
          columnNames.join(','),
          ...rows.map(row => row.map(cell => 
            typeof cell === 'string' && cell.includes(',') 
              ? `"${cell}"` 
              : cell
          ).join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `query-results-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Informações da consulta */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>{rowCount} registro(s) encontrado(s)</span>
          <span>•</span>
          <span>Executado em {executionTime}ms</span>
        </div>
      </div>

      {/* Tabela de resultados */}
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Buscar nos resultados..."
        onExport={handleExport}
      />
    </div>
  )
}
