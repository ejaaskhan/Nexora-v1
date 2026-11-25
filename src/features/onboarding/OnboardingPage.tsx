import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useWorkspace } from '../../store/WorkspaceContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlowButton } from '../../components/ui/GlowButton';
import { NX_SPRINGS } from '../../design/tokens';

interface OnboardingSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  visual: 'focus' | 'planner' | 'offline';
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'focus',
    eyebrow: '01. Focus Studio',
    title: 'Deep work engineered for zero drift',
    description:
      'Launch timestamp-synchronized focus sessions directly from your daily plan. Stay locked in with a luminous precision dial, synthesized completion chimes, and distraction-free intention tracking.',
    highlights: [
      'Accurate countdowns even across background tabs',
      'Direct task and time-block binding',
      'Automatic session logging into your focus ledger',
    ],
    visual: 'focus',
  },
  {
    id: 'planner',
    eyebrow: '02. Daily Planner',
    title: 'Connect what matters with when it happens',
    description:
      'Map out protected execution blocks across a 7-day horizon, detect schedule overlaps before they derail your morning, and convert backlog tasks into concrete time slots in a single tap.',
    highlights: [
      'Interactive 7-day timeline with quick slot triggers',
      'Real-time schedule conflict detection',
      'Instant handoff from any time block to Focus Studio',
    ],
    visual: 'planner',
  },
  {
    id: 'offline',
    eyebrow: '03. Local-First & Mobile Ready',
    title: 'Private, offline-capable, built for every screen',
    description:
      'Your schedule and focus history live locally on your device with versioned JSON export and import. Install NEXORA as an offline PWA today with a clean path to native Android.',
    highlights: [
      'Instant local persistence with full JSON portability',
      'Responsive Mobile, Tablet rail, and Desktop layouts',
      'Start immediately in Guest Mode or create your profile',
    ],
    visual: 'offline',
  },
];

