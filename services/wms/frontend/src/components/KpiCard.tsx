type Props = {
  label: string
  value: string | number
  helper?: string
}

export function KpiCard({ label, value, helper }: Props) {
  return (
    <div className="card">
      <div>{label}</div>
      <div className="kpi">{value}</div>
      {helper ? <div>{helper}</div> : null}
    </div>
  )
}
