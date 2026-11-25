import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { NX_SPRINGS } from '../../design/tokens';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useWorkspace();
  const prefersReduced = useReducedMotion();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 right-4 z-50 flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-xs pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const toneBorder =
            toast.tone === 'success'
              ? 'border-emerald-400/40'
              : toast.tone === 'warning'
                ? 'border-amber-400/40'
                : toast.tone === 'error'
                  ? 'border-rose-400/40'
                  : 'border-cyan-400/30';

          const toneLabel =
            toast.tone === 'success'
              ? 'text-emerald-700 dark:text-emerald-300'
              : toast.tone === 'warning'
                ? 'text-amber-700 dark:text-amber-300'
                : toast.tone === 'error'
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-slate-950 dark:text-slate-50';

          return (
            <motion.div
              key={toast.id}
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
              transition={prefersReduced ? { duration: 0 } : NX_SPRINGS.snappy}
              className={`pointer-events-auto flex items-start justify-between gap-3 rounded-2xl nx-glass-elevated border ${toneBorder} px-4 py-3`}
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium ${toneLabel}`}>{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="min-h-[28px] min-w-[28px] -mr-1 -mt-0.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
