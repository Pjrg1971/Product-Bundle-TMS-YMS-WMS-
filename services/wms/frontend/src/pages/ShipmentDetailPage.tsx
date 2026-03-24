import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { apiClient } from '../api/client'

export function ShipmentDetailPage() {
  const { shipmentId = '1' } = useParams()
  const [shipment, setShipment] = useState<any | null>(null)

  useEffect(() => {
    apiClient.getShipment(shipmentId).then(setShipment).catch(() => setShipment(null))
  }, [shipmentId])

  return (
    <div className="grid">
      <div className="section-header">
        <div>
          <h1>Shipment Detail</h1>
          <p>Shipment execution, BOL status, tracking, dock status, and Amazon sync state.</p>
        </div>
        <span className="badge">Shipment #{shipmentId}</span>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Header</h2>
          <p><strong>Amazon FC:</strong> {shipment?.ship_to_fc_code ?? '---'}</p>
          <p><strong>Mode:</strong> {shipment?.mode ?? '---'}</p>
          <p><strong>Status:</strong> {shipment?.status ?? '---'}</p>
          <p><strong>BOL:</strong> {shipment?.bol_number ?? '---'}</p>
          <p><strong>PRO:</strong> {shipment?.pro_number ?? '---'}</p>
        </div>
        <div className="card">
          <h2>Load profile</h2>
          <p><strong>Cartons:</strong> {shipment?.carton_count ?? 0}</p>
          <p><strong>Pallets:</strong> {shipment?.pallet_count ?? 0}</p>
          <p><strong>Pieces:</strong> {shipment?.piece_count ?? 0}</p>
          <p><strong>Gross weight:</strong> {shipment?.gross_weight_lb ?? 0} lb</p>
        </div>
      </div>
    </div>
  )
}