const SlideVisual: React.FC<{ kind: OnboardingSlide['visual'] }> = ({ kind }) => {
  if (kind === 'focus') {
    return (
      <div className="relative flex flex-col items-center justify-center py-6">
        <div
          aria-hidden="true"
          className="absolute w-44 h-44 rounded-full blur-3xl opacity-55"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(6,182,212,0.3) 60%, transparent 80%)',
          }}
        />
        <div className="relative z-10 w-48 h-48 flex items-center justify-center">
          <svg width="192" height="192" viewBox="0 0 192 192" className="-rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id="obFocusGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
            <circle
              cx="96"
              cy="96"
              r="78"
              fill="none"
              strokeWidth="6"
              className="stroke-slate-900/10 dark:stroke-white/10"
            />
            <circle
              cx="96"
              cy="96"
              r="78"
              fill="none"
              stroke="url(#obFocusGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 78}
              strokeDashoffset={2 * Math.PI * 78 * 0.28}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Timer className="w-4 h-4 text-purple-600 dark:text-cyan-400 mb-1" />
            <span className="font-mono text-3xl font-semibold tabular-nums text-slate-950 dark:text-white">
              36:00
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Deep Work</span>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'planner') {
    const sampleBlocks = [
      { time: '09:00–10:30', title: 'Architecture Deep Work', meta: 'Deep Work · 90m', active: true },
      { time: '11:00–11:45', title: 'Sprint Roadmap Review', meta: 'Planning · 45m', active: false },
      { time: '14:00–15:00', title: 'Mobile Touch Audit', meta: 'Deep Work · 60m', active: false },
    ];
    return (
      <div className="w-full max-w-xs mx-auto space-y-2.5 py-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-purple-600 dark:text-cyan-300">
            <CalendarClock className="w-3.5 h-3.5" />
            Daily Timeline
          </span>
          <span className="font-mono tabular-nums">3 blocks</span>
        </div>
        {sampleBlocks.map((blk) => (
          <div
            key={blk.time}
            className={`rounded-xl p-3.5 border transition-all ${
              blk.active
                ? 'border-purple-500/45 dark:border-cyan-400/45 bg-purple-500/10 dark:bg-cyan-400/10'
                : 'nx-glass'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-cyan-300">
              <span>{blk.time}</span>
              <span>{blk.active ? 'In progress' : 'Scheduled'}</span>
            </div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white mt-1">{blk.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{blk.meta}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs mx-auto py-4 space-y-3">
      <div className="rounded-2xl nx-glass-elevated p-4 border border-cyan-400/35">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl nx-gradient-primary flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">
              Local-First Vault
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Offline PWA · JSON Backup Ready
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Offline', value: '100%' },
            { label: 'Export', value: 'JSON' },
            { label: 'Mobile', value: 'PWA' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-slate-900/5 dark:bg-white/5 px-2 py-2.5 border nx-divider"
            >
              <p className="font-mono text-sm font-semibold text-purple-600 dark:text-cyan-300">
                {item.value}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const OnboardingPage: React.FC = () => {
  const { completeOnboarding, signInAsGuest } = useAuth();
  const { resolvedTheme, toggleThemeQuick, pushToast } = useWorkspace();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [busyGuest, setBusyGuest] = useState(false);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const goToSlide = (nextIdx: number) => {
    setDirection(nextIdx > index ? 1 : -1);
    setIndex(nextIdx);
  };

  const handleSkipOrFinish = async () => {
    await completeOnboarding();
    navigate('/auth', { replace: true });
  };

  const handleGuestDemo = async () => {
    setBusyGuest(true);
    try {
      const res = await signInAsGuest();
      if (res.ok) {
        pushToast({
          title: 'Guest Mode Active',
          description: 'Starter workspace ready. Create an account anytime in Settings.',
          tone: 'success',
        });
        navigate('/', { replace: true });
      }
    } finally {
      setBusyGuest(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between nx-ambient-backdrop text-slate-900 dark:text-slate-100 px-4 sm:px-6 py-5 pt-safe pb-safe">
      {/* Top Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 512 512" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="obMarkGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
            <rect
              width="512"
              height="512"
              rx="120"
              className="fill-slate-950 dark:fill-[#0D152D]"
              stroke="url(#obMarkGrad)"
              strokeOpacity="0.55"
              strokeWidth="22"
            />
            <path d="M156 368V144H202L310 296V144H356V368H310L202 216V368H156Z" fill="#F8FAFC" />
            <rect x="310" y="144" width="46" height="46" rx="10" fill="url(#obMarkGrad)" />
          </svg>
          <span className="font-display text-base font-bold tracking-wider text-slate-950 dark:text-white">
            NEXORA
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleThemeQuick}
            aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="min-h-[42px] min-w-[42px] rounded-xl nx-glass flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-cyan-400/50 transition-colors"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-cyan-400" />
            ) : (
              <Moon className="w-4 h-4 text-purple-600" />
            )}
          </button>
          <button
            type="button"
            onClick={() => void handleSkipOrFinish()}
            className="min-h-[42px] px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            Skip
          </button>
        </div>
      </header>

      {/* Main Centered Onboarding Card */}
      <main className="w-full max-w-4xl mx-auto my-6">
        <GlassCard variant="spotlight" className="p-6 sm:p-8 lg:p-10 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
              transition={prefersReduced ? { duration: 0 } : NX_SPRINGS.smooth}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            >
              {/* Visual Showcase */}
              <div className="lg:col-span-5 flex items-center justify-center rounded-2xl bg-slate-900/[0.03] dark:bg-white/[0.03] border nx-divider p-5 min-h-[260px]">
                <SlideVisual kind={slide.visual} />
              </div>

              {/* Copy & Highlights */}
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <p className="text-xs font-semibold nx-gradient-text">{slide.eyebrow}</p>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-2">
                    {slide.title}
                  </h1>
                  <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                    {slide.description}
                  </p>
                </div>

                <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-200">
                  {slide.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-2 w-1.5 h-1.5 rounded-full nx-gradient-primary shrink-0"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Footer Controls */}
          <div className="mt-8 pt-6 border-t nx-divider flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Step Indicators */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Onboarding steps">
              {SLIDES.map((item, idx) => {
                const active = idx === index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`Slide ${idx + 1}: ${item.eyebrow}`}
                    onClick={() => goToSlide(idx)}
                    className={`h-2.5 rounded-full transition-all ${
                      active
                        ? 'w-8 nx-gradient-primary'
                        : 'w-2.5 bg-slate-400/40 dark:bg-slate-600 hover:bg-slate-400'
                    }`}
                  />
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {index > 0 && (
                <GlowButton variant="ghost" onClick={() => goToSlide(index - 1)}>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </GlowButton>
              )}

              <GlowButton
                variant="secondary"
                disabled={busyGuest}
                onClick={() => void handleGuestDemo()}
              >
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
                <span>Continue as Guest</span>
              </GlowButton>

              {isLast ? (
                <GlowButton variant="primary" onClick={() => void handleSkipOrFinish()}>
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </GlowButton>
              ) : (
                <GlowButton variant="primary" onClick={() => goToSlide(index + 1)}>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </GlowButton>
              )}
            </div>
          </div>
        </GlassCard>
      </main>

      <footer className="w-full max-w-5xl mx-auto text-center text-xs text-slate-500 dark:text-slate-500">
        NEXORA · Local-first focus and daily planning workspace
      </footer>
    </div>
  );
};
