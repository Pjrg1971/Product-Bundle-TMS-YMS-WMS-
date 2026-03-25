interface ScannerFooterProps {
  onBack?: () => void;
  onPrimary?: () => void;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  backLabel?: string;
}

export default function ScannerFooter({
  onBack,
  onPrimary,
  primaryLabel = 'Continue',
  primaryDisabled = false,
  backLabel = 'Back',
}: ScannerFooterProps) {
  return (
    <footer className="bg-cl-dark border-t border-cl-panel px-4 py-4 safe-area-bottom">
      <div className="flex gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 min-h-[56px] text-sm font-medium rounded-xl border border-cl-panel text-cl-text-secondary hover:bg-cl-surface/30 transition-colors"
          >
            {backLabel}
          </button>
        )}
        {onPrimary && (
          <button
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="flex-1 min-h-[56px] text-sm font-bold rounded-xl bg-cl-accent text-white hover:bg-cl-accent/90 disabled:opacity-40 transition-colors"
          >
            {primaryLabel}
          </button>
        )}
      </div>
    </footer>
  );
}
