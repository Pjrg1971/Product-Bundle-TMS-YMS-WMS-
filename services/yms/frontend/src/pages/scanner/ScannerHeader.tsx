import { Link } from 'react-router-dom';

interface ScannerHeaderProps {
  currentStep: number;
  totalSteps: number;
  mode: 'receive' | 'load-out' | null;
  onBack?: () => void;
}

export default function ScannerHeader({ currentStep, totalSteps, mode, onBack }: ScannerHeaderProps) {
  return (
    <header className="bg-cl-dark border-b border-cl-panel px-4 py-3 safe-area-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button onClick={onBack} className="text-cl-text-secondary hover:text-cl-text transition-colors p-1">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          ) : (
            <Link to="/" className="text-cl-text-secondary hover:text-cl-text transition-colors p-1">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
          )}
          <h1 className="text-lg font-bold text-cl-text">Dock Scanner</h1>
        </div>
        {mode && (
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              mode === 'receive' ? 'bg-cl-info/20 text-cl-info' : 'bg-purple-500/20 text-purple-400'
            }`}
          >
            {mode === 'receive' ? 'Receive' : 'Load Out'}
          </span>
        )}
      </div>

      {/* Step indicator dots */}
      {currentStep > 0 && (
        <div className="flex items-center gap-1.5 justify-center">
          {Array.from({ length: totalSteps }, (_, i) => {
            const step = i + 1;
            let color = 'bg-cl-panel';
            if (step < currentStep) color = 'bg-cl-success';
            else if (step === currentStep) color = 'bg-cl-accent';
            return <div key={step} className={`w-2.5 h-2.5 rounded-full transition-colors ${color}`} />;
          })}
        </div>
      )}
    </header>
  );
}
