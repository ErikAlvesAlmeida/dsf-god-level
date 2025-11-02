// src/store/dashboardStore.ts
import { create } from 'zustand';
// (O seu 'types/analytics.ts' deve ter todos estes)
import type { KpiData, ReportData, DataRow, StoreDetailData } from '../types/analytics'; 

const API_BASE_URL = 'http://localhost:8000/api/v2';

// --- "MEMÓRIA" DO FUNIL (Isto está 100% CORRETO, NÃO MUDA) ---
interface VendasPorLojaState {
  allStores: DataRow[];
  selectedStore: string | null;
  selectedMonth: string | null;
  monthlyReport: ReportData | null;
  productReport: ReportData | null;
  channelReport: ReportData | null;
  isLoadingStores: boolean;
  isLoadingMonthly: boolean;
  isLoadingDetail: boolean;
}

// --- A NOVA INTERFACE GERAL (Fase 13) ---
// (Este é o bloco que você substitui)
interface DashboardState {
  // Mantém os KPIs Globais (Correto)
  kpiData: KpiData | null;
  isLoadingKpis: boolean;
  error: string | null;

  // --- MUDANÇA 1: Adiciona estado para "Roteamento" ---
  // (Controla o que o App.tsx mostra: o seu "funil" OU um "relatório global")
  currentView: 'funil_loja' | 'relatorio_global'; 

  // --- MUDANÇA 2: Adiciona "Memória" para os Relatórios Globais ---
  globalReport: ReportData | null; // O 'DataDisplay' global vai ler daqui
  isLoadingGlobalReport: boolean; // Loading para o relatório global

  // "Memória" para o Funil de Loja (Correto, não muda)
  vendasPorLoja: VendasPorLojaState;

  // --- AS AÇÕES (Mapeadas para o fluxo) ---
  fetchKpis: () => Promise<void>;
  
  // Ações do Funil (Corretas, não mudam)
  fetchStoreList: () => Promise<void>;
  fetchMonthlyReportForStore: (storeName: string) => Promise<void>;
  fetchDetailReportsForMonth: (mesAno: string) => Promise<void>;
  // (A 'resetStoreSelection' será renomeada para 'showFunilLojaView' para clareza)
  
  // --- MUDANÇA 3: Ações para "mudar de visão" ---
  showFunilLojaView: () => void; // (Substitui 'resetStoreSelection')
  
  // --- MUDANÇA 4: Re-adicionar o 'fetchGlobalReport' (para os outros itens do menu) ---
  fetchGlobalReport: (endpoint: string, title: string, params?: Record<string, any>) => Promise<void>;
  fetchDrilldownReport: (type: string, value: string, context?: Record<string, any>) => Promise<void>;
}

// --- (Esta constante 'initialVendasPorLojaState' está 100% CORRETA, NÃO MUDA) ---
const initialVendasPorLojaState: VendasPorLojaState = {
  allStores: [],
  selectedStore: null,
  selectedMonth: null,
  monthlyReport: null,
  productReport: null,
  channelReport: null,
  isLoadingStores: false,
  isLoadingMonthly: false,
  isLoadingDetail: false,
};

