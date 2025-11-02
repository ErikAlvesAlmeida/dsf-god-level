import { ConfigProvider, Layout, Drawer, Button } from 'antd';
import { useEffect, useState } from 'react';
import { MenuOutlined } from '@ant-design/icons';
import { useDashboardStore } from './store/dashboardStore';
import { DashboardMenu } from './components/DashboardMenu';
import { DataDisplay } from './components/DataDisplay';
import { KpiCards } from './components/KpiCards';
import { VendasPorLojaView } from './components/VendasPorLojaView'; 
import { CustomerReportView } from './components/CustomerReportView';

const { Header, Content, Sider } = Layout;

function App() {
  // Estado para controlar o drawer em mobile
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detecta mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setDrawerVisible(false); // Fecha drawer ao expandir para desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Store
  const kpiData = useDashboardStore((state) => state.kpiData);
  const isLoadingKpis = useDashboardStore((state) => state.isLoadingKpis);
  const fetchKpis = useDashboardStore((state) => state.fetchKpis);

  const currentView = useDashboardStore((state) => state.currentView);
  const globalReport = useDashboardStore((state) => state.globalReport);
  const isLoadingGlobalReport = useDashboardStore((state) => state.isLoadingGlobalReport);
  const error = useDashboardStore((state) => state.error);

  const fetchGlobalReport = useDashboardStore((state) => state.fetchGlobalReport);
  const fetchDrilldownReport = useDashboardStore((state) => state.fetchDrilldownReport);

  useEffect(() => {
    fetchKpis();
    fetchGlobalReport('/reports/sales_by_channel', 'Vendas por Canal'); 
  }, [fetchKpis, fetchGlobalReport]);

  // Função para fechar drawer após clicar em item do menu
  const handleMenuClick = () => {
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  return (
    <ConfigProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ 
          color: 'white', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 24px'
        }}>
          <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
            Dashboard de Analytics - Restaurantes
          </span>
          {isMobile && (
            <Button 
              type="text" 
              icon={<MenuOutlined style={{ fontSize: '20px', color: 'white' }} />}
              onClick={() => setDrawerVisible(true)}
            />
          )}
        </Header>
        
        <Layout>
          {/* Menu Desktop (Sider normal) */}
          {!isMobile && (
            <Sider width={300} theme="light" style={{ padding: 0 }}>
              <DashboardMenu />
            </Sider>
          )}

          {/* Menu Mobile (Drawer) */}
          {isMobile && (
            <Drawer
              title="Menu"
              placement="left"
              onClose={() => setDrawerVisible(false)}
              open={drawerVisible}
              width={280}
              bodyStyle={{ padding: 0 }}
            >
              <div onClick={handleMenuClick}>
                <DashboardMenu />
              </div>
            </Drawer>
          )}

          <Content style={{ 
            padding: isMobile ? 12 : 24, 
            margin: 0, 
            backgroundColor: '#f0f2f5' 
          }}>
            {/* KPIs Globais */}
            <KpiCards kpiData={kpiData} isLoading={isLoadingKpis} />
            
            {currentView === 'funil_loja' ? (
              <VendasPorLojaView />
            ) : currentView === 'relatorio_clientes' ? (
              <CustomerReportView />
            ) : (
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