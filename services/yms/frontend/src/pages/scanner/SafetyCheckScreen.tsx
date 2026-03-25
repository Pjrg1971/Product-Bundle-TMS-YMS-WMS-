import { useState } from 'react';
import ScannerFooter from './ScannerFooter';

const SAFETY_ITEMS = [
  'Wheel chocks in place',
  'Dock lock engaged',
  'Trailer brakes set',
  'Landing gear secured',
  'Dock plate positioned',
  'Area clear of personnel',
];

interface SafetyCheckScreenProps {
  onBack: () => void;
  onContinue: () => void;
}

export default function SafetyCheckScreen({ onBack, onContinue }: SafetyCheckScreenProps) {
  const [checks, setChecks] = useState<boolean[]>(new Array(SAFETY_ITEMS.length).fill(false));

  const allChecked = checks.every(Boolean);

  const toggle = (idx: number) => {
    const next = [...checks];
    next[idx] = !next[idx];
    setChecks(next);
  };

  return (
    <>
      <div className="flex-1 px-6 py-8">
        <h2 className="text-2xl font-bold text-cl-text mb-2">Safety Checklist</h2>
        <p className="text-cl-text-secondary text-sm mb-8">All items must be verified before proceeding.</p>

        <div className="space-y-3 max-w-md">
          {SAFETY_ITEMS.map((item, idx) => (
            <button
              key={item}
              onClick={() => toggle(idx)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                checks[idx]
                  ? 'bg-cl-success/10 border-cl-success/40'
                  : 'bg-cl-dark border-cl-panel hover:border-cl-surface'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  checks[idx] ? 'bg-cl-success text-white' : 'bg-cl-panel'
                }`}
              >
                {checks[idx] && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm font-medium ${checks[idx] ? 'text-cl-text' : 'text-cl-text-secondary'}`}>
                {item}
              </span>
            </button>
          ))}
        </div>
      </div>

      <ScannerFooter
        onBack={onBack}
        onPrimary={onContinue}
        primaryLabel="Continue"
        primaryDisabled={!allChecked}
      />
    </>
  );
}