// --- 2. O Início da Implementação ---
export const useDashboardStore = create<DashboardState>((set, get) => ({

  // --- Valores Iniciais (Fase 13) ---
  kpiData: null,
  isLoadingKpis: false,
  error: null,
  currentView: 'relatorio_global', // Começa na visão "Global"
  globalReport: null,
  isLoadingGlobalReport: false,
  vendasPorLoja: initialVendasPorLojaState, // Carrega o estado inicial do seu funil

  // --- A função fetchKpis (100% CORRETA, NÃO MUDA) ---
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
  
  // --- Ação para buscar "Relatórios Globais" (Vendas por Canal, etc.) ---
  fetchGlobalReport: async (endpoint: string, title: string, params?: Record<string, any>) => {
    // 1. Liga o loading GLOBAL e muda a visão
    set({ 
      isLoadingGlobalReport: true, 
      error: null, 
      globalReport: null, 
      currentView: 'relatorio_global', // Garante que estamos na visão correta
      vendasPorLoja: initialVendasPorLojaState // Reseta o funil da loja
    });
    
    try {
      // 2. Constrói a URL (lógica da Fase 9, 100% correta)
      let url = `${API_BASE_URL}${endpoint}`;
      if (params) {
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
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao buscar relatório global');
      const data: DataRow[] = await res.json();
      
      // 3. Salva os dados no 'globalReport'
      set({ 
        globalReport: { 
          data, 
          title,
          context: endpoint.split('/').pop(),
          store_name: null 
        },
        isLoadingGlobalReport: false 
      });
      
    } catch (err: any) {
      set({ error: err.message, isLoadingGlobalReport: false });
    }
  },

  fetchDrilldownReport: async (type: string, value: string, context: Record<string, any> = {}) => {
    // Esta função é chamada pela VISÃO GLOBAL
    // Ela vai RECARREGAR o 'globalReport' com os dados do drilldown
    set({ isLoadingGlobalReport: true, error: null }); // Usa o loading global
    
    let url = '';
    let title = '';
    let newContext = '';
    // (Pega o 'store_name' do contexto, embora seja 'null' no global)
    let storeName = context.store_name || null; 

    // O 'type' aqui é o 'context' que o DataDisplay passou
    if (type === 'sales_by_month') { 
      title = `Faturamento Diário (${value})`;
      url = `${API_BASE_URL}/reports/sales_by_day_stacked?mes_ano=${value}`;
      newContext = 'daily_stacked_histogram';
      
    } else if (type === 'sales_by_channel') {
      title = `Top Produtos (Canal: ${value})`;
      url = `${API_BASE_URL}/reports/top_products_by_channel?channel_name=${encodeURIComponent(value)}`;
      newContext = 'top_products';
    }
    // (Adicione mais 'else if' aqui para outros drilldowns globais)
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro no drilldown global');
      const data: DataRow[] = await res.json();
      
      set({ 
        globalReport: { // <-- Salva no 'globalReport'
          data, 
          title, 
          context: newContext,
          store_name: storeName // (será 'null', o que é correto)
        },
        isLoadingGlobalReport: false 
      });
      
    } catch (err: any) {
      set({ error: err.message, isLoadingGlobalReport: false });
    }
  },

  // --- Ação para "trocar" para o Funil de Loja ---
  showFunilLojaView: () => {
    set({
      currentView: 'funil_loja', // Muda a "página"
      globalReport: null, // Limpa o relatório global
      vendasPorLoja: initialVendasPorLojaState // Reseta o funil
    });
  },

  // --- Ações do Funil de Loja (100% CORRETAS, NÃO MUDAM) ---
  fetchStoreList: async () => {
    set(state => ({ vendasPorLoja: { ...state.vendasPorLoja, isLoadingStores: true } }));
    try {
      const res = await fetch(`${API_BASE_URL}/data/stores_list`);
      if (!res.ok) throw new Error('Falha ao buscar lista de lojas');
      const data: DataRow[] = await res.json();
      set(state => ({
        vendasPorLoja: { ...state.vendasPorLoja, allStores: data, isLoadingStores: false }
      }));
    } catch (err: any) {
      set({ error: err.message, vendasPorLoja: { ...get().vendasPorLoja, isLoadingStores: false } });
    }
  },

  fetchMonthlyReportForStore: async (storeName: string) => {
    set(state => ({
      vendasPorLoja: { 
        ...initialVendasPorLojaState, 
        allStores: state.vendasPorLoja.allStores, 
        isLoadingMonthly: true, 
        selectedStore: storeName, 
      }
    }));
    
    try {
      const url = `${API_BASE_URL}/reports/sales_by_month_for_store?store_name=${encodeURIComponent(storeName)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao buscar relatório mensal');
      const data: DataRow[] = await res.json();
      
      set(state => ({
        vendasPorLoja: {
          ...state.vendasPorLoja,
          monthlyReport: {
            title: `Faturamento Mensal: ${storeName}`,
            data: data,
            context: 'sales_by_month_for_store', 
            store_name: storeName 
          },
          isLoadingMonthly: false
        }
      }));
    } catch (err: any) {
      set({ error: err.message, vendasPorLoja: { ...get().vendasPorLoja, isLoadingMonthly: false } });
    }
  },

  fetchDetailReportsForMonth: async (mesAno: string) => {
    const { selectedStore } = get().vendasPorLoja;
    if (!selectedStore) return; 

    set(state => ({
      vendasPorLoja: {
        ...state.vendasPorLoja,
        isLoadingDetail: true,
        selectedMonth: mesAno,
        productReport: null, 
        channelReport: null, 
      }
    }));

    try {
      const [productRes, channelRes] = await Promise.all([
        fetch(`${API_BASE_URL}/reports/top_products_by_store?store_name=${encodeURIComponent(selectedStore)}&mes_ano=${mesAno}`),
        fetch(`${API_BASE_URL}/reports/sales_by_channel_detail?store_name=${encodeURIComponent(selectedStore)}&mes_ano=${mesAno}`)
      ]);
      
      if (!productRes.ok || !channelRes.ok) throw new Error('Falha ao buscar relatórios detalhados');

      const productData: DataRow[] = await productRes.json();
      const channelData: DataRow[] = await channelRes.json();

      set(state => ({
        vendasPorLoja: {
          ...state.vendasPorLoja,
          productReport: {
            title: `Top Produtos (${mesAno})`,
            data: productData,
            context: 'top_products_detail'
          },
          channelReport: {
            title: `Vendas por Canal (${mesAno})`,
            data: channelData,
            context: 'channel_detail'
          },
          isLoadingDetail: false
        }
      }));
    } catch (err: any) {
      set({ error: err.message, vendasPorLoja: { ...get().vendasPorLoja, isLoadingDetail: false } });
    }
  },
  
  // (A 'resetStoreSelection' foi removida e substituída por 'showFunilLojaView')
  // (A 'fetchDrilldownReport' foi removida pois o 'DataDisplay' será "burro")

}));