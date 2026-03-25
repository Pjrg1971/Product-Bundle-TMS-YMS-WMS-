import { Link, Route, Routes, useLocation } from 'react-router-dom'

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
  const location = useLocation()

  return (
    <AppLayout
      sidebar={
        <nav>
          <h2 className="text-lg font-bold text-cl-text mb-6">WMS Platform</h2>
          {nav.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                className={`block text-cl-text-secondary no-underline px-3 py-2.5 rounded-lg mb-1 transition-colors hover:bg-white/[0.06] hover:text-cl-text ${
                  isActive ? 'bg-cl-accent/10 text-cl-accent' : ''
                }`}
                to={item.to}
              >
                {item.label}
              </Link>
            )
          })}
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
