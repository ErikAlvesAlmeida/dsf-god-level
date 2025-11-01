import { ConfigProvider, Layout } from 'antd';
import { useEffect } from 'react';
import { useDashboardStore } from './store/dashboardStore';
import { DashboardMenu } from './components/DashboardMenu';
import { DataDisplay } from './components/DataDisplay';
import { KpiCards } from './components/KpiCards';
import { StoreDetailView } from './components/StoreDetailView';

const { Header, Content, Sider } = Layout;

function App() {
  // --- MUDANÇA 2: Dividir os seletores ---
  // A UI (o 'roteador') só precisa saber da 'currentView'
  const currentView = useDashboardStore((state) => state.currentView);
  
  // Dados da Visão Global
  const kpiData = useDashboardStore((state) => state.kpiData);
  const isLoadingKpis = useDashboardStore((state) => state.isLoadingKpis);
  const reportData = useDashboardStore((state) => state.reportData);
  const isLoading = useDashboardStore((state) => state.isLoading);
  const error = useDashboardStore((state) => state.error);

  // Ações
  const fetchKpis = useDashboardStore((state) => state.fetchKpis);
  const fetchReport = useDashboardStore((state) => state.fetchReport);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  return (
    <ConfigProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ color: 'white' }}>
          Dashboard de Analytics - Restaurantes
        </Header>
        <Layout>
          <Sider width={300} theme="light" style={{ padding: 0 }}>
            <DashboardMenu />
          </Sider>
          <Content style={{ padding: 24, margin: 0, backgroundColor: '#f0f2f5' }}>
            {currentView === 'global' ? (
              <>
                <KpiCards kpiData={kpiData} isLoading={isLoadingKpis} />
                
                <DataDisplay 
                  reportData={reportData}
                  isLoading={isLoading}
                  error={error}
                />
              </>
            ) : (
              <StoreDetailView />
            )}
            
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;