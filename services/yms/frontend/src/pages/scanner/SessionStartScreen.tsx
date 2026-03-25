import ScannerFooter from './ScannerFooter';

interface SessionStartScreenProps {
  trailer: string;
  setTrailer: (v: string) => void;
  door: string;
  setDoor: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function SessionStartScreen({
  trailer,
  setTrailer,
  door,
  setDoor,
  onBack,
  onContinue,
}: SessionStartScreenProps) {
  const inputClass =
    'w-full bg-cl-navy border border-cl-panel rounded-xl px-4 py-4 text-lg text-cl-text placeholder:text-cl-muted focus:outline-none focus:border-cl-accent';

  return (
    <>
      <div className="flex-1 px-6 py-8">
        <h2 className="text-2xl font-bold text-cl-text mb-2">Session Details</h2>
        <p className="text-cl-text-secondary text-sm mb-8">Enter the trailer and dock door number.</p>

        <div className="space-y-6 max-w-md">
          <div>
            <label className="block text-sm text-cl-muted mb-2">Trailer Number</label>
            <input
              className={inputClass}
              placeholder="e.g. TRL-1234"
              value={trailer}
              onChange={(e) => setTrailer(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-cl-muted mb-2">Door Number</label>
            <input
              className={inputClass}
              placeholder="e.g. 5"
              value={door}
              onChange={(e) => setDoor(e.target.value)}
            />
          </div>
        </div>
      </div>

      <ScannerFooter
        onBack={onBack}
        onPrimary={onContinue}
        primaryLabel="Continue"
        primaryDisabled={!trailer.trim() || !door.trim()}
      />
    </>
  );
}
