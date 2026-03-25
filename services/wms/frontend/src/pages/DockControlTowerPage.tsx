import { useEffect, useState } from 'react'

import { apiClient } from '../api/client'
import { DataTable } from '../components/DataTable'
import { KpiCard } from '../components/KpiCard'

export function DockControlTowerPage() {
  const [appointments, setAppointments] = useState<any[]>([])

  useEffect(() => {
    apiClient.listAppointments().then(setAppointments).catch(() => setAppointments([]))
  }, [])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cl-text">Dock Control Tower</h1>
          <p className="text-cl-text-secondary mt-1">Door scheduling, trailer readiness, and outbound lane cadence to Amazon FCs.</p>
        </div>
        <span className="inline-block ml-2 px-2 py-0.5 rounded-full bg-cl-accent/15 text-cl-accent text-xs font-semibold">Operations</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Scheduled appointments" value={appointments.length} />
        <KpiCard label="Ready-to-ship loads" value={Math.max(appointments.length - 1, 0)} />
      </div>

      <div className="mt-6">
        <div className="bg-cl-dark border border-cl-panel rounded-xl p-5">
          <h2 className="text-lg font-semibold text-cl-text mb-4">Appointments</h2>
          <DataTable
            rows={appointments}
            columns={[
              { key: 'id', header: 'Appointment ID', render: (row) => row.id },
              { key: 'shipmentId', header: 'Shipment ID', render: (row) => row.shipment_id },
              { key: 'doorId', header: 'Door', render: (row) => row.door_id || 'TBD' },
              { key: 'start', header: 'Start', render: (row) => row.scheduled_start || 'TBD' },
              { key: 'status', header: 'Status', render: (row) => row.status },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
