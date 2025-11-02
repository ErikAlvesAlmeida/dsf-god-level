import { Card, Col, Row, Statistic, Skeleton } from 'antd';
import type { KpiData } from '../types/analytics';

// (Helpers de formatação)
const formatCurrency = (value: number) => 
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

// O componente agora define uma interface para suas 'Props' ---
interface KpiCardsProps {
  kpiData: KpiData | null;
  isLoading: boolean;
}

// O componente agora RECEBE 'kpiData' e 'isLoading' ---
export function KpiCards({ kpiData, isLoading }: KpiCardsProps) {

  // 1. Estado de Carregamento (lê da prop 'isLoading')
  if (isLoading) {
    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
        <Col xs={24} sm={12} md={6}><Skeleton active paragraph={{ rows: 2 }} /></Col>
      </Row>
    );
  }

  // 2. Estado de Erro ou Vazio (lê da prop 'kpiData')
  if (!kpiData) {
    // Não renderiza nada se não houver dados
    return null;
  }
  
  // 3. Estado de Sucesso (lê da prop 'kpiData')
  // (O HTML/JSX abaixo é exatamente o mesmo que você já tinha)
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
            title="Total de Descontos (Custo)"
            value={formatCurrency(kpiData.total_descontos)}
            precision={2}
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
    </Row>
  );
}