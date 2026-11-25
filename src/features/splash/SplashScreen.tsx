import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 1450);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onComplete();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      onClick={onComplete}
      role="status"
      aria-label="Loading NEXORA"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center nx-ambient-backdrop cursor-pointer select-none px-6"
    >
      <div className="relative flex flex-col items-center">
        {/* Soft ambient purple-to-cyan bloom */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.65 }}
          animate={{ opacity: 0.72, scale: 1.15 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -inset-12 rounded-full blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(6,182,212,0.28) 52%, transparent 72%)',
          }}
        />

        {/* Animated NEXORA Brand Prism */}
        <motion.div
          initial={{ opacity: 0, scale: 0.78, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="relative z-10 rounded-3xl p-1"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.6), rgba(6,182,212,0.6))',
            boxShadow: '0 20px 50px -12px rgba(124, 58, 237, 0.5)',
          }}
        >
          <div className="w-20 h-20 rounded-[20px] bg-[#090F24] flex items-center justify-center">
            <svg width="46" height="46" viewBox="0 0 512 512" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="nxSplashGrad" x1="156" y1="144" x2="356" y2="368" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
              <path d="M156 368V144H202L310 296V144H356V368H310L202 216V368H156Z" fill="#F8FAFC" />
              <rect x="310" y="144" width="46" height="46" rx="10" fill="url(#nxSplashGrad)" />
            </svg>
          </div>
        </motion.div>

        {/* Wordmark & Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mt-6 text-center"
        >
          <h1 className="font-display text-3xl font-bold tracking-[0.22em] text-slate-950 dark:text-white pl-[0.22em]">
            NEXORA
          </h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 tracking-wide">
            Focus · Plan · Execute
          </p>
        </motion.div>

        {/* Precision Loading Hairline */}
        <div className="relative z-10 mt-8 w-44 h-1 rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'left center' }}
            className="h-full w-full nx-gradient-primary rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
};
