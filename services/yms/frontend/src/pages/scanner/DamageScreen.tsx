import { useState } from 'react';
import ScannerFooter from './ScannerFooter';

interface DamageReport {
  type: string;
  notes: string;
}

interface DamageScreenProps {
  onBack: () => void;
  onContinue: (damages: DamageReport[]) => void;
}

const DAMAGE_TYPES = ['Crushed', 'Water Damage', 'Torn Packaging', 'Missing Items', 'Temperature Issue', 'Other'];

export default function DamageScreen({ onBack, onContinue }: DamageScreenProps) {
  const [damages, setDamages] = useState<DamageReport[]>([]);
  const [currentType, setCurrentType] = useState('');
  const [currentNotes, setCurrentNotes] = useState('');

  const addDamage = () => {
    if (!currentType) return;
    setDamages((prev) => [...prev, { type: currentType, notes: currentNotes }]);
    setCurrentType('');
    setCurrentNotes('');
  };

  const removeDamage = (idx: number) => {
    setDamages((prev) => prev.filter((_, i) => i !== idx));
  };

  const inputClass =
    'w-full bg-cl-navy border border-cl-panel rounded-xl px-4 py-3 text-sm text-cl-text placeholder:text-cl-muted focus:outline-none focus:border-cl-accent';

  return (
    <>
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-cl-text mb-2">Damage Inspection</h2>
        <p className="text-cl-text-secondary text-sm mb-8">Report any damages found during inspection.</p>

        {/* Add Damage Form */}
        <div className="space-y-3 max-w-md mb-6">
          <div>
            <label className="block text-sm text-cl-muted mb-2">Damage Type</label>
            <select
              className={inputClass}
              value={currentType}
              onChange={(e) => setCurrentType(e.target.value)}
            >
              <option value="">Select type...</option>
              {DAMAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-cl-muted mb-2">Notes</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Describe the damage..."
              value={currentNotes}
              onChange={(e) => setCurrentNotes(e.target.value)}
            />
          </div>
          <button
            onClick={addDamage}
            disabled={!currentType}
            className="w-full min-h-[48px] text-sm font-medium rounded-xl border-2 border-dashed border-cl-danger/40 text-cl-danger hover:bg-cl-danger/10 disabled:opacity-40 transition-colors"
          >
            + Add Damage Report
          </button>
        </div>

        {/* Damage List */}
        {damages.length > 0 && (
          <div className="max-w-md">
            <h3 className="text-sm font-semibold text-cl-text mb-3">Reported Damages ({damages.length})</h3>
            <div className="space-y-2">
              {damages.map((d, idx) => (
                <div key={idx} className="bg-cl-danger/10 border border-cl-danger/30 rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-cl-danger">{d.type}</p>
                      {d.notes && <p className="text-xs text-cl-text-secondary mt-0.5">{d.notes}</p>}
                    </div>
                    <button
                      onClick={() => removeDamage(idx)}
                      className="text-cl-muted hover:text-cl-danger transition-colors"
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ScannerFooter
        onBack={onBack}
        onPrimary={() => onContinue(damages)}
        primaryLabel={damages.length > 0 ? 'Continue with Damages' : 'No Damages Found'}
      />
    </>
  );
}
