import { Alert, Spin, Table, Typography, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { useDashboardStore, type ReportData } from '../store/dashboardStore';
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
  onDrilldownClick: (type: 'by_month' | 'by_store', value: string, context?: Record<string, any>) => void// O 'dispatcher' que o clique vai chamar
) {
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
    // 1. Transformar os dados (Pivot)
    const days = [...new Set(data.map((d: any) => d.data_venda))].sort();
    const channels = [...new Set(data.map((d: any) => d.channel_name))];
    
    const series = channels.map(channel => ({
      name: channel,
      type: 'bar',
      stack: 'total', // Isso é o que "empilha" as barras
      emphasis: { focus: 'series' },
      data: days.map(day => {
        const entry = data.find((d: any) => d.data_venda === day && d.channel_name === channel);
        return entry ? entry.faturamento : 0;
      })
    }));

    // 2. Retornar a opção do Histograma Empilhado
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
      legend: { data: channels, top: 30 }, // Joga a legenda para baixo do título
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      toolbox: { feature: { saveAsImage: { title: 'Salvar Imagem' } } },
      xAxis: { type: 'category', data: days },
      yAxis: { type: 'value', axisLabel: { formatter: (val: number) => formatValue(val, 'faturamento') } },
      series: series,
    };
  }

  // --- Lógica Antiga (Gráficos Genéricos) ---
  const dimensionKey = Object.keys(data[0]).find(k => !k.includes('faturamento') && !k.includes('total_vendas') && !k.includes('ticket_medio') && !k.includes('tempo_medio_min') && !k.includes('total_entregas'));
  const metricKey = Object.keys(data[0]).find(k => k.includes('faturamento') || k.includes('total_vendas') || k.includes('ticket_medio') || k.includes('tempo_medio_min'));

  if (!dimensionKey || !metricKey) {
    return null;
  }
  
  const chartData = data.slice(0, 15);
  
  const barOption = {
    color: COLOR_PALETTE,
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
        const currentContext = { store_name: store_name };
        // 'params.name' é o valor do eixo X (ex: "2025-05")
        if (dimensionKey === 'mes_ano') { 
          onDrilldownClick('by_month', params.name, currentContext); 
        } else if (dimensionKey === 'store_name') {
          onDrilldownClick('by_store', params.name, {}); // Começa um novo contexto de loja
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
        data: chartData.map((row: any) => ({
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
        const currentContext = { store_name: store_name };
        if (dimensionKey === 'mes_ano') { 
          onDrilldownClick('by_month', params.name, currentContext);
        } else if (dimensionKey === 'store_name') {
          onDrilldownClick('by_store', params.name, {});
        }
      }
    }
  };
  
  if (data.length <= 7) {
    return pieOption;
  }
  return barOption;
}


export function DataDisplay() {
  const { reportData, isLoading, error, fetchDrilldownReport } = useDashboardStore();

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
  
  if (!reportData || reportData.data.length === 0) {
    return <Alert message="Nenhum dado para exibir" description="Selecione um relatório no menu ao lado." type="info" />;
  }

  const columns = Object.keys(reportData.data[0]).map((key) => ({
    title: key.replace(/_/g, ' ').toUpperCase(),
    dataIndex: key,
    key: key,
    sorter: (a: any, b: any) => {
        if (typeof a[key] === 'number' && typeof b[key] === 'number') {
            return a[key] - b[key];
        }
        if (typeof a[key] === 'string' && typeof b[key] === 'string') {
            return a[key].localeCompare(b[key]);
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
  
  const chartOption = getChartOptions(reportData, fetchDrilldownReport); // Passa o novo objeto

  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: 'Gráfico',
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