import { Alert, Spin, Table, Typography, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { useDashboardStore } from '../store/dashboardStore';
import type { ReportData } from '../types/analytics';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 2. Registra os componentes do ECharts
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  BarChart,
  PieChart,
  CanvasRenderer,
]);

const { Title } = Typography;
const COLOR_PALETTE = ['#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE', '#3BA272', '#FC8452'];

function getChartOptions(
  response: ReportData, 
  // --- MUDANÇA 1: Simplificamos esta assinatura ---
  onDrilldownClick: (
    type: 'by_month' | 'by_channel_to_products', 
    value: string, 
    context?: Record<string, any>
  ) => void,
  // --- MUDANÇA 2: Adicionamos a nova ação para a sua visão ---
  onStoreDetailClick: (storeName: string) => void 
){
  const { data, context, store_name } = response;// 'context' é o novo campo que vem do store

  // Helper (função dentro de função)
  const formatValue = (value: any, key: string) => {
    if (typeof value !== 'number') return value;
    
    if (key.includes('faturamento') || key.includes('ticket_medio')) {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (key.includes('tempo_entrega_min')) {
       return `${value.toFixed(2)} min`;
    }
    if (!Number.isInteger(value)) {
      return value.toFixed(2);
    }
    return value;
  };

  if (context === 'daily_stacked_histogram') {
  
    // 1. Pega os dias "crus" (ex: "2025-05-01")
    const daysRaw = [...new Set(data.map((d: any) => d.data_venda))].sort();
    const channels = [...new Set(data.map((d: any) => d.channel_name))];

    // 2. Cria as legendas formatadas (ex: "01/05")
    const daysFormatted = daysRaw.map(dateStr => {
      const dateOnly = dateStr.split('T')[0]; // Resultado: "2025-05-01"
      const parts = dateOnly.split('-'); // Resultado: ["2025", "05", "01"]
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`; // "01/05"
      }
      return dateStr; // Fallback
    });
    
    // 3. O 'series' é igual ao seu código antigo
    const series = channels.map(channel => ({
      name: channel,
      type: 'bar',
      stack: 'total', 
      emphasis: { focus: 'series' },
      data: daysRaw.map(day => { 
        const entry = data.find((d: any) => d.data_venda === day && d.channel_name === channel);
        return entry ? entry.faturamento : 0;
      })
    }));

    // 4. Retorna o objeto de opções COMPLETO
    return {
      color: COLOR_PALETTE,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          let tooltip = `${params[0].axisValueLabel}<br/>`;
          let dayTotal = 0;
          params.forEach(param => {
            const value = param.value || 0;
            if (typeof value === 'number') {
              dayTotal += value;
              tooltip += `${param.marker} ${param.seriesName}: <strong>${formatValue(value, 'faturamento')}</strong><br/>`;
            }
          });
          tooltip += `<strong>Total Dia: ${formatValue(dayTotal, 'faturamento')}</strong>`;
          return tooltip;
        }
      },
      legend: { data: channels, top: 30 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      toolbox: { feature: { saveAsImage: { title: 'Salvar Imagem' } } },
      
      // --- ESTAS SÃO AS MUDANÇAS ---
      xAxis: { 
        type: 'category', 
        data: daysFormatted, // <-- Usa as datas formatadas
        axisLabel: {
          interval: 0, // Mostra todos os labels
          rotate: 30   // Rotaciona para caber
        }
      },
      yAxis: { type: 'value', axisLabel: { formatter: (val: number) => formatValue(val, 'faturamento') } },
      series: series,
      // Adiciona o DataZoom (scroll) que você pediu
      dataZoom: [ 
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100, show: true } 
      ]
      // --- FIM DAS MUDANÇAS ---
    };
  }

  const dimensionKey = Object.keys(data[0]).find(k => !k.includes('faturamento') && !k.includes('total_vendas') && !k.includes('ticket_medio') && !k.includes('tempo_medio_min') && !k.includes('total_entregas'));
  const metricKey = Object.keys(data[0]).find(k => k.includes('faturamento') || k.includes('total_vendas') || k.includes('ticket_medio') || k.includes('tempo_medio_min'));

  if (!dimensionKey || !metricKey) {
    return null;
  }
  
  const barOption = {
    color: COLOR_PALETTE,
    tooltip: { 
      trigger: 'axis',
      formatter: (params: any[]) => {
        // ... (sua lógica de 'formatter' está 100% CORRETA) ...
        const param = params[0];
        const dimension = param.axisValueLabel;
        const value = param.value;
        return `${dimension}<br /><strong>${formatValue(value, metricKey)}</strong>`;
      }
    },
    // ... (legend, grid, toolbox, xAxis, yAxis, series, dataZoom - TUDO 100% CORRETO) ...
    legend: { data: [metricKey] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    toolbox: { feature: { saveAsImage: { title: 'Salvar Imagem' } } },
    xAxis: {
      type: 'category',
      data: data.map((row: any) => row[dimensionKey]),
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => formatValue(value, metricKey) }
    },
    series: [
      {
        name: metricKey,
        type: 'bar',
        data: data.map((row: any) => row[metricKey]),
        colorBy: 'data'
      },
    ],
    dataZoom: [ { type: 'inside', start: 0, end: 100 }, { type: 'slider', start: 0, end: 100 } ],

    // --- ESTA É A MUDANÇA (LÓGICA DA FASE 10) ---
    onEvents: {
      'click': (params: any) => {
        const currentContext = { store_name: store_name };
        const clickedValue = params.name;

        // Se o relatório PAI (context) for um de Lojas...
        if (context === 'sales_by_store' || context === 'products_by_store') {
            // ...chame a nova ação de "mudar de página".
            onStoreDetailClick(clickedValue);
        }
        // Senão, use o drilldown antigo (que ficou simplificado)
        else if (dimensionKey === 'mes_ano') { 
          onDrilldownClick('by_month', clickedValue, currentContext);
        } else if (dimensionKey === 'channel_name') {
          onDrilldownClick('by_channel_to_products', clickedValue, {});
        }
      }
    }
    // --- FIM DA MUDANÇA ---
  };

// ... (cole isso depois do 'barOption = { ... };') ...

  const pieOption = {
    color: COLOR_PALETTE,
    title: { text: `Distribuição por ${dimensionKey}`, left: 'center' },
    tooltip: { 
      trigger: 'item',
      formatter: (param: any) => {
        // ... (sua lógica de 'formatter' está 100% CORRETA) ...
        const { name, value, percent } = param;
        return `${name}<br /><strong>${formatValue(value, metricKey)}</strong> (${percent}%)`;
      }
    },
    // ... (legend, toolbox, series, emphasis - TUDO 100% CORRETO) ...
    legend: { orient: 'vertical', left: 'left' },
    toolbox: { feature: { saveAsImage: { title: 'Salvar Imagem' } } },
    series: [
      {
        name: metricKey,
        type: 'pie',
        radius: '50%',
        data: data.map((row: any) => ({
          value: row[metricKey],
          name: row[dimensionKey],
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ],

    // --- ESTA É A MUDANÇA (LÓGICA DA FASE 10) ---
    onEvents: {
      'click': (params: any) => {
        const currentContext = { store_name: store_name };
        const clickedValue = params.name; // 'params.name' é o nome da fatia

        // (Exatamente a mesma lógica do 'barOption')
        
        // Se o relatório PAI (context) for um de Lojas...
        if (context === 'sales_by_store' || context === 'products_by_store') {
            // ...chame a nova ação de "mudar de página".
            onStoreDetailClick(clickedValue);
        }
        // Senão, use o drilldown antigo
        else if (dimensionKey === 'mes_ano') { 
          onDrilldownClick('by_month', clickedValue, currentContext);
        } else if (dimensionKey === 'channel_name') {
          onDrilldownClick('by_channel_to_products', clickedValue, {});
        }
      }
    }
    // --- FIM DA MUDANÇA ---
  };

// ... (cole isso depois do 'pieOption = { ... };') ...

  // (Esta parte está 100% CORRETA)
  if (data.length <= 7) {
    return pieOption;
  }
  return barOption;
}
// --- FIM DA getChartOptions ---


// --- MUDANÇA 1: Definir as Props que o componente espera ---
interface DataDisplayProps {
  reportData: ReportData | null;
  isLoading: boolean;
  error: string | null;
}

// --- MUDANÇA 2: O componente agora RECEBE props ---
export function DataDisplay({ reportData, isLoading, error }: DataDisplayProps) {

  // --- MUDANÇA 3: Pega SÓ AS AÇÕES do store ---
  const fetchDrilldownReport = useDashboardStore((state) => state.fetchDrilldownReport);
  const fetchStoreDetail = useDashboardStore((state) => state.fetchStoreDetail);

  // (O 'if (isLoading)' e 'if (error)' agora usam as props!)
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', width: '100%' }}>
        <Spin tip="Carregando dados..." size="large" />
      </div>
    );
  }
  if (error) {
    return <Alert message="Erro ao carregar relatório" description={error} type="error" showIcon />;
  }
  
  // (O 'if (!reportData)' agora usa a prop!)
  if (!reportData || reportData.data.length === 0) {
    // Vamos adicionar o wrapper aqui também para consistência
    return (
       <div style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
         <Alert message="Nenhum dado para exibir" description="Selecione um relatório no menu ao lado." type="info" />
       </div>
    );
  }

  // (A lógica de 'columns' está 100% CORRETA)
  const columns = Object.keys(reportData.data[0]).map((key) => ({
    title: key.replace(/_/g, ' ').toUpperCase(),
    dataIndex: key,
    key: key,
    
    // --- CORREÇÃO DO SORTER ---
    sorter: (a: any, b: any) => {
      const valA = a[key];
      const valB = b[key];

      if (typeof valA === 'number' && typeof valB === 'number') {
        // Substitui a[key] - b[key] por esta lógica
        if (valA > valB) return 1;
        if (valA < valB) return -1;
        return 0;
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB);
      }
      return 0;
    },
    render: (value: any) => {
      // (A sua lógica de 'render' está 100% CORRETA)
      if (typeof value === 'number') {
        if (key.includes('faturamento') || key.includes('ticket_medio')) {
          return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (!Number.isInteger(value)) {
          return value.toFixed(2);
        }
      }
      return value;
    },
  }));
  
  // --- MUDANÇA 4: Passa as DUAS ações para o getChartOptions ---
  const chartOption = getChartOptions(reportData, fetchDrilldownReport, fetchStoreDetail); 

  // --- MUDANÇA 5 (Bônus/UX): Label dinâmico para o Tab ---
  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      // O label agora é "inteligente"
      label: reportData.context === 'daily_stacked_histogram' ? 'Gráfico Diário' : 'Gráfico',
      disabled: !chartOption, 
      children: chartOption ? (
        <ReactECharts
          echarts={echarts}
          option={chartOption}
          style={{ height: '400px', width: '100%' }}
          notMerge={true}
          // A sua lógica de 'onEvents' aqui estava 100% CORRETA
          onEvents={(chartOption as any)?.onEvents}
        />
      ) : <Alert type="info" message="Não foi possível gerar um gráfico para esta combinação de dados." />,
    },
    {
      key: '2',
      label: 'Tabela de Dados (Completa)',
      children: (
        <Table
          // (Toda a sua lógica da Tabela está 100% CORRETA)
          columns={columns}
          dataSource={reportData.data}
          rowKey={(_, index) => `row-${index}`}
          bordered
          size="small"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
  ];

  // (O seu 'return' está 100% CORRETO)
  return (
    <div style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
      <Title level={3} style={{ marginTop: 0 }}>{reportData.title}</Title>
      
      <Tabs defaultActiveKey="1" items={tabItems} />
      
    </div>
  );
}