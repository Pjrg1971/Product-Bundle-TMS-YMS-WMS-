import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      {icon && <div className="text-cl-muted">{icon}</div>}
      <p className="text-cl-muted text-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-cl-accent text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-cl-accent/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
