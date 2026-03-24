import { Link, Route, Routes } from 'react-router-dom'

import { AppLayout } from './layouts/AppLayout'
import { AmazonCompliancePage } from './pages/AmazonCompliancePage'
import { DockControlTowerPage } from './pages/DockControlTowerPage'
import { PlannerWorkbenchPage } from './pages/PlannerWorkbenchPage'
import { ShipmentDetailPage } from './pages/ShipmentDetailPage'

const nav = [
  { to: '/', label: 'Planner Workbench' },
  { to: '/shipments/1', label: 'Shipment Detail' },
  { to: '/dock', label: 'Dock Control Tower' },
  { to: '/amazon', label: 'Amazon Compliance' },
]

export default function App() {
  return (
    <AppLayout
      sidebar={
        <nav>
          <h2>WMS Platform</h2>
          {nav.map((item) => (
            <Link key={item.to} className="nav-link" to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      }
    >
      <Routes>
        <Route path="/" element={<PlannerWorkbenchPage />} />
        <Route path="/shipments/:shipmentId" element={<ShipmentDetailPage />} />
        <Route path="/dock" element={<DockControlTowerPage />} />
        <Route path="/amazon" element={<AmazonCompliancePage />} />
      </Routes>
    </AppLayout>
  )
}
