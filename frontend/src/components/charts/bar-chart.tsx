"use client"

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { QueryResult } from "@/types"

interface BarChartComponentProps {
  queryResult: QueryResult
}

export function BarChartComponent({ queryResult }: BarChartComponentProps) {
  const chartData = useMemo(() => {
    const { columns, rows } = queryResult

    if (!rows || !columns || rows.length === 0 || columns.length < 2) {
      return []
    }

    // Encontrar a primeira coluna categórica (string) e as colunas numéricas
    let categoryColumnIndex = -1
    const numericColumnIndices: number[] = []

    columns.forEach((column, index) => {
      const sampleValue = rows[0]?.[index]

      if (categoryColumnIndex === -1 && typeof sampleValue === 'string' && isNaN(Number(sampleValue))) {
        categoryColumnIndex = index
      } else if (typeof sampleValue === 'number' || !isNaN(Number(sampleValue))) {
        numericColumnIndices.push(index)
      }
    })

    if (categoryColumnIndex === -1 || numericColumnIndices.length === 0) {
      return []
    }

    // Converter dados para formato do gráfico
    return rows.map(row => {
      const dataPoint: any = {
        name: String(row[categoryColumnIndex])
      }

      numericColumnIndices.forEach(index => {
        const value = row[index]
        const numericValue = typeof value === 'number' ? value : Number(value)
        dataPoint[columns[index]] = isNaN(numericValue) ? 0 : numericValue
      })

      return dataPoint
    }).slice(0, 20) // Limitar a 20 itens para melhor visualização
  }, [queryResult])

  const getNumericColumns = () => {
    const { columns, rows } = queryResult

    if (!rows || !columns || rows.length === 0) return []

    return columns.filter((column, index) => {
      const sampleValue = rows[0]?.[index]
      return typeof sampleValue === 'number' || !isNaN(Number(sampleValue))
    })
  }

  const numericColumns = getNumericColumns()

  // Cores para as barras
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

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Dados insuficientes para gerar gráfico de barras</p>
      </div>
    )
  }

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
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
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis />
          <Tooltip
            formatter={(value: any, name: string) => [
              typeof value === 'number' ? value.toLocaleString('pt-BR') : value,
              name
            ]}
            labelFormatter={(label) => `Categoria: ${label}`}
          />
          <Legend />

          {numericColumns.map((column, index) => (
            <Bar
              key={column}
              dataKey={column}
              fill={colors[index % colors.length]}
              name={column}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
