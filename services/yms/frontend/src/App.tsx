import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import GateLogPage from './pages/GateLogPage';
import DockDoorsPage from './pages/DockDoorsPage';
import YardMapPage from './pages/YardMapPage';
import MessagesPage from './pages/MessagesPage';
import AuditLogPage from './pages/AuditLogPage';
import DockScannerPage from './pages/DockScannerPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Scanner is full-screen, outside the main layout */}
        <Route path="/scanner" element={<DockScannerPage />} />

        {/* All other pages use the sidebar layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/gate" element={<GateLogPage />} />
          <Route path="/dock-doors" element={<DockDoorsPage />} />
          <Route path="/yard" element={<YardMapPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
