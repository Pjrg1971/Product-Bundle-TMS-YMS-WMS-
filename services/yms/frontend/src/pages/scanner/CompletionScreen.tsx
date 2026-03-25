interface CompletionScreenProps {
  mode: 'receive' | 'load-out';
  trailer: string;
  door: string;
  palletCount: number;
  damageCount: number;
  onNewSession: () => void;
}

export default function CompletionScreen({
  mode,
  trailer,
  door,
  palletCount,
  damageCount,
  onNewSession,
}: CompletionScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      {/* Success Icon */}
      <div className="w-24 h-24 rounded-full bg-cl-success/20 flex items-center justify-center mb-6">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-cl-success">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold text-cl-text mb-2">Session Complete</h2>
      <p className="text-cl-text-secondary mb-8">
        {mode === 'receive' ? 'Receiving' : 'Load out'} session has been successfully recorded.
      </p>

      {/* Summary */}
      <div className="bg-cl-dark border border-cl-panel rounded-2xl p-6 w-full max-w-sm mb-8">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-cl-muted">Mode</span>
            <span className="text-cl-text font-medium capitalize">{mode === 'load-out' ? 'Load Out' : 'Receive'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cl-muted">Trailer</span>
            <span className="text-cl-text font-medium">{trailer}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cl-muted">Door</span>
            <span className="text-cl-text font-medium">#{door}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cl-muted">Pallets Scanned</span>
            <span className="text-cl-text font-medium">{palletCount}</span>
          </div>
          {damageCount > 0 && (
            <div className="flex justify-between">
              <span className="text-cl-muted">Damages Reported</span>
              <span className="text-cl-danger font-medium">{damageCount}</span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onNewSession}
        className="min-h-[56px] w-full max-w-sm bg-cl-accent text-white text-lg font-bold rounded-xl hover:bg-cl-accent/90 transition-colors"
      >
        New Session
      </button>
    </div>
  );
}
