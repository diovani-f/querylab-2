"use client"

import { useState, useEffect, useMemo } from "react"
import { testResultsService, TestResultRecord } from "@/services/test-results-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

function ExpandableText({ text }: { text: string }) {
    const [expanded, setExpanded] = useState(false)
    if (!text) return <span>-</span>

    // Limits the text to ~150 caracteres if not expanded
    const isLong = text.length > 150
    const displayText = expanded ? text : (isLong ? text.substring(0, 150) + '...' : text)

    return (
        <div className="flex flex-col gap-1 w-full max-w-[300px]">
            <pre className="text-xs break-words whitespace-pre-wrap bg-muted p-2 rounded-md max-h-[250px] overflow-y-auto">
                {displayText}
            </pre>
            {isLong && (
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs text-blue-500 hover:underline self-start"
                >
                    {expanded ? 'Mostrar menos' : 'Mostrar mais'}
                </button>
            )}
        </div>
    )
}

export function TestResultsView() {
    const [files, setFiles] = useState<string[]>([])
    const [selectedFile, setSelectedFile] = useState<string>("")
    const [data, setData] = useState<TestResultRecord[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadFiles() {
            try {
                const fileList = await testResultsService.listFiles()
                setFiles(fileList)
                if (fileList.length > 0) {
                    setSelectedFile(fileList[0])
                }
            } catch (error) {
                console.error("Erro ao carregar arquivos:", error)
            } finally {
                setLoading(false)
            }
        }
        loadFiles()
    }, [])

    useEffect(() => {
        if (!selectedFile) return
        let mounted = true
        async function loadData() {
            setLoading(true)
            if (mounted) setData([])
            try {
                const records = await testResultsService.getFileData(selectedFile)
                if (mounted) setData(records)
            } catch (error) {
                console.error("Erro ao carregar dados do arquivo:", error)
            } finally {
                if (mounted) setLoading(false)
            }
        }
        loadData()
        return () => { mounted = false }
    }, [selectedFile])

    const chartData = useMemo(() => {
        let successCount = 0;
        let errorCount = 0;

        const providerStats: Record<string, { provider: string, success: number, error: number }> = {};
        const errorTypeStats: Record<string, { type: string, count: number }> = {};

        data.forEach(curr => {
            const isSuccess = curr['Status Execucao']?.toUpperCase() === 'SUCESSO';

            if (isSuccess) {
                successCount++;
            } else {
                errorCount++;

                // Tipificação dos erros
                let errorCat = 'Desconhecido';
                const errorMsg = (curr.Erro || '').toLowerCase();
                if (errorMsg) {
                    if (errorMsg.includes('sql vazio') || errorMsg.includes('prompt não retornado')) errorCat = 'SQL Vazio / Sem Retorno';
                    else if (errorMsg.includes('column') && errorMsg.includes('does not exist') || errorMsg.includes('coluna') && errorMsg.includes('não existe')) errorCat = 'Coluna Inexistente';
                    else if (errorMsg.includes('syntax error')) errorCat = 'Erro de Sintaxe';
                    else if (errorMsg.includes('operator does not exist')) errorCat = 'Erro de Tipo/Operador';
                    else if (errorMsg.includes('relation') && errorMsg.includes('does not exist') || errorMsg.includes('tabela') && errorMsg.includes('não existe')) errorCat = 'Tabela Inexistente';
                    else if (errorMsg.includes('timeout')) errorCat = 'Timeout';
                    else errorCat = 'Outros Erros';
                }

                if (!errorTypeStats[errorCat]) errorTypeStats[errorCat] = { type: errorCat, count: 0 };
                errorTypeStats[errorCat].count++;
            }

            const provider = curr.Provider || 'Desconhecido';
            if (!providerStats[provider]) providerStats[provider] = { provider, success: 0, error: 0 };

            if (isSuccess) {
                providerStats[provider].success++;
            } else {
                providerStats[provider].error++;
            }
        });

        return {
            overallStatus: [
                { name: 'Sucesso', value: successCount },
                { name: 'Erro', value: errorCount }
            ],
            providerStats: Object.values(providerStats),
            errorTypeStats: Object.values(errorTypeStats).sort((a, b) => b.count - a.count)
        }
    }, [data])

    if (loading && !data.length && !files.length) {
        return <p>Carregando dados...</p>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Selecione um arquivo de resultados</CardTitle>
                    <CardDescription>Visualizando agora métricas extraídas das planilhas de testes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <select
                        className="flex h-10 w-full max-w-sm items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedFile}
                        onChange={(e) => setSelectedFile(e.target.value)}
                        disabled={loading}
                    >
                        <option value="" disabled>Selecione um arquivo...</option>
                        {files.map(file => (
                            <option key={file} value={file}>{file}</option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            {data.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Taxa de Sucesso vs Erro (Geral)</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.overallStatus}
                                            cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                                            paddingAngle={5} dataKey="value"
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        >
                                            {chartData.overallStatus.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.name === 'Sucesso' ? '#22c55e' : '#ef4444'} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Comparações por Provedor</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.providerStats}>
                                        <XAxis dataKey="provider" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="success" name="Sucesso" fill="#22c55e" />
                                        <Bar dataKey="error" name="Erro" fill="#ef4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {chartData.errorTypeStats.length > 0 && (
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Análise de Tipos de Erro</CardTitle>
                                    <CardDescription>Distribuição dos problemas estruturais que causaram falhas.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData.errorTypeStats} layout="vertical" margin={{ left: 50 }}>
                                            <XAxis type="number" />
                                            <YAxis dataKey="type" type="category" width={150} tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Bar dataKey="count" name="Ocorrências" fill="#f59e0b" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Tabela de Detalhes</CardTitle>
                            <CardDescription>Acompanhamento detalhado das respostas e status das queries geradas.</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Pergunta</TableHead>
                                        <TableHead>Provider</TableHead>
                                        <TableHead className="w-[300px]">Prompt</TableHead>
                                        <TableHead className="w-[300px]">SQL Gerado</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Erro</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium align-top">
                                                <div className="truncate max-w-[200px]" title={row.Pergunta}>{row.Pergunta}</div>
                                            </TableCell>
                                            <TableCell className="align-top">{row.Provider}</TableCell>
                                            <TableCell className="align-top">
                                                <ExpandableText text={row['Prompt Enviado']} />
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <pre className="text-xs break-words whitespace-pre-wrap bg-muted p-2 rounded-md max-w-[300px] max-h-[150px] overflow-y-auto">
                                                    {row['SQL Gerado']}
                                                </pre>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Badge variant={row['Status Execucao']?.toUpperCase() === 'SUCESSO' ? 'default' : 'destructive'}>
                                                    {row['Status Execucao']}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="align-top text-red-500 text-sm max-w-[200px]">
                                                {row.Erro || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
