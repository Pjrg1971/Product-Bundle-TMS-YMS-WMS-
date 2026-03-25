import { useState } from 'react';
import ScannerFooter from './ScannerFooter';

const INSPECTION_ITEMS = [
  { id: 'floor', label: 'Floor condition acceptable' },
  { id: 'walls', label: 'Walls intact, no damage' },
  { id: 'roof', label: 'Roof intact, no leaks' },
  { id: 'odor', label: 'No unusual odors' },
  { id: 'debris', label: 'No debris or contamination' },
];

interface PreLoadScreenProps {
  onBack: () => void;
  onContinue: () => void;
}

export default function PreLoadScreen({ onBack, onContinue }: PreLoadScreenProps) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const allChecked = INSPECTION_ITEMS.every((item) => checks[item.id]);

  const toggle = (id: string) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <div className="flex-1 px-6 py-8">
        <h2 className="text-2xl font-bold text-cl-text mb-2">Pre-Load Verification</h2>
        <p className="text-cl-text-secondary text-sm mb-8">Verify trailer condition before loading/unloading.</p>

        <div className="space-y-3 max-w-md">
          {INSPECTION_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                checks[item.id]
                  ? 'bg-cl-success/10 border-cl-success/40'
                  : 'bg-cl-dark border-cl-panel hover:border-cl-surface'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  checks[item.id] ? 'bg-cl-success text-white' : 'bg-cl-panel'
                }`}
              >
                {checks[item.id] && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm font-medium ${checks[item.id] ? 'text-cl-text' : 'text-cl-text-secondary'}`}>
                {item.label}
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
