interface TimelineMilestone {
  code: string;
  occurredAt: string;
  facilityId?: string;
  notes?: string;
}

interface TimelineViewProps {
  milestones: TimelineMilestone[];
  currentStatus: string;
}

function formatMilestoneCode(code: string): string {
  return code
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(ts: string): string {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TimelineView({
  milestones,
  currentStatus,
}: TimelineViewProps) {
  if (milestones.length === 0) {
    return (
      <div className="text-cl-muted text-sm p-4">No milestones recorded.</div>
    );
  }

  // Determine which milestones are "completed" (have occurredAt) vs future
  const lastCompletedIndex = milestones.reduce((acc, m, i) => {
    return m.occurredAt ? i : acc;
  }, -1);

  return (
    <div className="relative pl-2">
      {milestones.map((milestone, idx) => {
        const isCompleted = idx <= lastCompletedIndex && !!milestone.occurredAt;
        const isCurrent = idx === lastCompletedIndex;
        const isFuture = !isCompleted;

        let dotClasses = '';
        let lineClasses = '';

        if (isCompleted && !isCurrent) {
          dotClasses = 'bg-cl-success border-cl-success';
          lineClasses = 'bg-cl-success';
        } else if (isCurrent) {
          dotClasses = 'bg-cl-accent border-cl-accent animate-pulse';
          lineClasses = 'bg-cl-panel';
        } else {
          dotClasses = 'bg-cl-panel border-cl-panel';
          lineClasses = 'bg-cl-panel';
        }

        return (
          <div key={idx} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Vertical line */}
            {idx < milestones.length - 1 && (
              <div
                className={`absolute left-[11px] top-6 w-0.5 h-full ${lineClasses}`}
              />
            )}

            {/* Dot */}
            <div className="relative z-10 flex-shrink-0 mt-0.5">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${dotClasses}`}
              >
                {isCompleted && !isCurrent && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Content */}
            <div className={`min-w-0 ${isFuture ? 'opacity-40' : ''}`}>
              <p
                className={`text-sm font-semibold ${
                  isCurrent ? 'text-cl-accent' : 'text-slate-200'
                }`}
              >
                {formatMilestoneCode(milestone.code)}
                {isCurrent && (
                  <span className="ml-2 text-xs font-normal text-cl-accent">
                    ({currentStatus})
                  </span>
                )}
              </p>
              <p className="text-xs text-cl-muted mt-0.5">
                {milestone.occurredAt
                  ? formatTimestamp(milestone.occurredAt)
                  : 'Pending'}
              </p>
              {milestone.facilityId && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Facility: {milestone.facilityId}
                </p>
              )}
              {milestone.notes && (
                <p className="text-xs text-slate-500 mt-1 italic">
                  {milestone.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
