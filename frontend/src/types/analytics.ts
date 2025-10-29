// Define o formato de um filtro
export interface Filter {
  field: string;
  operator: string;
  value: any;
}

// Define o formato da REQUISIÇÃO que enviamos para a API
export interface QueryRequest {
  metrics: string[];
  dimensions: string[];
  filters: Filter[];
  order_by: Record<string, string>;
  limit: number;
}

// Define o formato de CADA LINHA de dados que recebemos
// Usamos 'Record<string, any>' pois não sabemos as colunas exatas (são dinâmicas)
export type DataRow = Record<string, any>;

// Define o formato da RESPOSTA completa da API
export interface QueryResponse {
  query_sql: string;
  params: any[];
  count: number;
  data: DataRow[];
}