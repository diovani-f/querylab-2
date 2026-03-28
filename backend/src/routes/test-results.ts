import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

const router = Router();

// Função para listar os arquivos com os resultados
router.get('/files', async (req: Request, res: Response) => {
    try {
        const rootDir = path.join(__dirname, '../../..', 'test-results-csvs');

        // Criar o diretório caso ele não exista
        if (!fs.existsSync(rootDir)) {
            fs.mkdirSync(rootDir, { recursive: true });
        }

        const files = fs.readdirSync(rootDir);

        // Filtra para pegar apenas os que terminam em .csv
        const csvFiles = files.filter(f => f.endsWith('.csv'));

        res.json(csvFiles);
    } catch (error) {
        console.error('Erro ao listar arquivos CSV:', error);
        res.status(500).json({ error: 'Erro ao listar arquivos CSV' });
    }
});

// Função para ler o conteúdo de um arquivo em específico
router.get('/data/:filename', async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;

        // Proteção básica para impedir path traversal
        if (!filename.endsWith('.csv') || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
            return res.status(400).json({ error: 'Nome de arquivo inválido.' });
        }

        const filePath = path.join(__dirname, '../../..', 'test-results-csvs', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Arquivo não encontrado.' });
        }

        // Detectar o delimitador automaticamente lendo a primeira linha
        const firstLine = fs.readFileSync(filePath, 'utf-8').split('\n')[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        const records: any[] = [];
        const parser = fs
            .createReadStream(filePath)
            .pipe(parse({
                delimiter,
                columns: true, // Usa a primeira linha para chaves do obj
                skip_empty_lines: true,
                relax_quotes: true,
                relax_column_count: true
            }));

        for await (const record of parser) {
            records.push(record);
        }

        res.json(records);
    } catch (error) {
        console.error('Erro ao ler arquivo CSV:', error);
        res.status(500).json({ error: 'Erro ao analisar arquivo CSV' });
    }
});

export default router;
