import { useState } from 'react';
import ScannerHeader from './scanner/ScannerHeader';
import ModeSelectScreen from './scanner/ModeSelectScreen';
import SessionStartScreen from './scanner/SessionStartScreen';
import SafetyCheckScreen from './scanner/SafetyCheckScreen';
import PreLoadScreen from './scanner/PreLoadScreen';
import PalletScanScreen from './scanner/PalletScanScreen';
import DamageScreen from './scanner/DamageScreen';
import SignOffScreen from './scanner/SignOffScreen';
import CompletionScreen from './scanner/CompletionScreen';

type Step =
  | 'mode-select'
  | 'session-start'
  | 'safety-check'
  | 'pre-load'
  | 'pallet-scan'
  | 'damage'
  | 'sign-off'
  | 'completion';

function getStepNumber(step: Step, mode: 'receive' | 'load-out' | null): number {
  const receiveSteps: Step[] = ['session-start', 'safety-check', 'pre-load', 'pallet-scan', 'damage', 'sign-off'];
  const loadOutSteps: Step[] = ['session-start', 'safety-check', 'pre-load', 'pallet-scan', 'sign-off'];
  const steps = mode === 'receive' ? receiveSteps : loadOutSteps;
  const idx = steps.indexOf(step);
  return idx >= 0 ? idx + 1 : 0;
}

function getTotalSteps(mode: 'receive' | 'load-out' | null): number {
  return mode === 'receive' ? 6 : 5;
}

export default function DockScannerPage() {
  const [step, setStep] = useState<Step>('mode-select');
  const [mode, setMode] = useState<'receive' | 'load-out' | null>(null);
  const [trailer, setTrailer] = useState('');
  const [door, setDoor] = useState('');
  const [scannedPallets, setScannedPallets] = useState<string[]>([]);
  const [damageCount, setDamageCount] = useState(0);

  const reset = () => {
    setStep('mode-select');
    setMode(null);
    setTrailer('');
    setDoor('');
    setScannedPallets([]);
    setDamageCount(0);
  };

  const goBack = () => {
    switch (step) {
      case 'session-start':
        setStep('mode-select');
        setMode(null);
        break;
      case 'safety-check':
        setStep('session-start');
        break;
      case 'pre-load':
        setStep('safety-check');
        break;
      case 'pallet-scan':
        setStep('pre-load');
        break;
      case 'damage':
        setStep('pallet-scan');
        break;
      case 'sign-off':
        setStep(mode === 'receive' ? 'damage' : 'pallet-scan');
        break;
      default:
        break;
    }
  };

  const renderScreen = () => {
    switch (step) {
      case 'mode-select':
        return (
          <ModeSelectScreen
            onSelect={(m) => {
              setMode(m);
              setStep('session-start');
            }}
          />
        );

      case 'session-start':
        return (
          <SessionStartScreen
            trailer={trailer}
            setTrailer={setTrailer}
            door={door}
            setDoor={setDoor}
            onBack={goBack}
            onContinue={() => setStep('safety-check')}
          />
        );

      case 'safety-check':
        return <SafetyCheckScreen onBack={goBack} onContinue={() => setStep('pre-load')} />;

      case 'pre-load':
        return <PreLoadScreen onBack={goBack} onContinue={() => setStep('pallet-scan')} />;

      case 'pallet-scan':
        return (
          <PalletScanScreen
            expectedCount={24}
            onBack={goBack}
            onContinue={(pallets) => {
              setScannedPallets(pallets);
              setStep(mode === 'receive' ? 'damage' : 'sign-off');
            }}
          />
        );

      case 'damage':
        return (
          <DamageScreen
            onBack={goBack}
            onContinue={(damages) => {
              setDamageCount(damages.length);
              setStep('sign-off');
            }}
          />
        );

      case 'sign-off':
        return <SignOffScreen onBack={goBack} onContinue={() => setStep('completion')} />;

      case 'completion':
        return (
          <CompletionScreen
            mode={mode!}
            trailer={trailer}
            door={door}
            palletCount={scannedPallets.length}
            damageCount={damageCount}
            onNewSession={reset}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-cl-navy">
      <ScannerHeader
        currentStep={getStepNumber(step, mode)}
        totalSteps={getTotalSteps(mode)}
        mode={mode}
        onBack={step !== 'mode-select' && step !== 'completion' ? goBack : undefined}
      />
      {renderScreen()}
    </div>
  );
}
