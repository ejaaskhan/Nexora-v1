import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { NX_SPRINGS } from '../../design/tokens';

interface DrawerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const DrawerModal: React.FC<DrawerModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
}) => {
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0 : 0.16 }}
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:justify-end bg-slate-950/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nexora-drawer-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 24, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={prefersReduced ? { duration: 0 } : NX_SPRINGS.smooth}
            className="w-full max-h-[90vh] md:h-full md:max-h-none md:max-w-md nx-glass-elevated rounded-t-3xl md:rounded-none md:rounded-l-2xl flex flex-col overflow-hidden pb-safe"
          >
            {/* Mobile drag handle */}
            <div className="md:hidden pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-slate-400/50 dark:bg-slate-600" />
            </div>

            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b nx-divider">
              <div className="min-w-0">
                <h2
                  id="nexora-drawer-title"
                  className="font-display text-base font-semibold text-slate-950 dark:text-slate-50 truncate"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
