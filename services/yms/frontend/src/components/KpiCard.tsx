interface KpiCardProps {
  label: string;
  value: string | number;
  helper?: string;
  trend?: 'up' | 'down';
  trendColor?: string;
}

export default function KpiCard({ label, value, helper, trend, trendColor }: KpiCardProps) {
  return (
    <div className="bg-cl-dark border border-cl-panel rounded-xl p-6">
      <p className="text-cl-muted text-sm font-medium uppercase tracking-wide">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-3xl font-bold text-cl-text">{value}</p>
        {trend && (
          <span className={`text-sm font-medium ${trendColor ?? (trend === 'up' ? 'text-cl-success' : 'text-cl-danger')}`}>
            {trend === 'up' ? '\u2191' : '\u2193'}
          </span>
        )}
      </div>
      {helper && <p className="text-cl-text-secondary text-sm mt-1">{helper}</p>}
    </div>
  );
}
