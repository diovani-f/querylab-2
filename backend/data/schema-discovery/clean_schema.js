const fs = require('fs');
const path = require('path');

const summaryPath = path.join(__dirname, 'inep-schema-summary.json');
const backupPath = path.join(__dirname, 'inep-schema-summary.backup.json');

const tablesToRemove = [
    'censo_cursos_bkp',
    'dados_cpc_bkp',
    'ind_fluxo_ies_bkp',
    'cesta_dimensoes',
    'cesta_indicadores',
    'cesta_indicadores_visualizacoes',
    'cesta_visualizacao_indicadores',
    'matriculas_municipio',
    'emec_instituicoes',
    'enade_dic_aux',
    'enade_dic_aux_tmp',
    'dados_cpc_brutos',
    'igc_bruto',
    'ind_fluxo_ies_tda',
    'microdados_enade_questoes',
    'microdados_enade_respostas'
];

try {
    const fileContent = fs.readFileSync(summaryPath, 'utf8');
    fs.writeFileSync(backupPath, fileContent); // Create backup

    let summary = JSON.parse(fileContent);

    const initialCount = summary.tables.length;
    summary.tables = summary.tables.filter(t => !tablesToRemove.includes(t.name));

    summary.totalTables = summary.tables.length;
    summary.processedTables = summary.tables.length;

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`Sucesso: Removidas ${initialCount - summary.tables.length} tabelas.`);
    console.log(`O schema summary agora possui: ${summary.tables.length} tabelas.`);
    console.log(`Backup salvo em: inep-schema-summary.backup.json`);
} catch (e) {
    console.error("Erro ao limpar:", e);
}
