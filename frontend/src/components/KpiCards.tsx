// src/components/KpiCards.tsx
import { Card, Col, Row, Statistic, Skeleton } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';

const formatCurrency = (value: number) => 
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const formatMinutes = (value: number) =>
  `${value.toFixed(2)} min`;


export function KpiCards() {
  const { kpiData, isLoadingKpis, error, fetchKpis } = useDashboardStore();

  useEffect(() => {
    // Busca os KPIs UMA VEZ quando o *componente* carregar
    fetchKpis();
  }, [fetchKpis]);

  // 1. Estado de Carregamento
  if (isLoadingKpis) {
    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
      </Row>
    );
  }

  // 2. Estado de Erro ou Vazio (Após o loading)
  if (error || !kpiData) {
    // Não renderiza nada se os KPIs falharam, para não poluir a UI.
    // O erro será mostrado no console (ou poderíamos adicionar um <Alert> aqui)
    return null;
  }
  
  // 3. Estado de Sucesso
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Faturamento Total"
            value={formatCurrency(kpiData.faturamento_total)}
            precision={2}
            valueStyle={{ color: '#3f8600' }}
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
          />
        </Card>
      </Col>
    </Row>
  );
}