import { Building2, GraduationCap, Users, Star, Map, LucideIcon, TrendingUp, Briefcase, Award, MessageSquare } from "lucide-react";

export interface DictionaryCategory {
    id: string;
    icon: LucideIcon;
    title: string;
    description: string;
    items: string[];
    exampleQuestion: string;
}

export const businessDictionary: DictionaryCategory[] = [
    {
        id: "instituicoes",
        icon: Building2,
        title: "Instituições de Ensino (IES)",
        description: "Dados cadastrais e informações gerais de universidades, faculdades e institutos.",
        items: [
            "Nome e Sigla da Instituição",
            "Rede de Ensino (Pública, Privada, Confessional, Comunitária)",
            "Tipo de Organização (Universidade, Centro Universitário, Faculdade)",
            "Endereço e Localização"
        ],
        exampleQuestion: "Liste o nome e a sigla das instituições cuja categoria administrativa é Pública Federal."
    },
    {
        id: "cursos",
        icon: GraduationCap,
        title: "Cursos de Graduação e Pós",
        description: "Informações sobre modalidades e vagas ofertadas nos cursos.",
        items: [
            "Turno do Curso (Matutino, Vespertino, Noturno, Integral)",
            "Modalidade de Ensino (Presencial, EAD)",
            "Vagas Ofertadas e Preenchidas",
            "Tempo de Integralização (Anos definidos para formar)"
        ],
        exampleQuestion: "Liste o nome dos cursos e a sigla da instituição para os cursos com modalidade EAD."
    },
    {
        id: "alunos_financiamento",
        icon: Users,
        title: "Perfil dos Alunos & Financiamento",
        description: "Contagem de alunos por etapa, demografia, bolsas e cotas.",
        items: [
            "Situação (Ingressantes, Matriculados, Concluintes, Desistentes)",
            "Perfil (Sexo, Idade, Cor/Raça, Deficiência)",
            "Bolsas (FIES, ProUni Integral e Parcial)",
            "Cotas (Escola Pública, Étnico-racial, Baixa Renda)"
        ],
        exampleQuestion: "Qual o total de matriculados com FIES por categoria administrativa em 2022?"
    },
    {
        id: "fluxo_sucesso",
        icon: TrendingUp,
        title: "Trajetória e Taxas de Sucesso",
        description: "Um raio-x de como os alunos progridem durante o curso ao longo dos anos.",
        items: [
            "Taxa de Permanência (Alunos que continuam no curso)",
            "Taxa de Conclusão Acumulada (Formados no tempo ideal)",
            "Taxa de Desistência e Evasão Anual",
            "Prazo de Integralização vs. Prazo Máximo de Acompanhamento"
        ],
        exampleQuestion: "Liste o nome do curso, a sigla da IES e a taxa de desistência dos cursos com maior evasão."
    },
    {
        id: "corpo_docente",
        icon: Briefcase,
        title: "Corpo Docente (Professores)",
        description: "Estatísticas sobre os professores que atuam no ensino superior.",
        items: [
            "Titulação Acadêmica (Especialistas, Mestres, Doutores)",
            "Regime de Trabalho (Tempo Parcial, Dedicação Exclusiva, Horista)",
            "Perfil Demográfico (Idade, Sexo, Cor/Raça)",
            "Professores Em Exercício vs. Afastados"
        ],
        exampleQuestion: "Liste a sigla e o total de docentes doutores das instituições da região Sul."
    },
    {
        id: "pos_graduacao",
        icon: Award,
        title: "Pós-Graduação Stricto Sensu (CAPES)",
        description: "Visão aprofundada dos mestrados e doutorados avaliados pela CAPES.",
        items: [
            "Programas de Mestrado e Doutorado",
            "Áreas e Subáreas de Conhecimento (CAPES)",
            "Conceito/Nota da CAPES para o Programa",
            "Bolsistas e Redes de Pesquisa"
        ],
        exampleQuestion: "Liste os programas de pós-graduação e seus conceitos na área de Ciência da Computação."
    },
    {
        id: "qualidade_notas",
        icon: Star,
        title: "Qualidade de Graduação (INEP)",
        description: "Indicadores oficiais de qualidade dos cursos criados pelo INEP.",
        items: [
            "Notas do ENADE (Nota Contínua e Faixa de 1 a 5)",
            "CPC (Conceito Preliminar de Cursos de 1 a 5)",
            "IGC (Índice Geral de Cursos da Instituição de 1 a 5)"
        ],
        exampleQuestion: "Liste o nome do curso, a sigla da IES e a nota contínua do CPC dos cursos com CPC faixa 5."
    },
    {
        id: "percepcao_infraestrutura",
        icon: MessageSquare,
        title: "Opinião do Aluno & Infraestrutura",
        description: "Respostas do questionário do ENADE sobre infraestrutura e didática.",
        items: [
            "Opinião sobre a Didática dos Professores",
            "Opinião sobre Salas de Aula e Laboratórios",
            "Infraestrutura da Instituição (Acesso a bases CAPES, Internet)",
            "Avaliação das Estruturas de Biblioteca"
        ],
        exampleQuestion: "Liste as questões do questionário do ENADE e suas descrições agrupadas por grupo."
    },
    {
        id: "socioeconomia",
        icon: Map,
        title: "Geografia e Socioeconomia (IBGE)",
        description: "Indicadores geográficos e sócioeconômicos das cidades e estados.",
        items: [
            "Divisão regional (Estados, Mesorregiões, Municípios, IBGE)",
            "PIB per capita Municipal",
            "IDHM (Índice de Desenvolvimento Humano)",
            "População Total Municipal Estimada"
        ],
        exampleQuestion: "Liste o nome das IES, o município e o IDHM das instituições localizadas em cidades com IDHM acima de 0.8."
    }
];
