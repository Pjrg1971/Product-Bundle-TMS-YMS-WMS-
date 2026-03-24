interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

function getStatusColor(status: string): { bg: string; text: string; dot: string } {
  const s = status.toUpperCase();

  if (['DELIVERED', 'APPROVED', 'ACCEPTED', 'CLOSED', 'PAID'].includes(s)) {
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' };
  }
  if (['IN_TRANSIT', 'TRANSMITTED', 'DISPATCHED', 'ACTIVE'].includes(s)) {
    return { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' };
  }
  if (['PLANNED', 'CREATED', 'RECEIVED', 'DRAFT', 'PENDING'].includes(s)) {
    return { bg: 'bg-slate-500/15', text: 'text-slate-400', dot: 'bg-slate-400' };
  }
  if (['EXCEPTION', 'REJECTED', 'DISPUTED', 'FAILED', 'OPEN'].includes(s)) {
    return { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' };
  }
  if (['DELAYED', 'EXPIRED'].includes(s)) {
    return { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' };
  }

  return { bg: 'bg-slate-500/15', text: 'text-slate-400', dot: 'bg-slate-400' };
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = getStatusColor(status);
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${colors.bg} ${colors.text} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {formatStatus(status)}
    </span>
  );
}
