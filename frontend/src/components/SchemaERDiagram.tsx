'use client'

import React, { useEffect, memo } from 'react'
import '@xyflow/react/dist/style.css'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
  MarkerType,
} from '@xyflow/react'
import { apiService } from '@/lib/api'
import { Loader2, AlertCircle } from 'lucide-react'

interface SchemaTable {
  name: string
  columns: string[]
}

const FK_RELATIONSHIPS: [string, string, string][] = [
  ['censo_ies_bruto', 'censo_curso_vagas_bruto', 'cod_ies'],
  ['censo_ies_bruto', 'dados_cpc', 'cod_ies'],
  ['censo_ies_bruto', 'igc_bruto', 'cod_ies'],
  ['censo_ies_bruto', 'fluxo_tda', 'cod_ies'],
  ['censo_cursos', 'censo_curso_vagas_bruto', 'cod_curso'],
  ['censo_cursos', 'dados_cpc', 'cod_curso'],
  ['municipios_ibge', 'censo_ies', 'cod_ibge'],
  ['municipios_ibge', 'idhms', 'cod_ibge'],
  ['municipios_ibge', 'pibs_per_capita', 'cod_ibge'],
  ['microregioes_ibge', 'municipios_ibge', 'cod_microregiao'],
  ['mesoregioes_ibge', 'microregioes_ibge', 'cod_mesoregiao'],
  ['uf_ibge', 'mesoregioes_ibge', 'uf_ibge'],
  ['regioes_ibge', 'uf_ibge', 'cod_regiao'],
]

interface ClusterDef {
  id: string
  label: string
  color: string
  match: (name: string) => boolean
}

const CLUSTERS: ClusterDef[] = [
  {
    id: 'censo',
    label: 'Ensino Superior (Censo)',
    color: '#6366f1',
    match: (n) => n.startsWith('censo_'),
  },
  {
    id: 'avaliacoes',
    label: 'Avaliações — ENADE / CPC / IGC',
    color: '#0ea5e9',
    match: (n) =>
      n.startsWith('dados_') ||
      n.startsWith('igc_') ||
      n.startsWith('microdados_') ||
      n.startsWith('ind_'),
  },
  {
    id: 'capes',
    label: 'Pós-Graduação (CAPES)',
    color: '#8b5cf6',
    match: (n) => n.startsWith('capes_'),
  },
  {
    id: 'geografico',
    label: 'Geográfico — IBGE / Municípios',
    color: '#10b981',
    match: (n) =>
      ['municipios_', 'microregioes_', 'mesoregioes_', 'uf_', 'regioes_', 'idhm', 'pibs_', 'ibge_', 'variaveis_pib_'].some(
        (p) => n.startsWith(p),
      ),
  },
  {
    id: 'outros',
    label: 'Outros',
    color: '#f59e0b',
    match: () => true,
  },
]

// Two-column cluster layout: left [censo, geo], right [avaliacoes, capes, outros]
const CLUSTER_COL: Record<string, number> = {
  censo: 0,
  geografico: 0,
  avaliacoes: 1,
  capes: 1,
  outros: 1,
}

const NODE_W = 260
const H_GAP = 36      // gap between table nodes horizontally
const V_GAP = 28      // gap between table rows
const COLS_PER_CLUSTER = 3
const COL_GAP = 120   // gap between the two cluster columns
const GROUP_GAP = 80  // extra vertical gap between clusters within the same column
const LABEL_H = 36    // height of the group label node

function tableNodeHeight(colCount: number) {
  return Math.min(44 + colCount * 22, 380)
}

// --- Custom nodes ---

