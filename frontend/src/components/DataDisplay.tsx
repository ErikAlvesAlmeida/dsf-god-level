import { Alert, Spin, Table, Typography } from 'antd';
import { useQueryStore } from '../store/queryStore';

const { Title } = Typography;

export function DataDisplay() {
  // Conecta o componente ao store (apenas leitura)
  const { response, isLoading, error } = useQueryStore();

  // 1. Estado de Carregamento (Loading)
  if (isLoading) {
    return <Spin tip="Carregando dados..." size="large" />;
  }

  // 2. Estado de Erro
  if (error) {
    return <Alert message="Erro ao consultar API" description={error} type="error" showIcon />;
  }

  // 3. Estado Vazio (Sem consulta ou sem dados)
  if (!response || response.data.length === 0) {
    return <Alert message="Nenhum dado para exibir" description="Rode uma consulta para ver os resultados aqui." type="info" />;
  }

  const columns = Object.keys(response.data[0]).map((key) => ({
    title: key.replace(/_/g, ' ').toUpperCase(), // Deixa o título bonito (ex: 'channel_name' -> 'CHANNEL NAME')
    dataIndex: key,
    key: key,
    // Tenta formatar números
    render: (value: any) => {
      if (typeof value === 'number') {
        // Formata como R$ se for "faturamento" ou "ticket"
        if (key.includes('faturamento') || key.includes('ticket')) {
          return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        // Formata com 2 casas decimais se for float
        if (!Number.isInteger(value)) {
          return value.toFixed(2);
        }
      }
      return value;
    },
  }));

  return (
    <div>
      <Title level={4}>Resultados</Title>
      {/* TODO: Adicionar gráficos (ECharts) aqui na Fase 4.
        Por enquanto, vamos focar na Tabela.
      */}
      
      <Table
        columns={columns}
        dataSource={response.data}
        rowKey={(_, index) => `row-${index}`} // Cria uma key única para cada linha
        bordered
        size="small"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }} // Permite scroll horizontal se tiver muitas colunas
      />
      
      <Alert
        type="info"
        message="Query SQL Executada"
        description={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{response.query_sql}</pre>}
        style={{ marginTop: 16 }}
      />
    </div>
  );
}