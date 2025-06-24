import { createRoot } from 'react-dom/client'
import AppLayout from './layouts/AppLayout.jsx';
import './index.css'
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import AccountManagePage from './pages/AccountManagePage.jsx';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AuthenticationPage from './pages/AuthenticationPage.jsx';

import HouseManagePage from './pages/HouseManagePage.jsx';
import GuestManagePage from './pages/GuestManagePage.jsx';


createRoot(document.getElementById('root')).render(
  <MantineProvider>
    <Notifications position="top-right" zIndex={2000} />
    <BrowserRouter>
      <Routes>
        <Route path="/dang-nhap" element={<AuthenticationPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route path="quan-ly-khach" element={
            <GuestManagePage />

          } />
          <Route path="quan-ly-tai-khoan" element={
            <AccountManagePage />
          } />
          <Route path="quan-ly-nha" element={<HouseManagePage />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </MantineProvider>
)