const TableNode = memo(({ data }: NodeProps) => {
  const { name, columns, color } = data as { name: string; columns: string[]; color: string }

  return (
    <div
      className="rounded-xl overflow-hidden shadow-md bg-white dark:bg-gray-900"
      style={{ width: NODE_W, border: `2px solid ${color}` }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <Handle type="source" position={Position.Right} style={{ background: color }} />

      <div
        className="px-3 py-2 flex items-center justify-between gap-2"
        style={{ background: color }}
      >
        <span className="text-white font-bold text-[11px] font-mono leading-tight truncate">{name}</span>
        <span className="text-white/70 text-[10px] shrink-0">{columns.length}</span>
      </div>

      <div className="overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800" style={{ maxHeight: 336 }}>
        {columns.map((col: string, i: number) => {
          const sep = col.lastIndexOf(':')
          const colName = sep !== -1 ? col.slice(0, sep) : col
          const colType = sep !== -1 ? col.slice(sep + 1) : ''
          const isNum = ['int', 'integer', 'bigint', 'smallint', 'decimal', 'numeric', 'float', 'double'].includes(
            colType.toLowerCase(),
          )
          return (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <span className="text-gray-700 dark:text-gray-300 text-[11px] font-mono flex-1 truncate">{colName}</span>
              {colType && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                    isNum
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  }`}
                >
                  {colType}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})
TableNode.displayName = 'TableNode'

const GroupLabelNode = memo(({ data }: NodeProps) => {
  const { label, color } = data as { label: string; color: string }
  return (
    <div
      className="px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-widest select-none pointer-events-none"
      style={{ color, border: `1.5px dashed ${color}`, background: `${color}12`, minWidth: 200 }}
    >
      {label}
    </div>
  )
})
GroupLabelNode.displayName = 'GroupLabelNode'

const nodeTypes = { table: TableNode, groupLabel: GroupLabelNode }

// --- Layout ---

function buildLayout(tables: SchemaTable[]): { nodes: Node[]; edges: Edge[] } {
  const assigned = new Set<string>()

  // Assign each table to a cluster
  const clusterTables: Record<string, SchemaTable[]> = {}
  for (const cluster of CLUSTERS) {
    let group: SchemaTable[]
    if (cluster.id === 'outros') {
      group = tables.filter((t) => !assigned.has(t.name))
    } else {
      group = tables.filter((t) => cluster.match(t.name))
      group.forEach((t) => assigned.add(t.name))
    }
    clusterTables[cluster.id] = group
  }

  // Calculate cluster width (same for both columns)
  const clusterWidth = COLS_PER_CLUSTER * NODE_W + (COLS_PER_CLUSTER - 1) * H_GAP

  // Track current Y per column
  const colY: Record<number, number> = { 0: 0, 1: 0 }

  const nodes: Node[] = []
  const nameSet = new Set(tables.map((t) => t.name))

  for (const cluster of CLUSTERS) {
    const group = clusterTables[cluster.id]
    if (group.length === 0) continue

    const col = CLUSTER_COL[cluster.id] ?? 0
    const baseX = col * (clusterWidth + COL_GAP)
    const startY = colY[col]

    // Group label node
    nodes.push({
      id: `label-${cluster.id}`,
      type: 'groupLabel',
      data: { label: cluster.label, color: cluster.color },
      position: { x: baseX, y: startY },
      draggable: false,
      selectable: false,
    })

    let y = startY + LABEL_H + 12
    const rows = Math.ceil(group.length / COLS_PER_CLUSTER)

    for (let row = 0; row < rows; row++) {
      let rowMaxH = 0

      for (let c = 0; c < COLS_PER_CLUSTER; c++) {
        const idx = row * COLS_PER_CLUSTER + c
        if (idx >= group.length) break

        const table = group[idx]
        const h = tableNodeHeight(table.columns.length)
        rowMaxH = Math.max(rowMaxH, h)

        nodes.push({
          id: table.name,
          type: 'table',
          data: { name: table.name, columns: table.columns, color: cluster.color },
          position: { x: baseX + c * (NODE_W + H_GAP), y },
        })
      }

      y += rowMaxH + V_GAP
    }

    colY[col] = y + GROUP_GAP
  }

  // FK edges
  const edges: Edge[] = FK_RELATIONSHIPS.filter(([from, to]) => nameSet.has(from) && nameSet.has(to)).map(
    ([from, to, label]) => ({
      id: `${from}→${to}`,
      source: from,
      target: to,
      label,
      labelStyle: { fontSize: 9, fontWeight: 700 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgStyle: { fill: 'rgba(255,255,255,0.9)', rx: 4 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      style: { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '5 3' },
    }),
  )

  return { nodes, edges }
}

// --- Main component ---

export function SchemaERDiagram() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  useEffect(() => {
    apiService
      .getSchema('inep')
      .then((data) => {
        const { nodes, edges } = buildLayout(data.tables)
        setNodes(nodes)
        setEdges(edges)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Carregando schema...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>Erro ao carregar schema: {error}</span>
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.03}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Controls showInteractive={false} />
      <MiniMap nodeColor={(n) => (n.data as { color?: string }).color ?? '#6366f1'} maskColor="rgba(0,0,0,0.06)" style={{ background: '#f8fafc' }} />
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
    </ReactFlow>
  )
}
