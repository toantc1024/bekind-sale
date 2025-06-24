import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import GuestManagePage from './pages/GuestManagePage';
import AccountManagePage from './pages/AccountManagePage';
import HouseManagePage from './pages/HouseManagePage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Routes>
      <Route path="/dang-nhap" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/quan-ly-khach" element={<GuestManagePage />} />
        <Route path="/quan-ly-tai-khoan" element={<AccountManagePage />} />
        <Route path="/quan-ly-nha" element={<HouseManagePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/" element={<GuestManagePage />} />
      </Route>
    </Routes>
  );
}

export default App;
