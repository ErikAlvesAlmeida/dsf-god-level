import { Alert, Spin, Table, Typography, Tabs } from 'antd';
import type { TabsProps } from 'antd';
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
const BAR_OPTION_COLOR = ['#5b5b5bff']
const COLOR_PALETTE = ['#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE', '#3BA272', '#FC8452'];

function getChartOptions(
  response: ReportData, 
  // --- MUDANÇA: A assinatura agora é "burra" e genérica ---
  // Ela só recebe UMA função de clique (opcional) do "Pai"
  onChartClick?: (type: string, value: string, context?: Record<string, any>) => void 
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

      xAxis: { 
        type: 'category', 
        data: daysFormatted, // <-- As datas formatadas
        axisLabel: {
          interval: 0, // Mostra todos os labels
          rotate: 30   // Rotaciona para caber
        }
      },
      yAxis: { type: 'value', axisLabel: { formatter: (val: number) => formatValue(val, 'faturamento') } },
      series: series,
      // Adiciona o DataZoom (scroll)
      dataZoom: [ 
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100, show: true } 
      ]
    };
  }

  const dimensionKey = Object.keys(data[0]).find(k => !k.includes('faturamento') && !k.includes('total_vendas') && !k.includes('ticket_medio') && !k.includes('tempo_medio_min') && !k.includes('total_entregas'));
  const metricKey = Object.keys(data[0]).find(k => k.includes('faturamento') || k.includes('total_vendas') || k.includes('ticket_medio') || k.includes('tempo_medio_min'));

  if (!dimensionKey || !metricKey) {
    return null;
  }

  const chartData = data; 
  
  const barOption = {
    color: BAR_OPTION_COLOR[0],
    tooltip: { 
      trigger: 'axis',
      formatter: (params: any[]) => {
        const param = params[0];
        const dimension = param.axisValueLabel;
        const value = param.value;
        return `${dimension}<br /><strong>${formatValue(value, metricKey)}</strong>`;
      }
    },
    legend: { data: [metricKey] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    toolbox: { feature: { saveAsImage: { title: 'Salvar Imagem' } } },
    xAxis: {
      type: 'category',
      data: chartData.map((row: any) => row[dimensionKey]), 
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => formatValue(value, metricKey) }
    },
    series: [
      {
        name: metricKey,
        type: 'bar',
        data: chartData.map((row: any) => row[metricKey]),
        colorBy: 'data'
      },
    ],
    dataZoom: [ { type: 'inside', start: 0, end: 100 }, { type: 'slider', start: 0, end: 100 } ],

    onEvents: {
      'click': (params: any) => {
        if (context === 'top_products_by_revenue' || 
            context === 'sales_by_payment_type' ||
            context === 'top_products' ||
            context === 'worst_products_by_revenue' || 
            context === 'delivery_by_neighborhood') 
        {
          return; // Fim. Não faz drill-down.
        }
        if (onChartClick && context) {
          const currentContext = { store_name: store_name };
          onChartClick(context, params.name, currentContext);
        }
      }
    }
  };


  const pieOption = {
    color: COLOR_PALETTE,
    title: { text: `Distribuição por ${dimensionKey}`, left: 'center' },
    tooltip: { 
      trigger: 'item',
      formatter: (param: any) => {
        const { name, value, percent } = param;
        return `${name}<br /><strong>${formatValue(value, metricKey)}</strong> (${percent}%)`;
      }
    },
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

    onEvents: {
      'click': (params: any) => {
        // 1. Verifica se o "Pai" (VendasPorLojaView) passou a função
        if (context === 'top_products_by_revenue' || 
            context === 'sales_by_payment_type' || 
            context === 'top_products' || 
            context === 'worst_products_by_revenue' ||
            context === 'delivery_by_neighborhood') 
        {
          return; // Fim. Não faz drill-down.
        }
        console.log(context)
        if (onChartClick && context) {
          const currentContext = { store_name: store_name };
          onChartClick(context, params.name, currentContext);
        }
      }
    }
  };

  if (data.length <= 13) {
    return pieOption;
  }
  return barOption;
}

// --- Define as Props que o componente espera ---
interface DataDisplayProps {
  reportData: ReportData | null;
  isLoading: boolean;
  error: string | null;
  // A "prop" que o 'VendasPorLojaView' (o Pai) está passando
  onChartClick?: (type: string, value: string, context?: Record<string, any>) => void; 
}

// --- O componente agora RECEBE props ---
export function DataDisplay({ reportData, isLoading, error, onChartClick }: DataDisplayProps) {

  // (O 'if (isLoading)' agora usa a prop 'isLoading')
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', width: '100%' }}>
        <Spin tip="Carregando dados..." size="large" />
      </div>
    );
  }

  // (O 'if (error)' está 100% CORRETO)
  if (error) {
    return <Alert message="Erro ao carregar relatório" description={error} type="error" showIcon />;
  }

  // (O 'if (!reportData)' está 100% CORRETO)
  if (!reportData || reportData.data.length === 0) {
    // O wrapper para consistência
    return (
       <div style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
         <Alert message="Nenhum dado para exibir" description="Selecione um relatório no menu ao lado." type="info" />
       </div>
    );
  }

  const columns = Object.keys(reportData.data[0]).map((key) => ({
    title: key.replace(/_/g, ' ').toUpperCase(),
    dataIndex: key,
    key: key,
    
    // --- CORREÇÃO DO SORTER ---
    sorter: (a: any, b: any) => {
      const valA = a[key];
      const valB = b[key];

      if (typeof valA === 'number' && typeof valB === 'number') {
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
  
  const chartOption = getChartOptions(reportData, onChartClick);

  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: reportData.context === 'daily_stacked_histogram' ? 'Gráfico Diário' : 'Gráfico',
      disabled: !chartOption, 
      children: chartOption ? (
        <ReactECharts
          echarts={echarts}
          option={chartOption}
          style={{ height: '400px', width: '100%' }}
          notMerge={true}
          onEvents={(chartOption as any)?.onEvents}
        />
      ) : <Alert type="info" message="Não foi possível gerar um gráfico para esta combinação de dados." />,
    },
    {
      key: '2',
      label: 'Tabela de Dados (Completa)',
      children: (
        <Table
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

  return (
    <div style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
      <Title level={3} style={{ marginTop: 0 }}>{reportData.title}</Title>
      
      <Tabs defaultActiveKey="1" items={tabItems} />
      
    </div>
  );
}