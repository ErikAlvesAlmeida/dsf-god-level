import { Select, Col, Row, Typography, Alert, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { DataDisplay } from './DataDisplay'; 

const { Title } = Typography;

export function VendasPorLojaView() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const vendasPorLojaState = useDashboardStore((state) => state.vendasPorLoja);
  const {
    allStores,
    selectedStore,
    monthlyReport,
    productReport,
    channelReport,
    isLoadingStores,
    isLoadingMonthly,
    isLoadingDetail,
  } = vendasPorLojaState;

  const fetchStoreList = useDashboardStore((state) => state.fetchStoreList);
  const fetchMonthlyReportForStore = useDashboardStore((state) => state.fetchMonthlyReportForStore);
  const fetchDetailReportsForMonth = useDashboardStore((state) => state.fetchDetailReportsForMonth);
  const error = useDashboardStore((state) => state.error);

  useEffect(() => {
    if (allStores.length === 0) {
      fetchStoreList();
    }
  }, [fetchStoreList, allStores.length]);

  const handleStoreSelect = (storeName: string) => {
    fetchMonthlyReportForStore(storeName);
  };
  
  const handleMonthClick = (type: string, value: string) => {
    if (type === 'sales_by_month_for_store') {
      fetchDetailReportsForMonth(value);
    }
  };

  return (
    <div className="content-card">
      <Title 
        level={3} 
        style={{ marginTop: 0, fontSize: isMobile ? '18px' : '24px' }}
      >
        Vendas por Loja
      </Title>
      
      {/* ETAPA 1: Select-box */}
      <Title 
        level={5} 
        style={{ fontSize: isMobile ? '14px' : '16px' }}
      >
        1. Selecione uma Loja
      </Title>
      <Select
        showSearch
        placeholder="Selecione uma loja..."
        style={{ width: '100%' }}
        loading={isLoadingStores}
        onSelect={handleStoreSelect}
        value={selectedStore}
        options={allStores.map(store => ({
          label: store.store_name,
          value: store.store_name,
        }))}
        filterOption={(input, option) => 
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        size={isMobile ? "middle" : "large"}
      />
      
      {/* ETAPA 2: Gráfico de Meses */}
      <div style={{ marginTop: 24 }}>
        {isLoadingMonthly && (
          <div style={{textAlign: 'center', padding: isMobile ? 30 : 40}}>
            <Spin tip="Carregando meses..." size="large" />
          </div>
        )}
        
        {monthlyReport && (
          <DataDisplay
            reportData={monthlyReport}
            isLoading={false}
            error={null}
            onChartClick={handleMonthClick} 
          />
        )}
      </div>

      {/* ETAPA 3: Gráficos de Detalhe */}
      <div style={{ marginTop: 24 }}>
        {isLoadingDetail && (
          <div style={{textAlign: 'center', padding: isMobile ? 30 : 40}}>
            <Spin tip="Carregando detalhes..." size="large" />
          </div>
        )}
        
        {productReport && channelReport && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DataDisplay
                reportData={productReport}
                isLoading={false}
                error={null}
              />
            </Col>
            <Col xs={24} lg={12}>
              <DataDisplay
                reportData={channelReport}
                isLoading={false}
                error={null}
              />
            </Col>
          </Row>
        )}
      </div>
      
      {/* Erros globais */}
      {error && (
        <Alert 
          message="Erro" 
          description={error} 
          type="error" 
          showIcon 
          style={{marginTop: 16}} 
        />
      )}
    </div>
  );
}