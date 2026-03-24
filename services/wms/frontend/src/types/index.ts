export type ShipmentSummary = {
  id: number
  shipToFcCode: string
  mode: string
  status: string
  cartonCount: number
  palletCount: number
  pieceCount: number
  grossWeightLb: number
  bolNumber?: string
}

export type Appointment = {
  id: number
  shipmentId: number
  doorId?: string
  scheduledStart?: string
  scheduledEnd?: string
  status: string
}
