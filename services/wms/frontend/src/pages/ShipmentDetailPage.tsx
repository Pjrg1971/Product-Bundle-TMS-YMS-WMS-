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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cl-text">Shipment Detail</h1>
          <p className="text-cl-text-secondary mt-1">Shipment execution, BOL status, tracking, dock status, and Amazon sync state.</p>
        </div>
        <span className="inline-block ml-2 px-2 py-0.5 rounded-full bg-cl-accent/15 text-cl-accent text-xs font-semibold">Shipment #{shipmentId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-cl-dark border border-cl-panel rounded-xl p-5">
          <h2 className="text-lg font-semibold text-cl-text mb-4">Header</h2>
          <p className="mb-2"><span className="text-cl-muted">Amazon FC:</span> <span className="text-cl-text">{shipment?.ship_to_fc_code ?? '---'}</span></p>
          <p className="mb-2"><span className="text-cl-muted">Mode:</span> <span className="text-cl-text">{shipment?.mode ?? '---'}</span></p>
          <p className="mb-2"><span className="text-cl-muted">Status:</span> <span className="text-cl-text">{shipment?.status ?? '---'}</span></p>
          <p className="mb-2"><span className="text-cl-muted">BOL:</span> <span className="text-cl-text">{shipment?.bol_number ?? '---'}</span></p>
          <p className="mb-2"><span className="text-cl-muted">PRO:</span> <span className="text-cl-text">{shipment?.pro_number ?? '---'}</span></p>
        </div>
        <div className="bg-cl-dark border border-cl-panel rounded-xl p-5">
          <h2 className="text-lg font-semibold text-cl-text mb-4">Load profile</h2>
          <p className="mb-2"><span className="text-cl-muted">Cartons:</span> <span className="text-cl-text">{shipment?.carton_count ?? 0}</span></p>
          <p className="mb-2"><span className="text-cl-muted">Pallets:</span> <span className="text-cl-text">{shipment?.pallet_count ?? 0}</span></p>
          <p className="mb-2"><span className="text-cl-muted">Pieces:</span> <span className="text-cl-text">{shipment?.piece_count ?? 0}</span></p>
          <p className="mb-2"><span className="text-cl-muted">Gross weight:</span> <span className="text-cl-text">{shipment?.gross_weight_lb ?? 0} lb</span></p>
        </div>
      </div>
    </div>
  )
}
