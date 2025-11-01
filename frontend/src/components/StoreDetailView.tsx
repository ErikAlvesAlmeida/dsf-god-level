import { Button, Col, Row, Skeleton, Typography, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

// --- 1. Imports Chave ---
import { useDashboardStore } from '../store/dashboardStore';
import { KpiCards } from './KpiCards'; 
import { DataDisplay } from './DataDisplay'; 
// Importamos os tipos para "reempacotar" os dados
import type { ReportData } from '../types/analytics';

const { Title } = Typography;

export function StoreDetailView() {
  // --- MUDANÇA: Usar um seletor otimizado com 'shallow' ---
  const selectedStore = useDashboardStore((state) => state.selectedStore);
  const storeDetailData = useDashboardStore((state) => state.storeDetailData);
  const isLoadingDetail = useDashboardStore((state) => state.isLoadingDetail);
  const showGlobalView = useDashboardStore((state) => state.showGlobalView);
  const error = useDashboardStore((state) => state.error);

  // --- 3. Lógica de Loading, Erro, e Vazio ---
  if (isLoadingDetail) {
    // Mostra um "esqueleto" grande enquanto busca os 3 relatórios
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (error || !storeDetailData) {
    return (
      <Alert 
        message="Erro ao carregar dados" 
        description={error || 'Não foi possível carregar os dados detalhados da loja.'} 
        type="error" 
        showIcon 
      />
    );
  }

  // --- 4. Pega os dados (já buscados) ---
  const { kpis, monthlySales, topProducts } = storeDetailData;

  // --- 5. "Re-empacota" os dados para os componentes reutilizáveis ---
  
  // O DataDisplay espera um objeto 'ReportData'.
  // Criamos um "pacote" falso para o Faturamento Mensal.
  const monthlyReport: ReportData = {
    title: 'Faturamento Mensal',
    data: monthlySales || [],
    context: 'sales_by_month' // Para o DataDisplay saber como desenhar (gráfico de barras/linha)
  };
  
  // Criamos um "pacote" falso para os Top Produtos.
  const productReport: ReportData = {
    title: 'Top 20 Produtos',
    data: topProducts || [],
    context: 'top_products' // Para o DataDisplay saber como desenhar (gráfico de barras)
  };

  // --- 6. Renderiza a página! ---
  // ...
  return (
    <div>
      <Button 
        type="link" 
        icon={<ArrowLeftOutlined />} 
        onClick={showGlobalView}
        style={{ padding: 0, marginBottom: 16 }}
      >
        Voltar para a Visão Geral
      </Button>

      <Title level={2} style={{ marginTop: 0 }}>
        Dashboard da Loja: {selectedStore}
      </Title>
      
      {/* Passa os KPIs da loja e o loading DE DETALHE */}
      <KpiCards kpiData={kpis} isLoading={isLoadingDetail} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          {/* MUDANÇA: Passa o 'reportData' E o 'isLoading' e 'error' 
            (Usamos 'false' e 'null' porque a página inteira já esperou o loading)
          */}
          {monthlySales && 
            <DataDisplay 
              reportData={monthlyReport} 
              isLoading={false}
              error={null} 
            />
          }
        </Col>
        <Col xs={24} lg={12}>
          {/* MUDANÇA: Mesma coisa aqui */}
          {topProducts && 
            <DataDisplay 
              reportData={productReport} 
              isLoading={false}
              error={null}
            />
          }
        </Col>
      </Row>
    </div>
  );
}