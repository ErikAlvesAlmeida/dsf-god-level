import { Alert, Spin, Table, Typography, Tabs } from 'antd';
import { useState, useEffect } from 'react';
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
  onChartClick?: (type: string, value: string, context?: Record<string, any>) => void,
  averageLineValue?: number,
  isMobile?: boolean
){
  const { data, context, store_name } = response;

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
    const daysRaw = [...new Set(data.map((d: any) => d.data_venda))].sort();
    const channels = [...new Set(data.map((d: any) => d.channel_name))];

    const daysFormatted = daysRaw.map(dateStr => {
      const dateOnly = dateStr.split('T')[0];
      const parts = dateOnly.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return dateStr;
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

    return {
      color: COLOR_PALETTE,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        confine: true, // Mantém tooltip dentro do gráfico em mobile
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
      legend: { 
        data: channels, 
        top: 30,
        type: isMobile ? 'scroll' : 'plain', // Scroll em mobile
        orient: isMobile ? 'horizontal' : 'horizontal',
      },
      grid: { 
        left: isMobile ? '5%' : '3%', 
        right: isMobile ? '5%' : '4%', 
        bottom: isMobile ? '15%' : '10%', 
        top: isMobile ? '25%' : '20%',
        containLabel: true 
      },
      toolbox: { feature: { saveAsImage: { title: 'Salvar Imagem' } } },
      xAxis: { 
        type: 'category', 
        data: daysFormatted,
        axisLabel: {
          interval: isMobile ? 'auto' : 0,
          rotate: isMobile ? 45 : 30,
          fontSize: isMobile ? 10 : 12,
        }
      },
      yAxis: { 
        type: 'value', 
        axisLabel: { 
          formatter: (val: number) => formatValue(val, 'faturamento'),
          fontSize: isMobile ? 10 : 12,
        } 
      },
      series: series,
      dataZoom: [ 
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100, show: !isMobile, height: isMobile ? 20 : 30 } 
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
      confine: true,
      formatter: (params: any[]) => {
        const param = params[0];
        const dimension = param.axisValueLabel;
        const value = param.value;
        return `${dimension}<br /><strong>${formatValue(value, metricKey)}</strong>`;
      }
    },
    legend: { data: [metricKey] },
    grid: { 
      left: isMobile ? '5%' : '3%', 
      right: isMobile ? '5%' : '4%', 
      bottom: isMobile ? '15%' : '3%', 
      containLabel: true 
    },
    toolbox: { feature: { saveAsImage: { title: 'Salvar' } } },
    xAxis: {
      type: 'category',
      data: chartData.map((row: any) => row[dimensionKey]),
      axisLabel: {
        rotate: isMobile ? 45 : 0,
        fontSize: isMobile ? 10 : 12,
        interval: isMobile ? 'auto' : 0,
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: { 
        formatter: (value: number) => formatValue(value, metricKey),
        fontSize: isMobile ? 10 : 12,
      }
    },
    series: [
      {
        name: metricKey,
        type: 'bar',
        data: chartData.map((row: any) => row[metricKey]),
        colorBy: 'data',
        markLine: averageLineValue ? {
          silent: true,
          data: [{
            yAxis: averageLineValue,
            name: 'Média Geral',
            lineStyle: {
              color: '#cf1322',
              type: 'dashed'
            },
            label: {
              formatter: `Média: ${averageLineValue.toFixed(2)} min`,
              position: 'insideEndTop',
              fontSize: isMobile ? 10 : 12,
            }
          }]
        } : undefined
      },
    ],
    dataZoom: [ 
      { type: 'inside', start: 0, end: 100 }, 
      { type: 'slider', start: 0, end: 100, show: !isMobile, height: isMobile ? 20 : 30 } 
    ],
    onEvents: {
      'click': (params: any) => {
        if (context === 'top_products_by_revenue' || 
            context === 'sales_by_payment_type' ||
            context === 'top_products' ||
            context === 'worst_products_by_revenue' || 
            context === 'delivery_by_neighborhood') 
        {
          return;
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
    title: { 
      text: `Distribuição por ${dimensionKey}`, 
      left: 'center',
      textStyle: {
        fontSize: isMobile ? 14 : 18,
      }
    },
    tooltip: { 
      trigger: 'item',
      confine: true,
      formatter: (param: any) => {
        const { name, value, percent } = param;
        return `${name}<br /><strong>${formatValue(value, metricKey)}</strong> (${percent}%)`;
      }
    },
    legend: { 
      orient: isMobile ? 'horizontal' : 'vertical', 
      left: isMobile ? 'center' : 'left',
      top: isMobile ? 'bottom' : 'middle',
      type: 'scroll',
      textStyle: {
        fontSize: isMobile ? 10 : 12,
      }
    },
    toolbox: { feature: { saveAsImage: { title: 'Salvar' } } },
    series: [
      {
        name: metricKey,
        type: 'pie',
        radius: isMobile ? '45%' : '50%',
        center: isMobile ? ['50%', '45%'] : ['50%', '50%'],
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
        },
        label: {
          fontSize: isMobile ? 10 : 12,
        }
      }
    ],
    onEvents: {
      'click': (params: any) => {
        if (context === 'top_products_by_revenue' || 
            context === 'sales_by_payment_type' || 
            context === 'top_products' || 
            context === 'worst_products_by_revenue' ||
            context === 'delivery_by_neighborhood') 
        {
          return;
        }
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

interface DataDisplayProps {
  reportData: ReportData | null;
  isLoading: boolean;
  error: string | null;
  onChartClick?: (type: string, value: string, context?: Record<string, any>) => void; 
  averageLineValue?: number;
}

export function DataDisplay({ reportData, isLoading, error, onChartClick, averageLineValue }: DataDisplayProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    return (
       <div className="content-card">
         <Alert message="Nenhum dado para exibir" description="Selecione um relatório no menu ao lado." type="info" />
       </div>
    );
  }

  const columns = Object.keys(reportData.data[0]).map((key) => ({
    title: key.replace(/_/g, ' ').toUpperCase(),
    dataIndex: key,
    key: key,
    width: isMobile ? 120 : 'auto',
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
  
  const chartOption = getChartOptions(reportData, onChartClick, averageLineValue, isMobile);

  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: reportData.context === 'daily_stacked_histogram' ? 'Gráfico Diário' : 'Gráfico',
      disabled: !chartOption, 
      children: chartOption ? (
        <ReactECharts
          echarts={echarts}
          option={chartOption}
          style={{ height: isMobile ? '350px' : '400px', width: '100%' }}
          notMerge={true}
          onEvents={(chartOption as any)?.onEvents}
        />
      ) : <Alert type="info" message="Não foi possível gerar um gráfico para esta combinação de dados." />,
    },
    {
      key: '2',
      label: 'Tabela',
      children: (
        <Table
          columns={columns}
          dataSource={reportData.data}
          rowKey={(_, index) => `row-${index}`}
          bordered
          size={isMobile ? "small" : "middle"}
          pagination={{ 
            pageSize: isMobile ? 5 : 10,
            simple: isMobile,
            showSizeChanger: !isMobile,
          }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
  ];

  return (
    <div className="content-card">
      <Title level={3} style={{ marginTop: 0, fontSize: isMobile ? '18px' : '24px' }}>
        {reportData.title}
      </Title>
      
      <Tabs defaultActiveKey="1" items={tabItems} />
    </div>
  );
}