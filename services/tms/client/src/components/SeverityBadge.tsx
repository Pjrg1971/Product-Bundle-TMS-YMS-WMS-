interface SeverityBadgeProps {
  severity: string;
}

function getSeverityStyles(severity: string): { bg: string; text: string; pulse: boolean } {
  switch (severity.toUpperCase()) {
    case 'LOW':
      return { bg: 'bg-blue-500/15', text: 'text-blue-400', pulse: false };
    case 'MEDIUM':
      return { bg: 'bg-yellow-500/15', text: 'text-yellow-400', pulse: false };
    case 'HIGH':
      return { bg: 'bg-orange-500/15', text: 'text-orange-400', pulse: false };
    case 'CRITICAL':
      return { bg: 'bg-red-500/15', text: 'text-red-400', pulse: true };
    default:
      return { bg: 'bg-slate-500/15', text: 'text-slate-400', pulse: false };
  }
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const styles = getSeverityStyles(severity);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-2.5 py-1 ${styles.bg} ${styles.text} ${
        styles.pulse ? 'animate-pulse' : ''
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          severity.toUpperCase() === 'CRITICAL' ? 'bg-red-400' :
          severity.toUpperCase() === 'HIGH' ? 'bg-orange-400' :
          severity.toUpperCase() === 'MEDIUM' ? 'bg-yellow-400' :
          severity.toUpperCase() === 'LOW' ? 'bg-blue-400' : 'bg-slate-400'
        }`}
      />
      {severity}
    </span>
  );
}
