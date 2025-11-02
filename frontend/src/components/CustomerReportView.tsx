import { Table, Row, Col, Alert, Typography, Switch, Space, Button } from 'antd';
import { useState, useEffect } from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import { useDashboardStore } from '../store/dashboardStore';

const { Title, Text } = Typography;

// Colunas da Tabela
const getColumns = (isMobile: boolean) => [
  {
    title: 'Nome do Cliente',
    dataIndex: 'nome_cliente',
    key: 'nome_cliente',
    width: isMobile ? 150 : 'auto',
    sorter: (a: any, b: any) => a.nome_cliente.localeCompare(b.nome_cliente),
    ellipsis: isMobile,
  },
  {
    title: 'Contato',
    dataIndex: 'contato',
    key: 'contato',
    width: isMobile ? 150 : 'auto',
    ellipsis: isMobile,
  },
  {
    title: 'Compras',
    dataIndex: 'total_vendas',
    key: 'total_vendas',
    width: isMobile ? 80 : 'auto',
    sorter: (a: any, b: any) => a.total_vendas - b.total_vendas,
  },
  {
    title: 'Última Compra',
    dataIndex: 'ultima_compra_data',
    key: 'ultima_compra_data',
    width: isMobile ? 110 : 'auto',
    sorter: (a: any, b: any) => new Date(a.ultima_compra_data).getTime() - new Date(b.ultima_compra_data).getTime(),
  },
];

// Função para Download
const handleDownload = (data: any[]) => {
  if (!data) return;
  const csvHeader = "nome_cliente,contato,total_vendas,ultima_compra_data\n";
  const csvBody = data.map(row => 
    `"${row.nome_cliente}","${row.contato}",${row.total_vendas},${row.ultima_compra_data}`
  ).join("\n");
  const csvContent = csvHeader + csvBody;
  
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const customerReportState = useDashboardStore((state) => state.customerReport);
  const {
    reportData,
    isLoading,
    orderByAsc,
    atRiskOnly,
  } = customerReportState;

  const fetchCustomerReport = useDashboardStore((state) => state.fetchCustomerReport);
  const error = useDashboardStore((state) => state.error);

  // Switch 1: Mais/Menos
  const handleOrderToggle = (checked: boolean) => {
    fetchCustomerReport(checked, atRiskOnly); 
  };

  // Switch 2: Em Risco
  const handleAtRiskToggle = (checked: boolean) => {
    fetchCustomerReport(orderByAsc, checked);
  };

  return (
    <div className="content-card">
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Title level={3} style={{ marginTop: 0, fontSize: isMobile ? '18px' : '24px' }}>
            Relatório de Clientes
          </Title>
        </Col>
        <Col xs={24} sm={12} style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(reportData || [])}
            disabled={!reportData || reportData.length === 0}
            block={isMobile}
          >
            Baixar CSV
          </Button>
        </Col>
      </Row>
      
      {/* Filtros (Switches) */}
      <Space 
        direction={isMobile ? "vertical" : "horizontal"} 
        wrap 
        style={{ marginBottom: 24, marginTop: 16, width: '100%' }}
      >
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: isMobile ? '13px' : '14px' }}>
            Mostrar (Ordem):
          </Text>
          <Switch
            checkedChildren="Menos Compraram"
            unCheckedChildren="Mais Compraram"
            checked={orderByAsc}
            onChange={handleOrderToggle}
            loading={isLoading}
          />
        </Space>
        
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: isMobile ? '13px' : '14px' }}>
            Filtrar por Risco:
          </Text>
          <Switch
            checkedChildren="Apenas 'Em Risco'"
            unCheckedChildren="Todos os Clientes"
            checked={atRiskOnly}
            onChange={handleAtRiskToggle}
            loading={isLoading}
          />
        </Space>
      </Space>

      {/* Alert de erro */}
      {error && (
        <Alert 
          message="Erro" 
          description={error} 
          type="error" 
          showIcon 
          style={{marginBottom: 16}} 
        />
      )}
      
      {/* Tabela */}
      <Table
        loading={isLoading}
        columns={getColumns(isMobile)}
        dataSource={reportData || []}
        rowKey="contato"
        pagination={{ 
          pageSize: isMobile ? 10 : 15,
          simple: isMobile,
          showSizeChanger: !isMobile,
        }}
        scroll={{ x: 'max-content' }}
        size={isMobile ? "small" : "middle"}
      />
    </div>
  );
}