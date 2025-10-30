import { Card, Col, Row, Statistic, Skeleton } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'; // (Apenas visual, sem lógica ainda)
import { useDashboardStore } from '../store/dashboardStore';

// Helper para formatar R$
const formatCurrency = (value: number) => 
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Helper para formatar números (ex: 12345 -> 12.3k)
const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

// Helper para formatar minutos
const formatMinutes = (value: number) =>
  `${value.toFixed(2)} min`;

export function KpiCards() {
  const { kpiData, isLoadingKpis } = useDashboardStore();

  // Se estiver carregando, mostra "esqueletos"
  if (isLoadingKpis || !kpiData) {
    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
      </Row>
    );
  }

  // Se carregou, mostra os cards
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Faturamento Total"
            value={formatCurrency(kpiData.faturamento_total)}
            precision={2}
            valueStyle={{ color: '#3f8600' }}
            // prefix={<ArrowUpOutlined />} // (Feature futura)
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Total de Vendas"
            value={formatNumber(kpiData.total_vendas)}
            precision={0}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Ticket Médio"
            value={formatCurrency(kpiData.ticket_medio)}
            precision={2}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Tempo Médio de Entrega"
            value={formatMinutes(kpiData.avg_tempo_entrega_min)}
            precision={2}
            valueStyle={{ color: '#cf1322' }} // Vermelho, pois tempo alto é ruim
            // prefix={<ArrowDownOutlined />} // (Feature futura: seta p/ baixo é bom)
          />
        </Card>
      </Col>
    </Row>
  );
}