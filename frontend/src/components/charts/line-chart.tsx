"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { QueryResult } from "@/types"

interface LineChartComponentProps {
  queryResult: QueryResult
}

export function LineChartComponent({ queryResult }: LineChartComponentProps) {
  const chartData = useMemo(() => {
    const { columns, rows } = queryResult

    if (!rows || !columns || rows.length === 0 || columns.length < 2) {
      return []
    }

    // Encontrar a primeira coluna (X-axis) e as colunas numéricas (Y-axis)
    const xAxisColumnIndex = 0
    const numericColumnIndices: number[] = []

    columns.forEach((column, index) => {
      if (index === 0) return // Pular a primeira coluna (será o eixo X)

      const sampleValue = rows[0]?.[index]
      if (typeof sampleValue === 'number' || !isNaN(Number(sampleValue))) {
        numericColumnIndices.push(index)
      }
    })

    if (numericColumnIndices.length === 0) {
      return []
    }

    // Converter dados para formato do gráfico
    return rows.map(row => {
      const dataPoint: any = {
        name: String(row[xAxisColumnIndex])
      }

      numericColumnIndices.forEach(index => {
        const value = row[index]
        const numericValue = typeof value === 'number' ? value : Number(value)
        dataPoint[columns[index]] = isNaN(numericValue) ? 0 : numericValue
      })

      return dataPoint
    }).slice(0, 50) // Limitar a 50 pontos para melhor performance
  }, [queryResult])

  const getNumericColumns = () => {
    const { columns, rows } = queryResult

    if (!rows || !columns || rows.length === 0) return []

    return columns.filter((column, index) => {
      if (index === 0) return false // Pular a primeira coluna

      const sampleValue = rows[0]?.[index]
      return typeof sampleValue === 'number' || !isNaN(Number(sampleValue))
    })
  }

  const numericColumns = getNumericColumns()

  // Cores para as linhas
  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#00ff00",
    "#ff00ff",
    "#00ffff",
    "#ffff00"
  ]

  // Verificar se os dados do eixo X são datas
  const isDateData = useMemo(() => {
    if (chartData.length === 0) return false

    const firstValue = chartData[0]?.name
    if (!firstValue) return false

    // Verificar padrões de data
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY
      /^\d{4}\/\d{2}\/\d{2}/, // YYYY/MM/DD
    ]

    return datePatterns.some(pattern => pattern.test(firstValue))
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Dados insuficientes para gerar gráfico de linha</p>
      </div>
    )
  }

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={isDateData ? -45 : 0}
            textAnchor={isDateData ? "end" : "middle"}
            height={isDateData ? 80 : 60}
            interval={chartData.length > 20 ? "preserveStartEnd" : 0}
          />
          <YAxis />
          <Tooltip
            formatter={(value: any, name: string) => [
              typeof value === 'number' ? value.toLocaleString('pt-BR') : value,
              name
            ]}
            labelFormatter={(label) => `${isDateData ? 'Data' : 'Categoria'}: ${label}`}
          />
          <Legend />

          {numericColumns.map((column, index) => (
            <Line
              key={column}
              type="monotone"
              dataKey={column}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={column}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
