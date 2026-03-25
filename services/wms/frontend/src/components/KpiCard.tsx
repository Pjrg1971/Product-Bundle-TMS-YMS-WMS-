type Props = {
  label: string
  value: string | number
  helper?: string
}

export function KpiCard({ label, value, helper }: Props) {
  return (
    <div className="bg-cl-dark border border-cl-panel rounded-xl p-5">
      <div className="text-cl-muted text-sm font-medium uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold text-cl-text mt-1">{value}</div>
      {helper ? <div className="text-cl-text-secondary text-sm mt-1">{helper}</div> : null}
    </div>
  )
}
