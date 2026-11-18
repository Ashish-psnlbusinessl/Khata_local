import { DataProvider } from './context/DataContext';
import { useHashRoute } from './lib/router';
import Layout from './components/Layout';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import DailyBahi from './pages/DailyBahi';
import History from './pages/History';
import Settings from './pages/Settings';

function Shell() {
  const route = useHashRoute();
  let page;
  switch (route.name) {
    case 'bahi':
      page = <DailyBahi />;
      break;
    case 'history':
      page = <History />;
      break;
    case 'settings':
      page = <Settings />;
      break;
    default:
      page = route.id ? <CustomerDetail id={route.id} /> : <Customers />;
  }
  return <Layout route={route}>{page}</Layout>;
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
