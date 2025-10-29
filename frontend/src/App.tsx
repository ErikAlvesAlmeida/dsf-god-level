import { ConfigProvider, Layout, Divider } from 'antd';
import { QueryBuilder } from './components/QueryBuilder';
import { DataDisplay } from './components/DataDisplay';

const { Header, Content, Sider } = Layout;

function App() {
  return (
    // ConfigProvider aplica o tema do Ant Design
    <ConfigProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ color: 'white' }}>
          Dashboard de Analytics - Restaurantes
        </Header>
        
        <Layout>
          <Sider width={350} theme="light" style={{ padding: 24, borderRight: '1px solid #f0f0f0' }}>
            <QueryBuilder />
          </Sider>

          <Content style={{ padding: 24, margin: 0 }}>
            <DataDisplay />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;