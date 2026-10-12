/**
 * Totum Flex - Dados padrão do site
 * Todos esses dados podem ser editados no Modo Administrador
 * e são persistidos no LocalStorage ou exportados como JSON.
 */
const DEFAULT_SITE_DATA = {
  theme: "dark",
  colorScheme: {
    primary: "#00f0ff",
    secondary: "#0077b6",
    preset: "cyan"
  },
  meta: {
    title: "Totum Flex | Flex Informática - Soluções Especializadas em TI e Gestão ERP",
    tagline: "Software sob medida para empresas prestadoras de serviços e operações complexas",
    city: "Belém - Pará",
    foundedYear: 2008
  },
  topBar: {
    announcement: "🚀 Nova versão TotumFlex 2026: Gestão Integrada com eSocial, NFS-e e Custeio Operacional.",
    phone: "(91) 99351-9240",
    phoneSecondary: "(91) 3343-4090",
    email: "contato@totumflex.com.br",
    whatsappLink: "https://api.whatsapp.com/send?phone=5591993519240&text=Ol%C3%A1!%20Estou%20no%20site%20da%20TotumFlex%20e%20gostaria%20de%20solicitar%20uma%20demonstra%C3%A7%C3%A3o."
  },
  navbar: {
    brandName: "TOTUM",
    brandHighlight: "FLEX",
    brandSubtitle: "Flex Informática",
    links: [
      { id: "nav-home", label: "Início", href: "#hero" },
      { id: "nav-systems", label: "Sistemas & Módulos", href: "#sistemas" },
      { id: "nav-diffs", label: "Diferenciais", href: "#diferenciais" },
      { id: "nav-workflow", label: "Soluções por Setor", href: "#solucoes" },
      { id: "nav-about", label: "Sobre Nós", href: "#empresa" },
      { id: "nav-contact", label: "Contato", href: "#contato" }
    ],
    ctaText: "Agendar Demonstração"
  },
  hero: {
    badge: "⚡ TECNOLOGIA B2B DE ALTA PERFORMANCE",
    titleMain: "Automatize a gestão da sua empresa com tecnologia feita para ",
    titleHighlight: "o seu negócio.",
    description: "Desde 2008 em Belém/PA, desenvolvemos softwares ERP especializados para empresas prestadoras de serviço, locação de mão de obra, custeio operacional e saneamento. Eficiência máxima, zero retrabalho.",
    primaryCta: "Solicitar Demonstração Gratuita",
    secondaryCta: "Explorar Nossos Sistemas",
    stats: [
      { id: "stat-years", value: "+16", label: "Anos no Mercado", detail: "Fundada em 2008" },
      { id: "stat-clients", value: "+250", label: "Empresas Atendidas", detail: "Em todo o Norte e Brasil" },
      { id: "stat-retention", value: "99.4%", label: "Satisfação e Retenção", detail: "Suporte dedicado" },
      { id: "stat-systems", value: "8+", label: "Módulos Integrados", detail: "Ecossistema Completo" }
    ]
  },
  systemsSection: {
    tag: "PORTFÓLIO DE SISTEMAS",
    title: "Soluções integradas sob medida para a sua operação",
    subtitle: "Chega de planilhas desconexas. Tenha controle financeiro, operacional, de pessoal e fiscal em uma única plataforma robusta.",
    categories: [
      { id: "all", label: "Todos os Sistemas" },
      { id: "rh", label: "RH & Pessoal" },
      { id: "operacoes", label: "Operações & Logística" },
      { id: "fiscal", label: "Fiscal & Financeiro" }
    ],
    items: [
      {
        id: "sys-propostas",
        category: "operacoes",
        badge: "VENDAS & CONTRATOS",
        icon: "📄",
        title: "Propostas para Locação de Mão de Obra",
        summary: "Geração ágil de propostas comerciais profissionais em PDF com cálculos exatos de encargos, postos e margens.",
        description: "Automatize o cálculo de planilhas de custos de mão de obra, encargos sociais, provisões de férias/13º e insumos. Emita propostas com padrão visual corporativo e histórico completo de revisões contratuais.",
        features: [
          "Cálculo automatizado de encargos e benefícios",
          "Exportação direta de propostas em PDF personalizadas",
          "Controle de versões e margens de contribuição",
          "Integração com contratos e faturamento"
        ],
        badgeColor: "cyan"
      },
      {
        id: "sys-custeio",
        category: "operacoes",
        badge: "GESTÃO INTEGRADA",
        icon: "⚓",
        title: "Custeio - Sistema de Gerenciamento ERP",
        summary: "Controle integrado de ponta a ponta: do PDA (Port Data Assistant) ao FDA e faturamento de serviços complexos.",
        description: "ERP especializado para operações portuárias, aduaneiras e de logística pesada. Centraliza informações de atracação, serviços prestados, despesas adiantadas e consolidação contábil/financeira sem perdas.",
        features: [
          "Integração nativa PDA/FDA para operações",
          "Apuração precisa de custos por cliente e projeto",
          "Controle de adiantamentos e prestação de contas",
          "Painel de rentabilidade em tempo real"
        ],
        badgeColor: "indigo"
      },
      {
        id: "sys-folha",
        category: "rh",
        badge: "DEPARTAMENTO PESSOAL",
        icon: "👥",
        title: "Folha de Pagamento Especializada",
        summary: "Gestão inteligente do departamento pessoal com regras complexas para escalas, adicionais e convenções coletivas.",
        description: "Projetada especificamente para empresas com grande contingente de colaboradores. Realiza cálculos precisos de horas extras, adicionais de periculosidade/insalubridade, controle de benefícios e holerites digitais.",
        features: [
          "Adequação completa às convenções coletivas (CCT)",
          "Emissão automática de holerites e informes",
          "Controle de férias, rescisões e afastamentos",
          "Suporte técnico com especialistas em DP"
        ],
        badgeColor: "purple"
      },
      {
        id: "sys-esocial",
        category: "rh",
        badge: "CONFORMIDADE LEGAL",
        icon: "🛡️",
        title: "TotumFlex eSocial Integrado",
        summary: "Transmissão automática e em lote de eventos do eSocial do Governo com pré-validação de consistência cadastral.",
        description: "Elimine multas e erros fiscais. O TotumFlex eSocial valida previamente admissões, desligamentos, afastamentos e eventos periódicos antes de enviar aos servidores do governo federal com protocolo seguro.",
        features: [
          "Envio em lote com assinatura digital",
          "Monitoramento de retorno com recibo oficial",
          "Pré-validador inteligente contra inconsistências",
          "Atualizado com os layouts governamentais mais recentes"
        ],
        badgeColor: "emerald"
      },
      {
        id: "sys-escalas",
        category: "operacoes",
        badge: "FACILITIES & SEGURANÇA",
        icon: "📅",
        title: "Escala de Serviços & Postos",
        summary: "Programação de escalas 12x36, 6x1 e plantões, controle de postos, faltas, trocas e controle de EPIs.",
        description: "Solução ideal para empresas de segurança armada, vigilância, limpeza e conservação. Gerencie centenas de postos de trabalho, substituições emergenciais em tempo real e integre automaticamente as horas na folha de pagamento.",
        features: [
          "Grade visual interativa de escalas 12x36 e folgas",
          "Registro instantâneo de dobras e substituições",
          "Controle de entrega de uniformes e EPIs",
          "Exportação direta de ocorrências para o fechamento de folha"
        ],
        badgeColor: "amber"
      },
      {
        id: "sys-residuos",
        category: "operacoes",
        badge: "SANEAMENTO & AMBIENTAL",
        icon: "♻️",
        title: "Faturamento - Coleta de Resíduos",
        summary: "Gestão de caçambas, MTR (Manifesto de Transporte de Resíduos), rotas, balanças de pesagem e cobrança.",
        description: "Atenda rigorosamente as exigências dos órgãos ambientais e agilize a operação. Gerencie frotas de caminhões, controle a localização de caçambas e gere faturas automáticas por tonelagem, viagem ou contrato mensal.",
        features: [
          "Geração e controle de MTR e certificados de destinação",
          "Rastreamento de caçambas e ordens de coleta",
          "Pesagem automatizada e integração com balanças",
          "Faturamento periódico parametrizável"
        ],
        badgeColor: "teal"
      },
      {
        id: "sys-faturamento",
        category: "fiscal",
        badge: "EMISSÃO & CONTRATOS",
        icon: "💳",
        title: "Faturamento - Prestadoras de Serviços",
        summary: "Emissão de NFS-e em lote com cálculos automáticos de ISS, retenções federais (IR, PIS, COFINS, CSLL) e medições.",
        description: "Fature centenas de contratos em minutos. O módulo realiza medições periódicas, aplica as regras tributárias específicas de cada município paraense e brasileiro e gera boletos bancários com integração contábil.",
        features: [
          "Emissão em lote de Notas Fiscais Eletrônicas de Serviço",
          "Cálculo automatizado de retenções na fonte",
          "Medições de contratos por horas ou entregas",
          "Geração de remessa bancária e arquivo CNAB"
        ],
        badgeColor: "blue"
      },
      {
        id: "sys-financeiro",
        category: "fiscal",
        badge: "CONTROLADORIA",
        icon: "📈",
        title: "Gestão Financeira Integrada",
        summary: "Fluxo de caixa em tempo real, contas a pagar e receber, conciliação bancária e relatórios DRE por centro de custo.",
        description: "Tenha visão estratégica da saúde financeira da empresa. Painéis com fluxo de caixa previsto vs realizado, conciliação via extrato bancário (OFX) e visão de rentabilidade por contrato ou filial.",
        features: [
          "Fluxo de caixa diário, semanal e mensal",
          "Controle de contas a pagar/receber com alertas",
          "DRE gerencial e centros de custos analíticos",
          "Conciliação bancária automática"
        ],
        badgeColor: "rose"
      }
    ]
  },
  differentials: {
    tag: "POR QUE A TOTUM FLEX?",
    title: "O que torna o TotumFlex único no mercado?",
    subtitle: "Diferente de sistemas genéricos de prateleira, nós construímos softwares que se adaptam aos processos reais da sua empresa.",
    cards: [
      {
        icon: "🎯",
        title: "Especialização em Serviços & Facilities",
        description: "Desenvolvido com foco cirúrgico nas dores de prestadores de serviços, terceirização, logística portuária e saneamento ambiental."
      },
      {
        icon: "🤝",
        title: "Suporte Técnico Humano & Especializado",
        description: "Sem robôs impessoais ou filas intermináveis. Nossos consultores entendem de tributação, DP e regras de negócio para atendê-lo de prontidão."
      },
      {
        icon: "⚡",
        title: "Customização & Adaptação Sob Demanda",
        description: "Sua operação tem particularidades únicas? Nossa equipe técnica personaliza relatórios, telas e integrações para o seu fluxo."
      },
      {
        icon: "🏛️",
        title: "Solidez & Tradição desde 2008",
        description: "Mais de 16 anos atendendo referências empresariais de Belém e da Região Norte, garantindo estabilidade e segurança jurídica."
      }
    ]
  },
  workflowSection: {
    tag: "FLUXO OPERACIONAL",
    title: "Como o TotumFlex conecta todos os setores da sua empresa",
    subtitle: "Elimine ilhas de informação. Da proposta comercial ao fechamento financeiro, tudo corre no mesmo trilho.",
    steps: [
      {
        step: "01",
        title: "Proposta Comercial",
        desc: "Precifique contratos de mão de obra com planilha de custos e encargos exatos em poucos cliques."
      },
      {
        step: "02",
        title: "Operação & Escalas",
        desc: "Distribua equipes nos postos, acompanhe presenças, faltas e controle a entrega de materiais/EPIs."
      },
      {
        step: "03",
        title: "Fechamento & eSocial",
        desc: "Gere a folha de pagamento sem divergências e envie os eventos fiscais ao eSocial automaticamente."
      },
      {
        step: "04",
        title: "Faturamento & Caixa",
        desc: "Emita as notas fiscais (NFS-e), gere os boletos e visualize o fluxo de caixa com lucro por contrato."
      }
    ]
  },
  about: {
    tag: "SOBRE A FLEX INFORMÁTICA",
    title: "Compromisso com a tecnologia que impulsiona empresas",
    history: "Fundada em 19 de agosto de 2008 na cidade de Belém do Pará, a Flex Informática consolidou-se como referência no desenvolvimento de softwares corporativos e automação da gestão de empresas de serviços.",
    pillarsTitle: "Nossos Pilares Fundamentais",
    pillars: [
      { name: "Qualidade", desc: "Software estável, veloz e rigorosamente testado para rotinas ininterruptas." },
      { name: "Responsabilidade", desc: "Prazos cumpridos e total segurança sobre o ativo mais valioso: seus dados." },
      { name: "Competência", desc: "Equipe com profundo conhecimento das regras fiscais e trabalhistas brasileiras." }
    ],
    mission: "Automatizar a gestão de empresas prestadoras de serviço através da personalização de software, fornecendo praticidade e atendimento de alto nível.",
    vision: "Ser a principal referência na Região Norte e no Brasil em soluções de software ERP para o setor de prestação de serviços."
  },
  contact: {
    tag: "VAMOS CONVERSAR?",
    title: "Pronto para modernizar a gestão da sua empresa?",
    subtitle: "Agende uma demonstração ao vivo com um de nossos especialistas e conheça na prática como o TotumFlex pode multiplicar a sua produtividade.",
    address: "Trav. São Pedro, 261 - Bairro Campina - Belém / PA - CEP: 66023-570",
    phone: "(91) 99351-9240",
    phoneFixed: "(91) 3343-4090",
    email: "contato@totumflex.com.br",
    hours: "Segunda a Sexta: 08:00 às 18:00",
    instagram: "https://www.instagram.com/totumflex/",
    facebook: "https://www.facebook.com/totumflex"
  },
  footer: {
    copyright: "© 2026 Flex Informática Ltda. Todos os direitos reservados.",
    cnpj: "TotumFlex Soluções em TI - Belém - PA",
    disclaimer: "Desenvolvido com excelência técnica para impulsionar negócios."
  }
};
