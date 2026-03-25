import { Routes, Route, Navigate, Link } from 'react-router-dom';
import ShipmentDetail from './pages/ShipmentDetail';

function ShipmentsPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">Shipments</h1>
      <p className="text-cl-muted text-sm">Select a shipment to view details.</p>
      <Link
        to="/shipments/SHP-001"
        className="text-cl-accent hover:text-cl-accent/80 text-sm font-medium"
      >
        View Shipment SHP-001
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-cl-navy">
      <div className="max-w-7xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/shipments" replace />} />
          <Route path="/shipments" element={<ShipmentsPage />} />
          <Route path="/shipments/:id" element={<ShipmentDetail />} />
        </Routes>
      </div>
    </div>
  );
}
