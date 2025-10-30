import { create } from 'zustand';

// Re-usamos o tipo de dados, pois a API ainda retorna linhas de dados
type DataRow = Record<string, any>;

export interface ReportData {
  title: string;
  data: DataRow[];
  query_sql?: string; // Opcional, para debug
  context?: string;
}

interface DashboardState {
  reportData: ReportData | null;
  isLoading: boolean;
  error: string | null;
  
  fetchReport: (endpoint: string, title: string, params?: Record<string, any>) => Promise<void>;
  fetchDrilldownReport: (mesAno: string) => Promise<void>;
}

const API_BASE_URL = 'http://localhost:8000/api/v2';

export const useDashboardStore = create<DashboardState>((set) => ({
  // --- Valores Iniciais ---
  reportData: null,
  isLoading: false,
  error: null,

  // --- Ação Principal (Chamar um endpoint) ---
  fetchReport: async (endpoint: string, title: string) => {
    set({ isLoading: true, error: null, reportData: null });
    
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`); // Ex: /api/v2/reports/sales_by_store

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Erro na API: ${res.status} ${res.statusText} - ${errText}`);
      }

      const data: DataRow[] = await res.json();
      
      set({ 
        reportData: { data, title },
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