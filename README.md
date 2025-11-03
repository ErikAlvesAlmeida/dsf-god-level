# 🏆 God Level Coder Challenge

## Leia o QUICKSTART.MD para ter as informações necessárias para rodar o projeto
[QUICKSTART.md](./initial_information/QUICKSTART.md)

## O Problema

Donos de restaurantes gerenciam operações complexas através de múltiplos canais (presencial, iFood, Rappi, app próprio). Eles têm dados de **vendas, produtos, clientes e operações**, mas não conseguem extrair insights personalizados para tomar decisões de negócio.

Ferramentas como Power BI são genéricas demais. Dashboards fixos não respondem perguntas específicas. **Como empoderar donos de restaurantes a explorarem seus próprios dados?**

## O Desafio

Construir uma solução que permita donos de restaurantes **criarem suas próprias análises** sobre seus dados operacionais. Pense: "Power BI para restaurantes" ou "Metabase específico para food service".

### O que esperamos

Uma plataforma onde um dono de restaurante possa:
- Visualizar métricas relevantes (faturamento, produtos mais vendidos, horários de pico)
- Criar dashboards personalizados sem escrever código
- Comparar períodos e identificar tendências
- Extrair valor de dados complexos de forma intuitiva

### O que você recebe

- Script para geração de **500.000 vendas** de 6 meses (50 lojas, múltiplos canais)
- Schema PostgreSQL com dados realistas de operação
- Liberdade total de tecnologias e arquitetura
- Liberdade total no uso de AI e ferramentas de geração de código

### O que você entrega

1. Uma solução funcionando (deployed ou local) - com frontend e backend adequados ao banco fornecido
2. Documentação de decisões arquiteturais
3. Demo em vídeo (5-10 min) explicando sua abordagem - mostrando a solução funcional e deployada / rodando na sua máquina, apresentando-a no nível de detalhes que julgar relevante
4. Código bem escrito e testável

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [PROBLEMA.md](./initial_information/PROBLEMA.md) | Contexto detalhado, persona Maria, dores do usuário |
| [DADOS.md](./initial_information/DADOS.md) | Schema completo, padrões, volume de dados |
| [AVALIACAO.md](./initial_information/AVALIACAO.md) | Como avaliaremos sua solução |
| [FAQ.md](./initial_information/FAQ.md) | Perguntas frequentes |
| [QUICKSTART.md](./initial_information/QUICKSTART.md) | Tutorial rápido para **RODAR O PROJETO** |

## Estrutura final do projeto
```
dsf-god-level/
│
├── backend/
│   ├── .env                   # (Não versionado) Credenciais do Postgres (DATABASE_URL)
│   ├── analytics.duckdb       # (Não versionado) O Data Mart OLAP (resultado do ETL)
│   ├── etl_rapido.py          # Script de ETL com limitação de dados (Postgres -> DuckDB)
│   ├── etl.py                 # (Otimizado v4) Script de ETL (Postgres -> DuckDB)
│   ├── main.py                # A API FastAPI (Backend "Curado")
│   ├── requirements.txt       # Dependências Python (fastapi, uvicorn, duckdb, psycopg2)
│   └── venv/                  # (Não versionado) Ambiente virtual Python
│
├── frontend/
│   ├── src/
│   │   ├── components/        # --- O CORAÇÃO DA UI ---
│   │   │   ├── App.tsx        # O "Pai" principal: Roteador de Visão e carregador de KPIs
│   │   │   ├── DashboardMenu.tsx # O Menu lateral ("Gatilho")
│   │   │   ├── KpiCards.tsx      # Componente "Burro" (Reutilizável) para os 4 KPIs
│   │   │   ├── DataDisplay.tsx   # Componente "Burro" (Reutilizável) para Gráficos/Tabelas
│   │   │   ├── VendasPorLojaView.tsx # O "Pai" do Funil de Loja 
│   │   │   └── CustomerReportView.tsx # O "Pai" do Relatório de Clientes 
│   │   │
│   │   ├── store/
│   │   │   └── dashboardStore.ts # O "Cérebro" (Zustand)
│   │   │
│   │   ├── types/
│   │   │   └── analytics.ts    # Os "Contratos" (Interfaces KpiData, ReportData, etc.)
│   │   │
│   │   ├── index.css          # Estilos globais (inclui o reset do Ant Design)
│   │   ├── main.tsx           # O ponto de entrada do React
│   │   └── ... (outros arquivos de setup: vite-env.d.ts)
│   │
│   ├── index.html             # O HTML raiz que carrega o React
│   ├── package.json           # Dependências JS (react, antd, echarts, zustand)
│   ├── tsconfig.json          # Configuração do TypeScript
│   └── vite.config.ts         # Configuração do Vite (Frontend server)
│
├── database-schema.sql      # O Schema SQL original (corrigido com o INSERT da 'brand')
├── docker-compose.yml       # Orquestração do Docker (Postgres, pgAdmin, Data-Generator)
├── Dockerfile               # Dockerfile para o 'data-generator'
├── generate_data.py         # O script original para popular o Postgres
├── QUICKSTART.md            # Markdown mostrando o passo a passo de como rodar o projeto
├── README.md                # (informações iniciais)
└── requirements.txt         # Dependências Python (só para o 'data-generator')
```