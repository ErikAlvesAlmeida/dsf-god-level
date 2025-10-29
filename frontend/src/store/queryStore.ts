import { create } from 'zustand';
import type { QueryRequest, QueryResponse } from '../types/analytics';

// Define a "forma" do nosso estado
interface QueryState {
  // A requisição que estamos construindo
  request: QueryRequest;
  
  // A resposta da API
  response: QueryResponse | null;
  
  // Estado de UI
  isLoading: boolean;
  error: string | null;

  // Funções para ATUALIZAR o estado
  setMetrics: (metrics: string[]) => void;
  setDimensions: (dimensions: string[]) => void;
  runQuery: () => Promise<void>; // A função principal que chama a API
}

// Cria o "store"
export const useQueryStore = create<QueryState>((set) => ({
  // --- Valores Iniciais ---
  request: {
    metrics: ['COUNT(sale_id) AS total_vendas'],
    dimensions: ['channel_name'], 
    filters: [],
    order_by: {},
    limit: 100,
  },
  response: null,
  isLoading: false,
  error: null,

  // --- Funções de Atualização (Setters) ---
  setMetrics: (metrics) =>
    set((state) => ({
      request: { ...state.request, metrics },
    })),

  setDimensions: (dimensions) =>
    set((state) => ({
      request: { ...state.request, dimensions },
    })),

  // --- Ação Principal (Chamar a API) ---
  runQuery: async () => {
    set({ isLoading: true, error: null, response: null });
    
    // Pega o estado atual da requisição
    const requestBody = useQueryStore.getState().request;

    try {
      // ATENÇÃO: Lembre-se de ligar o backend (uvicorn) em outro terminal!
      const res = await fetch('http://localhost:8000/api/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`Erro na API: ${res.statusText}`);
      }

      const data: QueryResponse = await res.json();
      set({ response: data, isLoading: false });
      
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));