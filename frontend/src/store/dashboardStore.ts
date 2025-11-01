import { create } from 'zustand';
import type { KpiData, ReportData, DataRow, StoreDetailData } from '../types/analytics';

const API_BASE_URL = 'http://localhost:8000/api/v2';

interface DashboardState {
  // Estado de Visualização 
  currentView: 'global' | 'store_detail';
  selectedStore: string | null;
  
  // Dados da Visão Global 
  kpiData: KpiData | null;
  reportData: ReportData | null;
  isLoadingKpis: boolean;
  
  // Dados da Visão de Detalhe 
  storeDetailData: StoreDetailData | null;
  isLoadingDetail: boolean; // Loading separado para o detalhe

  // Genéricos
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchKpis: () => Promise<void>;
  fetchReport: (endpoint: string, title: string, params?: Record<string, any>) => Promise<void>;
  
  fetchDrilldownReport: (
    type: 'by_month' | 'by_channel_to_products', 
    value: string, 
    context?: Record<string, any>
  ) => Promise<void>;
  
  fetchStoreDetail: (storeName: string) => Promise<void>; // Busca os 3 relatórios da loja
  showGlobalView: () => void; // Ação para o botão "Voltar"
}

export const useDashboardStore = create<DashboardState>((set) => ({
  currentView: 'global',      
  selectedStore: null,      
  kpiData: null,
  reportData: null,
  storeDetailData: null,      
  isLoading: false,
  isLoadingKpis: false,
  isLoadingDetail: false,   
  error: null,

  // --- 2. Ação: Voltar para a Home ---
  showGlobalView: () => {
    set({ 
      currentView: 'global', 
      selectedStore: null, 
      storeDetailData: null, 
      reportData: null // Limpa o relatório antigo
    });
  },

  // --- 3. A função fetchKpis ---
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
    
    set({ 
      isLoading: true, 
      error: null, 
      reportData: null, 
      currentView: 'global', 
      storeDetailData: null, // Limpa os dados da loja antiga
      selectedStore: null  // Limpa a seleção de loja
    });
    
    try {
      // --- Constroi a URL ---
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
      
      // --- Salva os dados ---
      set({ 
        reportData: { 
          data, 
          title,
          context: endpoint.split('/').pop(),
          store_name: null // Reseta o contexto da loja
        },
        isLoading: false 
      });
      
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  
  fetchDrilldownReport: async (
    type: 'by_month' | 'by_channel_to_products', 
    value: string, 
    context: Record<string, any> = {}
  ) => {
    set({ isLoading: true, error: null });
    
    let url = '';
    let title = '';
    let newContext = '';
    // Preserva o contexto da loja (importante para o drilldown Mês -> Dias da Loja)
    let storeNameForNextState = context.store_name || null; 

    if (type === 'by_month') {
      title = `Faturamento Diário (${value})`;
      url = `${API_BASE_URL}/reports/sales_by_day_stacked?mes_ano=${value}`;
      newContext = 'daily_stacked_histogram';
      
      if (context.store_name) {
        title = `Faturamento Diário (${value}, Loja: ${context.store_name})`;
        url += `&store_name=${encodeURIComponent(context.store_name)}`;
      }
      
    } else if (type === 'by_channel_to_products') {
      title = `Top Produtos (Canal: ${value})`;
      url = `${API_BASE_URL}/reports/top_products_by_channel?channel_name=${encodeURIComponent(value)}`;
      newContext = 'top_products';
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
          store_name: storeNameForNextState 
        },
        isLoading: false 
      });
      
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  // Esta função busca os 3 relatórios da página de detalhe da loja
  fetchStoreDetail: async (storeName: string) => {
    // Liga o loading DE DETALHE e muda a view
    set({ 
      isLoadingDetail: true, 
      error: null, 
      currentView: 'store_detail', 
      selectedStore: storeName 
    });

    try {
      // Busca os 3 endpoints da API em paralelo
      const [kpiRes, monthlyRes, productRes] = await Promise.all([
        fetch(`${API_BASE_URL}/reports/kpi_summary_for_store?store_name=${encodeURIComponent(storeName)}`),
        fetch(`${API_BASE_URL}/reports/sales_by_month_for_store?store_name=${encodeURIComponent(storeName)}`),
        fetch(`${API_BASE_URL}/reports/top_products_by_store?store_name=${encodeURIComponent(storeName)}`)
      ]);

      if (!kpiRes.ok || !monthlyRes.ok || !productRes.ok) {
        throw new Error('Falha ao buscar dados detalhados da loja');
      }

      // Converte as 3 respostas para JSON
      const kpiData: DataRow[] = await kpiRes.json();
      const monthlyData: DataRow[] = await monthlyRes.json();
      const productData: DataRow[] = await productRes.json();

      // Salva tudo no novo 'storeDetailData'
      set({
        storeDetailData: {
          kpis: (kpiData[0] as KpiData) || null,
          monthlySales: monthlyData,
          topProducts: productData
        },
        isLoadingDetail: false
      });

    } catch (err: any) {
      set({ error: err.message, isLoadingDetail: false });
    }
  }
  
}));