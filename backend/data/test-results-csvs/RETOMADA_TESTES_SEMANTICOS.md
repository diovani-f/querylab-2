# Ponto de Retomada — Testes Semânticos (branch `test/sintactic-only`)

**Data de interrupção:** 2026-05-30  
**Motivo da interrupção:** Limite de cota das APIs de IA atingido (Gemini free tier diário e Groq tokens/dia).

---

## Estado atual

Os testes semânticos cobrem **30 perguntas** (P1–P30) em 4 níveis de dificuldade:
- **fácil:** P1–P7 (7 perguntas)
- **médio:** P8–P15 (8 perguntas)
- **difícil:** P16–P23 (8 perguntas)
- **ambíguo:** P24–P30 (7 perguntas)

### Progresso

| Faixa | Status |
|-------|--------|
| P1–P12 | Concluído (resultados salvos) |
| P13–P30 | **Pendente** |

Os resultados de P1–P12 foram mesclados no arquivo:  
`semantic_test_results_merged_P1-P12_2026-05-30.json`

---

## Onde parou

A execução parou em **P12** (segunda rodada de testes, arquivo `semantic_test_results_2026-05-30_21-44-15.json`):

- **Gemini** atingiu o limite gratuito diário a partir de P11.
- **Groq** atingiu o limite diário de tokens (100k) em P12 — aguardava reset em ~1h45min.
- **Cloudflare** (sqlcoder-7b-2) retornou SQL vazio para P9, P11 e P12.

---

## Para retomar

1. Fazer checkout nesta branch: `git checkout test/sintactic-only`
2. Aguardar reset dos limites de API (Gemini e Groq resetam à meia-noite UTC).
3. Editar o arquivo de perguntas ou o script de testes para iniciar a partir de **P13**.
4. Executar os testes para P13–P30 e salvar o resultado com timestamp novo.
5. Mesclar o novo arquivo com `semantic_test_results_merged_P1-P12_2026-05-30.json`.

---

## Resultados parciais (P1–P12)

| Provider | Corretos | Parciais | Incorretos | Erros IA | Avg DataMatchScore |
|----------|----------|----------|------------|----------|--------------------|
| Gemini   | 1        | 1        | 6          | 4        | 14.2               |
| Groq     | 1        | 1        | 5          | 5        | 14.2               |

### Por dificuldade

| Provider | Dificuldade | Total | Corretos | Avg Score |
|----------|-------------|-------|----------|-----------|
| Gemini   | fácil       | 7     | 0        | 10.0      |
| Gemini   | médio       | 5     | 1        | 20.0      |
| Groq     | fácil       | 7     | 0        | 10.0      |
| Groq     | médio       | 5     | 1        | 20.0      |

---

## Arquivos relevantes

- Script de testes: `backend/scripts/run-semantic-tests.ts` (buscar da branch `main` se não existir: `git checkout main -- backend/scripts/run-semantic-tests.ts`)
- Perguntas: `backend/scripts/perguntas_text_to_sql.json`
- Resultados P1–P12: `backend/data/test-results-csvs/semantic_test_results_merged_P1-P12_2026-05-30.json`
- Resultados brutos: `semantic_test_results_2026-05-30_21-22-26.json` e `semantic_test_results_2026-05-30_21-44-15.json`
