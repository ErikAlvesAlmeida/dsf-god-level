import { create } from 'zustand';

type DataRow = Record<string, any>;

export interface KpiData {
  faturamento_total: number;
  ticket_medio: number;
  total_vendas: number;
  avg_tempo_entrega_min: number;
}

// --- MUDANÇA 1: Adicionar 'store_name' ao ReportData ---
// O 'reportData' agora sabe em qual loja ele está filtrado
export interface ReportData {
  title: string;
  data: DataRow[];
  query_sql?: string;
  context?: string;
  store_name?: string | null; 
}

interface DashboardState {
  kpiData: KpiData | null;
  reportData: ReportData | null;
  isLoading: boolean;
  isLoadingKpis: boolean;
  error: string | null;
  
  fetchReport: (endpoint: string, title: string, params?: Record<string, any>) => Promise<void>;
  
  // --- Assinatura da função agora aceita um 'contexto' opcional ---
  fetchDrilldownReport: (
    type: 'by_month' | 'by_store', 
    value: string, 
    context?: Record<string, any>
  ) => Promise<void>;
  
  fetchKpis: () => Promise<void>;
}

const API_BASE_URL = 'http://localhost:8000/api/v2';

export const useDashboardStore = create<DashboardState>((set) => ({
  // ... (valores iniciais e fetchKpis são iguais) ...
  kpiData: null,
  reportData: null,
  isLoading: false,
  isLoadingKpis: false,
  error: null,

  fetchKpis: async () => {
    set({ isLoadingKpis: true });
    try {
      const res = await fetch(`${API_BASE_URL}/reports/kpi_summary`);
      if (!res.ok) throw new Error('Erro ao buscar KPIs');
      const data: DataRow[] = await res.json();
      
      if (data.length > 0) {
        set({ kpiData: data[0] as KpiData, isLoadingKpis: false });
      } else {
        throw new Error('KPIs retornaram vazios');
      }
    } catch (err: any) {
      set({ error: err.message, isLoadingKpis: false });
    }
  },
  
  fetchReport: async (endpoint: string, title: string, params?: Record<string, any>) => {
    set({ isLoading: true, error: null, reportData: null });
    
    try {
      // --- Constroi a URL  ---
      let url = `${API_BASE_URL}${endpoint}`;
      
      if (params) {
        // Constrói a query string manualmente
        const queryParts: string[] = [];
        for (const key in params) {
          if (Object.prototype.hasOwnProperty.call(params, key)) {
            const value = String(params[key]); 
            queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
          }
        }

        if (queryParts.length > 0) {
          url += `?${queryParts.join('&')}`;
        }
      }

      console.log("Chamando API:", url);

      // --- Chama a API ---
      const res = await fetch(url);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Erro na API: ${res.status} ${res.statusText} - ${errText}`);
      }

      const data: DataRow[] = await res.json();
      
      set({ 
        reportData: { 
          data, 
          title,
          context: endpoint.split('/').pop(),
          store_name: null // Reseta o contexto da loja (importante!)
        },
        isLoading: false 
      });
      
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  

  // --- MUDANÇA 4: A LÓGICA INTEIRA DO DRILLDOWN ---
  fetchDrilldownReport: async (
    type: 'by_month' | 'by_store', 
    value: string, 
    context: Record<string, any> = {} // Recebe o contexto (ex: { store_name: "Loja X" })
  ) => {
    set({ isLoading: true, error: null });
    
    let url = '';
    let title = '';
    let newContext = '';
    let storeNameForNextState = context.store_name || null; // Preserva o contexto da loja

    if (type === 'by_month') {
      // Drill-down: Mês -> Dias
      title = `Faturamento Diário (${value})`;
      url = `${API_BASE_URL}/reports/sales_by_day_stacked?mes_ano=${value}`;
      newContext = 'daily_stacked_histogram';
      
      // A MÁGICA DO BUG 1: Se o contexto TINHA uma loja, passe-a para a API
      if (context.store_name) {
        title = `Faturamento Diário (${value}, Loja: ${context.store_name})`;
        url += `&store_name=${encodeURIComponent(context.store_name)}`;
      }
      
    } else if (type === 'by_store') {
      // Drill-down: Loja -> Meses
      title = `Faturamento Mensal (Loja: ${value})`;
      url = `${API_BASE_URL}/reports/sales_by_month_for_store?store_name=${encodeURIComponent(value)}`;
      newContext = 'sales_by_month';
      storeNameForNextState = value; // Salva a loja clicada para o PRÓXIMO drilldown
    }
    
    try {
      const res = await fetch(url);
      if (!res.ok) {
         const errText = await res.text();
         throw new Error(`Erro na API de drilldown: ${errText}`);
      }
      const data: DataRow[] = await res.json();
      
      set({ 
        reportData: { 
          data, 
          title, 
          context: newContext,
          // SALVA O CONTEXTO DA LOJA no estado
          store_name: storeNameForNextState 
        },
        isLoading: false 
      });
      
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));