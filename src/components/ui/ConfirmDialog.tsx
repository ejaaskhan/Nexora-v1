import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { NX_SPRINGS } from '../../design/tokens';
import { GlowButton } from './GlowButton';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0 : 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="nx-confirm-title"
          aria-describedby="nx-confirm-desc"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel();
          }}
        >
          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={prefersReduced ? { duration: 0 } : NX_SPRINGS.snappy}
            className="w-full max-w-md nx-glass-elevated rounded-2xl p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tone === 'danger'
                      ? 'bg-rose-500/12 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                      : 'bg-purple-500/12 text-purple-600 dark:text-cyan-300 border border-purple-500/25 dark:border-cyan-400/25'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="nx-confirm-title"
                    className="font-display text-base font-semibold text-slate-950 dark:text-white"
                  >
                    {title}
                  </h2>
                  <p
                    id="nx-confirm-desc"
                    className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    {description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close dialog"
                className="min-h-[40px] min-w-[40px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detail && (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-3 border-t nx-divider leading-relaxed">
                {detail}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <GlowButton variant="secondary" size="sm" onClick={onCancel}>
                {cancelLabel}
              </GlowButton>
              <GlowButton
                variant={tone === 'danger' ? 'danger' : 'primary'}
                size="sm"
                onClick={onConfirm}
              >
                {confirmLabel}
              </GlowButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
