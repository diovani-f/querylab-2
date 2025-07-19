"use client"

import { useMemo } from "react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"

import { QueryResult } from "@/types"

interface PieChartComponentProps {
  queryResult: QueryResult
}

export function PieChartComponent({ queryResult }: PieChartComponentProps) {
  const chartData = useMemo(() => {
    const { columns, rows } = queryResult

    if (rows.length === 0 || columns.length < 2) {
      return []
    }

    // Encontrar a primeira coluna categórica (string) e a primeira coluna numérica
    let categoryColumnIndex = -1
    let valueColumnIndex = -1

    columns.forEach((column, index) => {
      const sampleValue = rows[0]?.[index]
      
      if (categoryColumnIndex === -1 && typeof sampleValue === 'string' && isNaN(Number(sampleValue))) {
        categoryColumnIndex = index
      } else if (valueColumnIndex === -1 && (typeof sampleValue === 'number' || !isNaN(Number(sampleValue)))) {
        valueColumnIndex = index
      }
    })

    if (categoryColumnIndex === -1 || valueColumnIndex === -1) {
      return []
    }

    // Converter dados para formato do gráfico
    const data = rows.map(row => {
      const value = row[valueColumnIndex]
      const numericValue = typeof value === 'number' ? value : Number(value)
      
      return {
        name: String(row[categoryColumnIndex]),
        value: isNaN(numericValue) ? 0 : numericValue
      }
    }).filter(item => item.value > 0) // Remover valores zero ou negativos

    // Limitar a 10 itens e agrupar o resto em "Outros"
    if (data.length > 10) {
      const topItems = data.slice(0, 9)
      const othersValue = data.slice(9).reduce((sum, item) => sum + item.value, 0)
      
      if (othersValue > 0) {
        topItems.push({ name: "Outros", value: othersValue })
      }
      
      return topItems
    }

    return data
  }, [queryResult])

  // Cores para o gráfico de pizza
  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#00ff00",
    "#ff00ff",
    "#00ffff",
    "#ffff00",
    "#ff8042",
    "#8dd1e1"
  ]

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null // Não mostrar label para fatias muito pequenas

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Dados insuficientes para gerar gráfico de pizza</p>
      </div>
    )
  }

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => [
              typeof value === 'number' ? value.toLocaleString('pt-BR') : value,
              'Valor'
            ]}
          />
          <Legend 
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => (
              <span style={{ color: entry.color }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
