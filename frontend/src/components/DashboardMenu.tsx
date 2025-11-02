// src/components/DashboardMenu.tsx
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { 
  AreaChartOutlined, 
  ShopOutlined, 
  AppstoreOutlined, 
  ShoppingOutlined, 
  DollarOutlined, 
  EnvironmentOutlined 
} from '@ant-design/icons';
import { useDashboardStore } from '../store/dashboardStore';

const reportMap: Record<string, { endpoint: string, title: string, params?: Record<string, any> }> = {
  'sales_by_channel': { endpoint: '/reports/sales_by_channel', title: 'Vendas por Canal (Global)' },
  'sales_by_month': { endpoint: '/reports/sales_by_month', title: 'Faturamento por Mês (Global)' },
  'top_products': { endpoint: '/reports/top_products_by_revenue', title: 'Top Produtos (Global)' },
  'payment_types': { endpoint: '/reports/sales_by_payment_type', title: 'Formas de Pagamento' },
  'delivery_performance_worst': { endpoint: '/reports/delivery_by_neighborhood', title: 'Piores Entregas', params: { order_by_asc: false } },
  'delivery_performance_best': { endpoint: '/reports/delivery_by_neighborhood', title: 'Melhores Entregas', params: { order_by_asc: true } },
};

const menuItems: MenuProps['items'] = [
  // Esta é a 'key' do Funil 
  { key: 'vendas_por_loja', icon: <ShopOutlined />, label: 'Vendas por Loja' }, 
  
  // Estas são as 'keys' dos Relatórios Globais
  { key: 'sales_by_channel', icon: <AppstoreOutlined />, label: 'Vendas por Canal' },
  { key: 'sales_by_month', icon: <AreaChartOutlined />, label: 'Faturamento por Mês' },
  { key: 'top_products', icon: <ShoppingOutlined />, label: 'Top Produtos' },
  { key: 'payment_types', icon: <DollarOutlined />, label: 'Formas de Pagamento' },
  { 
    key: 'delivery', 
    icon: <EnvironmentOutlined />, 
    label: 'Performance de Entrega',
    children: [
      { key: 'delivery_performance_worst', label: 'Piores Entregas' },
      { key: 'delivery_performance_best', label: 'Melhores Entregas' },
    ]
  },
];


export function DashboardMenu() {
  const showFunilLojaView = useDashboardStore((state) => state.showFunilLojaView);
  const fetchGlobalReport = useDashboardStore((state) => state.fetchGlobalReport);

  const handleClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'vendas_por_loja') {
      // 1. Se clicou no "Funil", chama a ação do funil
      showFunilLojaView();
      
    } else {
      // 2. Senão, busca o relatório global
      const reportInfo = reportMap[e.key];
      if (reportInfo) {
        fetchGlobalReport(reportInfo.endpoint, reportInfo.title, reportInfo.params); 
      }
    }
  };

  return (
    <Menu
      mode="inline"
      theme="light"
      onClick={handleClick}
      style={{ height: '100%', borderRight: 0 }}
      defaultSelectedKeys={['sales_by_channel']} // Começa no funil
      defaultOpenKeys={['delivery']}
      items={menuItems} 
    />
  );
}