// src/components/DashboardMenu.tsx
import { Menu } from 'antd';
import type { MenuProps } from 'antd'; // Importa o tipo
import { 
  AreaChartOutlined, 
  ShopOutlined, 
  AppstoreOutlined, 
  ShoppingOutlined, 
  DollarOutlined, 
  EnvironmentOutlined 
} from '@ant-design/icons';
import { useDashboardStore } from '../store/dashboardStore';

// Mapeamento (não muda)
const reportMap: Record<string, { endpoint: string, title: string, params?: Record<string, any> }> = {
  'sales_by_store': { endpoint: '/reports/sales_by_store', title: 'Vendas por Loja' },
  'sales_by_channel': { endpoint: '/reports/sales_by_channel', title: 'Vendas por Canal' },
  'sales_by_month': { endpoint: '/reports/sales_by_month', title: 'Faturamento por Mês' },
  'top_products': { endpoint: '/reports/top_products_by_revenue', title: 'Top Produtos' },
  'payment_types': { endpoint: '/reports/sales_by_payment_type', title: 'Formas de Pagamento' },
  'delivery_performance_worst': { endpoint: '/reports/delivery_by_neighborhood', title: 'Piores Entregas', params: { order_by_asc: false } },
  'delivery_performance_best': { endpoint: '/reports/delivery_by_neighborhood', title: 'Melhores Entregas', params: { order_by_asc: true } },
  'products_by_store': { endpoint: '/reports/sales_by_store', title: 'Produtos por Loja' },
};

// --- MUDANÇA: Definir os 'items' do menu como um array ---
type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  { key: 'sales_by_store', icon: <ShopOutlined />, label: 'Vendas por Loja' },
  { key: 'sales_by_channel', icon: <AppstoreOutlined />, label: 'Vendas por Canal' },
  { key: 'sales_by_month', icon: <AreaChartOutlined />, label: 'Faturamento por Mês' },
  { key: 'top_products', icon: <ShoppingOutlined />, label: 'Top Produtos' },
  { key: 'payment_types', icon: <DollarOutlined />, label: 'Formas de Pagamento' },
  { key: 'products_by_store', icon: <ShoppingOutlined />, label: 'Produtos por Loja' },
  // (Grupo para Entregas)
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
// --- FIM DA MUDANÇA ---


export function DashboardMenu() {
  const fetchReport = useDashboardStore((state) => state.fetchReport);

  const handleClick: MenuProps['onClick'] = (e) => { // Tipo atualizado
    const reportInfo = reportMap[e.key];
    if (reportInfo) {
      fetchReport(reportInfo.endpoint, reportInfo.title, reportInfo.params); 
    }
  };

  return (
    <Menu
      mode="inline"
      theme="light"
      onClick={handleClick}
      style={{ height: '100%', borderRight: 0 }}
      defaultSelectedKeys={['sales_by_store']}
      defaultOpenKeys={['delivery']} // Abre o sub-menu de entrega
      // --- MUDANÇA: Passa os 'items' como prop ---
      items={menuItems} 
    />
  );
}