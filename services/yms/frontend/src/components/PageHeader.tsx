interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  action?: { label: string; onClick: () => void };
}

export default function PageHeader({ title, description, badge, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-cl-text">{title}</h1>
          {badge && (
            <span className="text-xs bg-cl-accent/20 text-cl-accent px-2.5 py-0.5 rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-cl-text-secondary mt-1">{description}</p>}
      </div>
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
