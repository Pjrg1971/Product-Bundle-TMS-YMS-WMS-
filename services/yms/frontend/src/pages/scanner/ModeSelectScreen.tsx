interface ModeSelectScreenProps {
  onSelect: (mode: 'receive' | 'load-out') => void;
}

export default function ModeSelectScreen({ onSelect }: ModeSelectScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
      <h2 className="text-2xl font-bold text-cl-text text-center">Select Mode</h2>
      <p className="text-cl-text-secondary text-center text-sm max-w-xs">
        Choose the type of dock operation to begin.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md mt-4">
        <button
          onClick={() => onSelect('receive')}
          className="bg-cl-dark border-2 border-cl-info/40 hover:border-cl-info rounded-2xl p-8 text-center transition-all group"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cl-info/20 flex items-center justify-center group-hover:bg-cl-info/30 transition-colors">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-cl-info">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <p className="text-lg font-bold text-cl-text">Receive</p>
          <p className="text-xs text-cl-muted mt-1">Inbound trailer inspection</p>
        </button>

        <button
          onClick={() => onSelect('load-out')}
          className="bg-cl-dark border-2 border-purple-500/40 hover:border-purple-500 rounded-2xl p-8 text-center transition-all group"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-purple-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-lg font-bold text-cl-text">Load Out</p>
          <p className="text-xs text-cl-muted mt-1">Outbound loading verification</p>
        </button>
      </div>
    </div>
  );
}
