import { TestResultsView } from "@/components/test-results/test-results-view"

export default function TestResultsPage() {
    return (
        <div className="container mx-auto py-6 min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Resultados de Testes</h1>
                <p className="text-muted-foreground">
                    Visualização de métricas e análises das execuções automáticas de SQL.
                </p>
            </div>

            <TestResultsView />
        </div>
    )
}
