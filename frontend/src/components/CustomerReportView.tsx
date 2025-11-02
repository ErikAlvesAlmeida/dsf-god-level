// src/components/CustomerReportView.tsx
import { Table, Row, Col, Alert, Typography, Switch, Space, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useDashboardStore } from '../store/dashboardStore';

const { Title, Text } = Typography;

// --- Colunas da Tabela (Seus 4 Atributos) ---
const columns = [
  {
    title: 'Nome do Cliente',
    dataIndex: 'nome_cliente',
    key: 'nome_cliente',
    sorter: (a: any, b: any) => a.nome_cliente.localeCompare(b.nome_cliente),
  },
  {
    title: 'Contato (Telefone/Email)',
    dataIndex: 'contato',
    key: 'contato',
  },
  {
    title: 'Total de Compras',
    dataIndex: 'total_vendas',
    key: 'total_vendas',
    sorter: (a: any, b: any) => a.total_vendas - b.total_vendas,
  },
  {
    title: 'Última Compra',
    dataIndex: 'ultima_compra_data',
    key: 'ultima_compra_data',
    sorter: (a: any, b: any) => new Date(a.ultima_compra_data).getTime() - new Date(b.ultima_compra_data).getTime(),
  },
];

// --- Função para Download ---
const handleDownload = (data: any[]) => {
  if (!data) return;
  // 1. Converte JSON para CSV
  const csvHeader = "nome_cliente,contato,total_vendas,ultima_compra_data\n";
  const csvBody = data.map(row => 
    `"${row.nome_cliente}","${row.contato}",${row.total_vendas},${row.ultima_compra_data}`
  ).join("\n");
  const csvContent = csvHeader + csvBody;
  
  // 2. Cria e clica no link de download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "relatorio_clientes.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


export function CustomerReportView() {
  
  // --- 1. Pega os dados e filtros do 'store' ---
  const customerReportState = useDashboardStore((state) => state.customerReport);
  const {
    reportData,
    isLoading,
    orderByAsc,
    atRiskOnly,
  } = customerReportState;

  // Pega a ação
  const fetchCustomerReport = useDashboardStore((state) => state.fetchCustomerReport);
  const error = useDashboardStore((state) => state.error);

  // --- 2. Ações dos Switches ---
  
  // Switch 1: Mais/Menos
  const handleOrderToggle = (checked: boolean) => {
    // (checked = true -> 'Menos Compraram' -> ASC)
    fetchCustomerReport(checked, atRiskOnly); 
  };

  // Switch 2: Em Risco (3+ compras, não volta há 30d)
  const handleAtRiskToggle = (checked: boolean) => {
    // (checked = true -> 'Só Em Risco')
    fetchCustomerReport(orderByAsc, checked);
  };

  // --- 3. Renderiza a View ---
  return (
    <div style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3} style={{ marginTop: 0 }}>Relatório de Clientes</Title>
        </Col>
        <Col>
          {/* O Botão de Download (Sua Feature) */}
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(reportData || [])}
            disabled={!reportData || reportData.length === 0}
          >
            Baixar CSV
          </Button>
        </Col>
      </Row>
      
      {/* Os Filtros (Switches) */}
      <Space wrap style={{ marginBottom: 24, marginTop: 16 }}>
        <Space>
          <Text strong>Mostrar (Ordem):</Text>
          <Switch
            checkedChildren="Menos Compraram"
            unCheckedChildren="Mais Compraram"
            checked={orderByAsc}
            onChange={handleOrderToggle}
            loading={isLoading}
          />
        </Space>
        
        <Space>
          <Text strong>Filtrar por Risco:</Text>
          <Switch
            checkedChildren="Apenas 'Em Risco'"
            unCheckedChildren="Todos os Clientes"
            checked={atRiskOnly}
            onChange={handleAtRiskToggle}
            loading={isLoading}
          />
        </Space>
      </Space>

      {/* A Tabela */}
      {error && <Alert message="Erro" description={error} type="error" showIcon style={{marginBottom: 16}} />}
      
      <Table
        loading={isLoading}
        columns={columns}
        dataSource={reportData || []}
        rowKey="contato" // (Usa o ID do cliente como chave)
        pagination={{ pageSize: 15 }}
      />
    </div>
  );
}