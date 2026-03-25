import { useState } from 'react';
import ScannerFooter from './ScannerFooter';

interface PalletScanScreenProps {
  expectedCount: number;
  onBack: () => void;
  onContinue: (scanned: string[]) => void;
}

export default function PalletScanScreen({ expectedCount, onBack, onContinue }: PalletScanScreenProps) {
  const [scannedItems, setScannedItems] = useState<string[]>([]);

  const handleScan = () => {
    const id = `PLT-${String(scannedItems.length + 1).padStart(4, '0')}`;
    setScannedItems((prev) => [...prev, id]);
  };

  return (
    <>
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-cl-text mb-2">Pallet Scanning</h2>
        <p className="text-cl-text-secondary text-sm mb-6">Scan each pallet as it is loaded or unloaded.</p>

        {/* Counter */}
        <div className="bg-cl-dark border border-cl-panel rounded-2xl p-8 text-center mb-6 max-w-md">
          <p className="text-6xl font-bold text-cl-accent">{scannedItems.length}</p>
          <p className="text-cl-muted text-sm mt-2">
            of {expectedCount} expected pallets
          </p>
          <div className="w-full bg-cl-panel rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="bg-cl-accent h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (scannedItems.length / expectedCount) * 100)}%` }}
            />
          </div>
        </div>

        {/* Scan Button */}
        <button
          onClick={handleScan}
          className="w-full max-w-md min-h-[56px] bg-cl-accent text-white text-lg font-bold rounded-xl hover:bg-cl-accent/90 transition-colors mb-6"
        >
          Scan Pallet
        </button>

        {/* Scanned List */}
        {scannedItems.length > 0 && (
          <div className="max-w-md">
            <h3 className="text-sm font-semibold text-cl-text mb-3">Scanned Items</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...scannedItems].reverse().map((item, idx) => (
                <div
                  key={item}
                  className="flex items-center justify-between bg-cl-dark border border-cl-panel rounded-lg px-4 py-2.5"
                >
                  <span className="text-sm font-mono text-cl-text">{item}</span>
                  <span className="text-xs text-cl-muted">#{scannedItems.length - idx}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ScannerFooter
        onBack={onBack}
        onPrimary={() => onContinue(scannedItems)}
        primaryLabel="Continue"
        primaryDisabled={scannedItems.length === 0}
      />
    </>
  );
}
