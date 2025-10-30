import { create } from 'zustand';

// Re-usamos o tipo de dados, pois a API ainda retorna linhas de dados
type DataRow = Record<string, any>;

export interface KpiData {
  faturamento_total: number;
  ticket_medio: number;
  total_vendas: number;
  avg_tempo_entrega_min: number;
}

export interface ReportData {
  title: string;
  data: DataRow[];
  query_sql?: string; // Opcional, para debug
  context?: string;
}

interface DashboardState {
  kpiData: KpiData | null;
  reportData: ReportData | null;
  isLoading: boolean;
  isLoadingKpis: boolean;
  error: string | null;
  
  fetchReport: (endpoint: string, title: string, params?: Record<string, any>) => Promise<void>;
  fetchDrilldownReport: (mesAno: string) => Promise<void>;
}

const API_BASE_URL = 'http://localhost:8000/api/v2';

export const useDashboardStore = create<DashboardState>((set) => ({
  // --- Valores Iniciais ---
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
  // --- Ação Principal (Chamar um endpoint) ---
  fetchReport: async (endpoint: string, title: string, params?: Record<string, any>) => {
    set({ isLoading: true, error: null, reportData: null });
    
    try {
      let url = `${API_BASE_URL}${endpoint}`;
      
      if (params) {
        // --- CORREÇÃO DO BOOLEANO ---
        // Constrói a query string manualmente
        const queryParts: string[] = [];
        for (const key in params) {
          if (Object.prototype.hasOwnProperty.call(params, key)) {
            // Converte o valor (incluindo 'false') para string explicitamente
            const value = String(params[key]); 
            queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
          }
        }

        if (queryParts.length > 0) {
          url += `?${queryParts.join('&')}`;
        }
        // --- FIM DA CORREÇÃO ---
      }

      console.log("Chamando API:", url); // Adiciona um log para debug

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
          context: endpoint.split('/').pop() 
        },
        isLoading: false 
      });
      
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchDrilldownReport: async (mesAno: string) => {
    set({ isLoading: true, error: null });
    const title = `Faturamento Diário Empilhado (${mesAno})`;
    
    try {
      // Chama o novo endpoint com o parâmetro
      const res = await fetch(`${API_BASE_URL}/reports/sales_by_day_stacked?mes_ano=${mesAno}`);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Erro na API: ${res.status} ${res.statusText} - ${errText}`);
      }

      const data: DataRow[] = await res.json();
      
      set({ 
        reportData: { 
          data, 
          title, 
          context: 'daily_stacked_histogram' 
        },
        isLoading: false 
      });
      
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));