// O tipo 'KpiData' (para os cards do topo, globais ou de loja)
export interface KpiData {
  faturamento_total: number;
  ticket_medio: number;
  total_vendas: number;
  avg_tempo_entrega_min: number;
  total_descontos: number;
}

// O tipo 'DataRow' (uma linha de dados genérica da API)
export type DataRow = Record<string, any>;

// O tipo 'ReportData' (para a visão 'global')
// (Ele sabe em qual loja estava para o drilldown)
export interface ReportData {
  title: string;
  data: DataRow[];
  query_sql?: string;
  context?: string;
  store_name?: string | null;
}

// O tipo 'StoreDetailData' (para a nova visão de 'detalhe da loja')
// (Agrupa os 3 relatórios da página de detalhe)
export interface StoreDetailData {
  kpis: KpiData | null;
  monthlySales: DataRow[] | null;
  topProducts: DataRow[] | null;
}