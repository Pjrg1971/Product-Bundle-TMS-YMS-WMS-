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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cl-text">Planner Workbench</h1>
          <p className="text-cl-text-secondary mt-1">Build Amazon FC replenishment plans by lane, mode, and requested ship date.</p>
        </div>
        <span className="inline-block ml-2 px-2 py-0.5 rounded-full bg-cl-accent/15 text-cl-accent text-xs font-semibold">MVP Scaffold</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Open shipment plans" value={plans.length} helper="Draft + created plans" />
        <KpiCard label="Mode recommendation" value="LTL" helper="Based on current thresholds" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-cl-dark border border-cl-panel rounded-xl p-5 col-span-full">
          <h2 className="text-lg font-semibold text-cl-text mb-4">Shipment plans</h2>
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
    </div>
  )
}
