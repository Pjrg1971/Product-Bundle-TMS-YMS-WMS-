interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const colorMap: Record<string, string> = {
  'On Site': 'bg-cl-accent/20 text-cl-accent',
  occupied: 'bg-cl-accent/20 text-cl-accent',
  ACTIVE: 'bg-cl-accent/20 text-cl-accent',
  Departed: 'bg-cl-surface/40 text-cl-text-secondary',
  CLOSED: 'bg-cl-surface/40 text-cl-text-secondary',
  available: 'bg-cl-success/20 text-cl-success',
  empty: 'bg-cl-success/20 text-cl-success',
  maintenance: 'bg-cl-warning/20 text-cl-warning',
  DELAYED: 'bg-cl-warning/20 text-cl-warning',
  Inbound: 'bg-cl-info/20 text-cl-info',
  Outbound: 'bg-purple-500/20 text-purple-400',
};

const defaultColor = 'bg-cl-surface/40 text-cl-text-secondary';

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = colorMap[status] ?? defaultColor;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colors} ${sizeClasses}`}>
      {status}
    </span>
  );
}
