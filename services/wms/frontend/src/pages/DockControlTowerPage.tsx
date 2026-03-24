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
    <div className="grid">
      <div className="section-header">
        <div>
          <h1>Dock Control Tower</h1>
          <p>Door scheduling, trailer readiness, and outbound lane cadence to Amazon FCs.</p>
        </div>
        <span className="badge">Operations</span>
      </div>

      <div className="grid grid-2">
        <KpiCard label="Scheduled appointments" value={appointments.length} />
        <KpiCard label="Ready-to-ship loads" value={Math.max(appointments.length - 1, 0)} />
      </div>

      <div className="card">
        <h2>Appointments</h2>
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
  )
}
