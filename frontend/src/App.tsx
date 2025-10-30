import { ConfigProvider, Layout } from 'antd';
import { DashboardMenu } from './components/DashboardMenu';
import { DataDisplay } from './components/DataDisplay';
import { KpiCards } from './components/KpiCards';

const { Header, Content, Sider } = Layout;

function App() {
  return (
    <ConfigProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ color: 'white' }}>
          Dashboard de Analytics - Restaurantes
        </Header>
        
        <Layout>
          <Sider width={300} theme="light" style={{ padding: 0 }}>
            <DashboardMenu />
          </Sider>

          <Content style={{ padding: 24, margin: 0, backgroundColor: '#f0f2f5' }}>
            <KpiCards />
            <DataDisplay />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;