// src/components/DataDisplay.tsx

import { Alert, Spin, Table, Typography, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { useQueryStore } from '../store/queryStore';

// 1. Importe o ECharts
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

// 2. Registre os componentes do ECharts
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

// --- MUDANÇA 1: Definindo um palette de cores melhor ---
const COLOR_PALETTE = ['#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE', '#3BA272', '#FC8452'];


// --- Função Helper para construir o gráfico ---
function getChartOptions(response: any) {
  const { data } = response;
  
  const dimensionKey = Object.keys(data[0]).find(k => !k.includes('faturamento') && !k.includes('total_vendas') && !k.includes('ticket_medio') && !k.includes('tempo_entrega_min'));
  const metricKey = Object.keys(data[0]).find(k => k.includes('faturamento') || k.includes('total_vendas') || k.includes('ticket_medio') || k.includes('tempo_entrega_min'));

  if (!dimensionKey || !metricKey) {
    return null;
  }
  
  // --- MUDANÇA 2: "Fatiar" os dados para exibir apenas o "Top 15" no gráfico ---
  // A query já vem ordenada (LIMIT 100, ORDER BY ... DESC),
  // então só precisamos pegar os 15 primeiros para o gráfico.
  const chartData = data.slice(0, 15);
  
  // Helper para formatar os valores (ex: 12.3456 -> "R$ 12,35")
  const formatValue = (value: any, key: string) => {
    if (typeof value !== 'number') return value;
    
    if (key.includes('faturamento') || key.includes('ticket_medio')) {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (key.includes('tempo_entrega_min')) {
       return `${value.toFixed(2)} min`;
    }
     // --- MUDANÇA 3: Formatação de decimais genérica ---
    if (!Number.isInteger(value)) {
      return value.toFixed(2);
    }
    return value;
  };


  // --- Opção 1: Gráfico de Barras (agora com Top 15) ---
  const barOption = {
    // --- MUDANÇA 1 (Cores) ---
    color: COLOR_PALETTE,
    
    tooltip: { 
      trigger: 'axis',
      // --- MUDANÇA 3 (Decimais no Tooltip) ---
      formatter: (params: any[]) => {
        const param = params[0];
        const dimension = param.axisValueLabel;
        const value = param.value;
        return `${dimension}<br /><strong>${formatValue(value, metricKey)}</strong>`;
      }
    },
    legend: { data: [metricKey] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    toolbox: {
      feature: {
        saveAsImage: { title: 'Salvar Imagem' }
      }
    },
    xAxis: {
      type: 'category',
      data: chartData.map((row: any) => row[dimensionKey]), // Usando chartData
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        // --- MUDANÇA 3 (Decimais no Eixo Y) ---
        formatter: (value: number) => formatValue(value, metricKey)
      }
    },
    series: [
      {
        name: metricKey,
        type: 'bar',
        data: chartData.map((row: any) => row[metricKey]), // Usando chartData
        colorBy: 'data'
      },
    ],
    dataZoom: [ 
      { type: 'inside', start: 0, end: 100 }, // O zoom agora é mais útil
      { type: 'slider', start: 0, end: 100 }
    ]
  };

  // --- Opção 2: Gráfico de Pizza ---
  const pieOption = {
    color: COLOR_PALETTE, // --- MUDANÇA 1 (Cores) ---
    title: {
      text: `Distribuição por ${dimensionKey}`,
      left: 'center'
    },
    tooltip: { 
      trigger: 'item',
      // --- MUDANÇA 3 (Decimais no Tooltip) ---
      formatter: (param: any) => {
        const { name, value, percent } = param;
        return `${name}<br /><strong>${formatValue(value, metricKey)}</strong> (${percent}%)`;
      }
    },
    legend: { orient: 'vertical', left: 'left' },
    toolbox: {
      feature: {
        saveAsImage: { title: 'Salvar Imagem' }
      }
    },
    series: [
      {
        name: metricKey,
        type: 'pie',
        radius: '50%',
        data: chartData.map((row: any) => ({ // Usando chartData
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
    ]
  };
  
  if (data.length <= 7) {
    return pieOption;
  }
  return barOption;
}
// --- Fim da Função Helper ---


export function DataDisplay() {
  const { response, isLoading, error } = useQueryStore();

  if (isLoading) {
    return <Spin tip="Carregando dados..." size="large" style={{ display: 'block', marginTop: 50 }} />;
  }
  if (error) {
    return <Alert message="Erro ao consultar API" description={error} type="error" showIcon />;
  }
  if (!response || response.data.length === 0) {
    return <Alert message="Nenhum dado para exibir" description="Rode uma consulta para ver os resultados aqui." type="info" />;
  }

  // --- MUDANÇA 3 (Decimais na Tabela) ---
  const columns = Object.keys(response.data[0]).map((key) => ({
    title: key.replace(/_/g, ' ').toUpperCase(),
    dataIndex: key,
    key: key,
    // Sorter para a tabela
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
        // Força 2 casas decimais em QUALQUER float
        if (!Number.isInteger(value)) {
          return value.toFixed(2);
        }
      }
      return value;
    },
  }));
  
  const chartOption = getChartOptions(response);

  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: 'Gráfico (Top 15)', // --- MUDANÇA 2 (Label) ---
      disabled: !chartOption, 
      children: chartOption ? (
        <ReactECharts
          echarts={echarts}
          option={chartOption}
          style={{ height: '400px', width: '100%' }}
          notMerge={true}
        />
      ) : <Alert type="info" message="Não foi possível gerar um gráfico para esta combinação de dados." />,
    },
    {
      key: '2',
      label: 'Tabela de Dados (Completa)', // --- MUDANÇA 2 (Label) ---
      children: (
        <Table
          columns={columns}
          dataSource={response.data} // A tabela continua com TODOS os dados
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
    <div>
      <Title level={4}>Resultados</Title>
      
      <Tabs defaultActiveKey="1" items={tabItems} />
      
      <Alert
        type="info"
        message="Query SQL Executada"
        description={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{response.query_sql}</pre>}
        style={{ marginTop: 16 }}
      />
    </div>
  );
}