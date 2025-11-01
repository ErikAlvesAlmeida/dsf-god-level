// src/components/VendasPorLojaView.tsx
import { Select, Col, Row, Typography, Alert, Spin } from 'antd';
import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
// Nós vamos REUTILIZAR o DataDisplay para mostrar os gráficos
import { DataDisplay } from './DataDisplay'; 

const { Title } = Typography;

export function VendasPorLojaView() {
  
  // --- 1. Pega TODO o estado do "funil" do store ---
  // (Usamos 'shallow' aqui porque estamos pegando um objeto 'vendasPorLoja' inteiro.
  // Isso é seguro e mata o loop.)
  // --- 1. Pega TODO o estado do "funil" do store (DO JEITO CERTO) ---
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
  } = vendasPorLojaState; // <-- Pega o "módulo" inteiro de forma segura

  // --- 2. Pega as AÇÕES (seletores individuais são 100% seguros) ---
  const fetchStoreList = useDashboardStore((state) => state.fetchStoreList);
  const fetchMonthlyReportForStore = useDashboardStore((state) => state.fetchMonthlyReportForStore);
  const fetchDetailReportsForMonth = useDashboardStore((state) => state.fetchDetailReportsForMonth);
  const error = useDashboardStore((state) => state.error);

  // --- 3. Busca a lista de lojas (o Select-box) na primeira vez ---
  useEffect(() => {
    // Só busca se a lista estiver vazia
    if (allStores.length === 0) {
      fetchStoreList();
    }
  }, [fetchStoreList, allStores.length]);

  // --- 4. Ações do Usuário (Seu Fluxo) ---

  // Ação 1: O usuário seleciona uma loja no Select-box
  const handleStoreSelect = (storeName: string) => {
    fetchMonthlyReportForStore(storeName);
  };
  
  // Ação 2: O usuário clica em um mês (será passada para o DataDisplay)
  const handleMonthClick = (type: string, value: string) => {
    // Verificamos o 'context' que o DataDisplay vai nos passar
    if (type === 'sales_by_month_for_store') {
      fetchDetailReportsForMonth(value);
    }
  };

  // --- 5. O "return" (Renderização do Funil) ---
  return (
    <div style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
      <Title level={3} style={{ marginTop: 0 }}>Vendas por Loja</Title>
      
      {/* === ETAPA 1 DO FUNIL: O Select-box === */}
      <Title level={5}>1. Selecione uma Loja</Title>
      <Select
        showSearch
        placeholder="Selecione uma loja..."
        style={{ width: '100%' }}
        loading={isLoadingStores}
        onSelect={handleStoreSelect} // Chama a Ação 1
        value={selectedStore}
        options={allStores.map(store => ({
          label: store.store_name,
          value: store.store_name,
        }))}
        filterOption={(input, option) => 
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
      />
      
      {/* === ETAPA 2 DO FUNIL: O Gráfico de Meses === */}
      {/* (Só aparece depois que o usuário selecionou uma loja) */}
      <div style={{ marginTop: 24 }}>
        {/* Mostra o loading SÓ desta parte */}
        {isLoadingMonthly && <div style={{textAlign: 'center', padding: 40}}><Spin tip="Carregando meses..." /></div>}
        
        {/* Quando os dados chegam, renderiza o DataDisplay "filho" */}
        {monthlyReport && (
          <DataDisplay
            reportData={monthlyReport}
            isLoading={false} // O 'isLoadingMonthly' é tratado acima
            error={null}
            // A "prop" que o DataDisplay ainda não sabe que existe
            onChartClick={handleMonthClick} 
          />
        )}
      </div>

      {/* === ETAPA 3 DO FUNIL: Os Gráficos de Detalhe === */}
      {/* (Só aparecem depois que o usuário clicou em um mês) */}
      <div style={{ marginTop: 24 }}>
        {isLoadingDetail && <div style={{textAlign: 'center', padding: 40}}><Spin tip="Carregando detalhes..." /></div>}
        
        {/* Quando os dados chegam, renderiza os dois DataDisplays "filhos" */}
        {productReport && channelReport && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DataDisplay
                reportData={productReport}
                isLoading={false}
                error={null}
                // (Este não precisa ser clicável, então não passamos a prop)
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
      
      {/* Mostra erros globais no final */}
      {error && <Alert message="Erro" description={error} type="error" showIcon style={{marginTop: 16}} />}
    </div>
  );
}