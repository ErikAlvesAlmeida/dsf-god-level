import { Button, Select, Space, Typography } from 'antd';
import { useQueryStore } from '../store/queryStore';

const { Title, Text } = Typography;

// Os "values" devem bater com o SQL que a API espera
const METRIC_OPTIONS = [
  { label: 'Total de Vendas (#)', value: 'COUNT(DISTINCT sale_id) as total_vendas' },
  { label: 'Faturamento Total (R$)', value: 'SUM(sale_total_amount) as faturamento' },
  { label: 'Ticket Médio (R$)', value: 'AVG(sale_total_amount) as ticket_medio' },
  { label: 'Tempo Médio de Entrega (min)', value: 'AVG(delivery_seconds / 60) as tempo_entrega_min' },
];

const DIMENSION_OPTIONS = [
  { label: 'Canal', value: 'channel_name' },
  { label: 'Loja', value: 'store_name' },
  { label: 'Categoria do Produto', value: 'product_category' },
  { label: 'Produto', value: 'product_name' },
  { label: 'Bairro de Entrega', value: 'delivery_neighborhood' },
];

export function QueryBuilder() {
  // Conecta o componente ao nosso store (Zustand)
  const { 
    request, 
    setMetrics, 
    setDimensions, 
    runQuery,
    isLoading 
  } = useQueryStore();

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Title level={4}>Construtor de Análises</Title>
      
      <Text>1. Escolha suas Métricas (O que medir?)</Text>
      <Select
        mode="multiple"
        allowClear
        style={{ width: '100%' }}
        placeholder="Selecione as métricas..."
        value={request.metrics}
        onChange={(newMetrics) => setMetrics(newMetrics)}
        options={METRIC_OPTIONS}
      />

      <Text>2. Escolha suas Dimensões (Como agrupar?)</Text>
      <Select
        mode="multiple"
        allowClear
        style={{ width: '100%' }}
        placeholder="Selecione as dimensões..."
        value={request.dimensions}
        onChange={(newDimensions) => setDimensions(newDimensions)}
        options={DIMENSION_OPTIONS}
      />

      <Button
        type="primary"
        onClick={runQuery} // Dispara a chamada à API
        loading={isLoading} // Mostra o "loading" no botão
        style={{ marginTop: '16px' }}
      >
        {isLoading ? 'Consultando...' : 'Rodar Consulta'}
      </Button>
    </Space>
  );
}