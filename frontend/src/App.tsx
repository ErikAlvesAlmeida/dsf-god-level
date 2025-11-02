import { ConfigProvider, Layout } from 'antd';
import { useEffect } from 'react';
import { useDashboardStore } from './store/dashboardStore';
import { DashboardMenu } from './components/DashboardMenu';
import { DataDisplay } from './components/DataDisplay';
import { KpiCards } from './components/KpiCards';
import { VendasPorLojaView } from './components/VendasPorLojaView'; 


const { Header, Content, Sider } = Layout;

function App() {
  // (KPIs Globais)
  const kpiData = useDashboardStore((state) => state.kpiData);
  const isLoadingKpis = useDashboardStore((state) => state.isLoadingKpis);
  const fetchKpis = useDashboardStore((state) => state.fetchKpis);

  // --- Pega o estado da "Visão Global" ---
  const currentView = useDashboardStore((state) => state.currentView);
  const globalReport = useDashboardStore((state) => state.globalReport);
  const isLoadingGlobalReport = useDashboardStore((state) => state.isLoadingGlobalReport);
  const error = useDashboardStore((state) => state.error);

  // --- useEffect (Carrega SÓ os KPIs Globais) ---
  const fetchGlobalReport = useDashboardStore((state) => state.fetchGlobalReport);
  const fetchDrilldownReport = useDashboardStore((state) => state.fetchDrilldownReport);
  // --- useEffect (Carrega KPIs E o Relatório Global Padrão) ---
  useEffect(() => {
    fetchKpis();
    // Carrega "Vendas por Canal" como o relatório padrão ao abrir
    fetchGlobalReport('/reports/sales_by_channel', 'Vendas por Canal'); 
  }, [fetchKpis, fetchGlobalReport]);

  return (
    <ConfigProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ color: 'white' }}>
          Dashboard de Analytics - Restaurantes
        </Header>
        <Layout>
          <Sider width={300} theme="light" style={{ padding: 0 }}>
            {/* O Menu vai controlar qual "Visão" mostrar */}
            <DashboardMenu />
          </Sider>
          <Content style={{ padding: 24, margin: 0, backgroundColor: '#f0f2f5' }}>
            
            {/* KPIs Globais (Sempre aparecem) */}
            <KpiCards kpiData={kpiData} isLoading={isLoadingKpis} />
            {currentView === 'funil_loja' ? (
              // Visão 1: O seu "Funil de Vendas por Loja"
              <VendasPorLojaView />
            ) : (
              // Visão 2: O "Relatório Global" (Vendas por Canal, etc.)
              <DataDisplay 
                reportData={globalReport}
                isLoading={isLoadingGlobalReport}
                error={error}
                onChartClick={fetchDrilldownReport}
                averageLineValue={
                  globalReport?.context === 'delivery_by_neighborhood' 
                    ? kpiData?.avg_tempo_entrega_min 
                    : undefined
                }
              />
            )}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;