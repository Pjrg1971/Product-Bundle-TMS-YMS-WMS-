import { useEffect, useState } from 'react'

import { apiClient } from '../api/client'
import { DataTable } from '../components/DataTable'
import { KpiCard } from '../components/KpiCard'

export function PlannerWorkbenchPage() {
  const [plans, setPlans] = useState<any[]>([])

  useEffect(() => {
    apiClient.listShipmentPlans().then(setPlans).catch(() => setPlans([]))
  }, [])

  return (
    <div className="grid">
      <div className="section-header">
        <div>
          <h1>Planner Workbench</h1>
          <p>Build Amazon FC replenishment plans by lane, mode, and requested ship date.</p>
        </div>
        <span className="badge">MVP Scaffold</span>
      </div>

      <div className="grid grid-2">
        <KpiCard label="Open shipment plans" value={plans.length} helper="Draft + created plans" />
        <KpiCard label="Mode recommendation" value="LTL" helper="Based on current thresholds" />
      </div>

      <div className="card">
        <h2>Shipment plans</h2>
        <DataTable
          rows={plans}
          columns={[
            { key: 'id', header: 'Plan ID', render: (row) => row.id },
            { key: 'source', header: 'Source', render: (row) => row.source_facility },
            { key: 'destination', header: 'Amazon FC', render: (row) => row.destination_fc },
            { key: 'mode', header: 'Mode', render: (row) => row.ship_mode },
            { key: 'status', header: 'Status', render: (row) => row.status },
            { key: 'shipDate', header: 'Requested ship date', render: (row) => row.requested_ship_date || '---' },
          ]}
        />
      </div>
    </div>
  )
}
