import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../platform/pwa';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'rail' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'sidebar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          Installed on device
        </span>
      );
    }
    return null;
  }

  if (isInstallable) {
    if (variant === 'rail') {
      return (
        <button
          type="button"
          onClick={() => void install()}
          aria-label="Install NEXORA"
          title="Install NEXORA"
          className="min-h-[44px] min-w-[44px] rounded-xl nx-glow-button text-white flex items-center justify-center"
        >
          <Download className="w-4 h-4" />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'sidebar'
            ? 'w-full min-h-[40px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium nx-glow-button text-white border border-white/15 whitespace-nowrap shrink-0'
            : 'min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium nx-glow-button text-white border border-white/15 whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install NEXORA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install NEXORA on iOS"
          title="Install on iOS"
          className={
            variant === 'rail'
              ? 'min-h-[44px] min-w-[44px] rounded-xl nx-glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-cyan-400/50'
              : variant === 'sidebar'
                ? 'w-full min-h-[40px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium nx-glass text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 whitespace-nowrap shrink-0'
                : 'min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium nx-glass text-slate-800 dark:text-slate-100 hover:border-cyan-400/50 whitespace-nowrap shrink-0'
          }
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          {variant !== 'rail' && <span>Install on iOS</span>}
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
          >
            <div className="w-full max-w-sm rounded-2xl nx-glass-elevated p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                  Install NEXORA on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close instructions"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
                <li>Tap the Share button in the Safari browser toolbar.</li>
                <li>Scroll down and choose Add to Home Screen.</li>
                <li>Confirm NEXORA to launch in standalone full-screen mode.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl nx-glow-button text-white text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (variant === 'settings') {
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Use your browser menu to install or add to home screen
      </span>
    );
  }

  return null;
};
