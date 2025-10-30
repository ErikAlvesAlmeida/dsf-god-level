import { Menu } from 'antd';
import { 
  AreaChartOutlined, 
  ShopOutlined, 
  AppstoreOutlined, 
  ShoppingOutlined, 
  DollarOutlined, 
  EnvironmentOutlined 
} from '@ant-design/icons';
import { useDashboardStore } from '../store/dashboardStore';

// Mapeamento das chaves do menu para os endpoints e títulos
const reportMap: Record<string, { endpoint: string, title: string, params?: Record<string, any> }> = {
  'kpi_summary': { endpoint: '/reports/kpi_summary', title: 'Resumo de KPIs' },
  'sales_by_store': { endpoint: '/reports/sales_by_store', title: 'Vendas por Loja' },
  'sales_by_channel': { endpoint: '/reports/sales_by_channel', title: 'Vendas por Canal' },
  'sales_by_month': { endpoint: '/reports/sales_by_month', title: 'Vendas por Mês (Linha do Tempo)' },
  'top_products': { endpoint: '/reports/top_products_by_revenue', title: 'Top 20 Produtos por Faturamento' },
  'payment_types': { endpoint: '/reports/sales_by_payment_type', title: 'Vendas por Forma de Pagamento' },
  'delivery_performance_worst': { 
    endpoint: '/reports/delivery_by_neighborhood', 
    title: 'Top 20 Piores Entregas por Bairro', 
    params: { order_by_asc: false } 
  },
  'delivery_performance_best': { 
    endpoint: '/reports/delivery_by_neighborhood', 
    title: 'Top 20 Melhores Entregas por Bairro', 
    params: { order_by_asc: true } 
  },
};

export function DashboardMenu() {
  // Conecta ao nosso novo store
  const fetchReport = useDashboardStore((state) => state.fetchReport);

  const handleClick = (e: { key: string }) => {
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
    >
      <Menu.Item key="sales_by_store" icon={<ShopOutlined />}>
        Vendas por Loja
      </Menu.Item>
      <Menu.Item key="sales_by_channel" icon={<AppstoreOutlined />}>
        Vendas por Canal
      </Menu.Item>
      <Menu.Item key="sales_by_month" icon={<AreaChartOutlined />}>
        Faturamento por Mês
      </Menu.Item>
      <Menu.Item key="top_products" icon={<ShoppingOutlined />}>
        Top Produtos
      </Menu.Item>
      <Menu.Item key="payment_types" icon={<DollarOutlined />}>
        Formas de Pagamento
      </Menu.Item>
      <Menu.Item key="delivery_performance_worst" icon={<EnvironmentOutlined />}>
        Piores Entregas
      </Menu.Item>
      <Menu.Item key="delivery_performance_best" icon={<EnvironmentOutlined />}>
        Melhores Entregas
      </Menu.Item>
      
      {/* TODO: Adicionar os outros relatórios do seu roadmap... */}
      
    </Menu>
  );
}