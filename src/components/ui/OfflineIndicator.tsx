import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../platform/pwa';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 left-4 z-40 flex items-center gap-2 rounded-xl nx-glass-elevated border-amber-400/40 px-3.5 py-2 text-xs font-medium text-amber-800 dark:text-amber-300"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline mode · Local changes preserved</span>
    </div>
  );
};
