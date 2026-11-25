import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useWorkspace } from '../../store/WorkspaceContext';
import { DEMO_ACCOUNT_CREDENTIALS } from '../../platform/auth';
import {
  evaluatePasswordStrength,
  validateConfirmPassword,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from '../../utils/validation';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlowButton } from '../../components/ui/GlowButton';
import { PageTransition } from '../../components/ui/PageTransition';
import { SegmentedControl } from '../../components/ui/SegmentedControl';

type AuthMode = 'login' | 'signup';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, signInAsGuest, replayOnboarding } = useAuth();
  const { resolvedTheme, toggleThemeQuick, pushToast } = useWorkspace();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = evaluatePasswordStrength(password);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFieldErrors({});
    setFormError('');
  };

  const handleFillDemo = () => {
    setMode('login');
    setEmail(DEMO_ACCOUNT_CREDENTIALS.email);
    setPassword(DEMO_ACCOUNT_CREDENTIALS.password);
    setFieldErrors({});
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const nextErrors: typeof fieldErrors = {};
    if (mode === 'signup') {
      const nameErr = validateDisplayName(displayName);
      if (nameErr) nextErrors.displayName = nameErr;
    }

    const emailErr = validateEmail(email);
    if (emailErr) nextErrors.email = emailErr;

    const passErr = validatePassword(password, mode === 'signup');
    if (passErr) nextErrors.password = passErr;

    if (mode === 'signup') {
      const confirmErr = validateConfirmPassword(password, confirmPassword);
      if (confirmErr) nextErrors.confirmPassword = confirmErr;
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await signIn({ email, password });
        if (!res.ok) {
          setFormError(res.message);
          return;
        }
        pushToast({
          title: `Welcome back, ${res.user.displayName}`,
          description: 'Your local workspace is ready.',
          tone: 'success',
        });
        navigate(res.user.profileCompleted ? '/' : '/profile-setup', { replace: true });
      } else {
        const res = await signUp({ displayName, email, password });
        if (!res.ok) {
          setFormError(res.message);
          return;
        }
        pushToast({
          title: 'Account created',
          description: 'Personalize your focus profile to finish setup.',
          tone: 'success',
        });
        navigate('/profile-setup', { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestDemo = async () => {
    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between nx-ambient-backdrop text-slate-900 dark:text-slate-100 px-4 sm:px-6 py-5 pt-safe pb-safe">
      {/* Top Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 512 512" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="authMarkGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
            <rect
              width="512"
              height="512"
              rx="120"
              className="fill-slate-950 dark:fill-[#0D152D]"
              stroke="url(#authMarkGrad)"
              strokeOpacity="0.55"
              strokeWidth="22"
            />
            <path d="M156 368V144H202L310 296V144H356V368H310L202 216V368H156Z" fill="#F8FAFC" />
            <rect x="310" y="144" width="46" height="46" rx="10" fill="url(#authMarkGrad)" />
          </svg>
          <span className="font-display text-base font-bold tracking-wider text-slate-950 dark:text-white">
            NEXORA
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await replayOnboarding();
              navigate('/onboarding');
            }}
            className="min-h-[42px] px-3.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            Tour
          </button>
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
        </div>
      </header>

      {/* Auth Form Card */}
      <main className="w-full max-w-md mx-auto my-6">
        <PageTransition>
          <GlassCard variant="spotlight" className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {mode === 'login' ? 'Sign in to NEXORA' : 'Create your NEXORA account'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {mode === 'login'
                  ? 'Access your daily planner, focus sessions, and streak metrics.'
                  : 'Set up your personal local-first productivity workspace in seconds.'}
              </p>
            </div>

            <SegmentedControl<AuthMode>
              ariaLabel="Authentication mode"
              fullWidth
              value={mode}
              onChange={switchMode}
              options={[
                { value: 'login', label: 'Sign In' },
                { value: 'signup', label: 'Create Account' },
              ]}
            />

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-400/45 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (fieldErrors.displayName) {
                        setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
                      }
                    }}
                    placeholder="Alex Mercer"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400"
                  />
                  {fieldErrors.displayName && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.displayName}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="you@example.com"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400"
                />
                {fieldErrors.email && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={handleFillDemo}
                      className="text-xs font-medium text-purple-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Use Starter Profile</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    placeholder={mode === 'login' ? 'Enter your password' : 'Min. 8 chars, letter & number'}
                    className="w-full min-h-[44px] pl-3.5 pr-11 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                    {fieldErrors.password}
                  </p>
                )}

                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={`h-1 rounded-full transition-colors ${
                            strength.score >= step
                              ? strength.score === 3
                                ? 'bg-emerald-500'
                                : strength.score === 2
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              : 'bg-slate-900/10 dark:bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          strength.minLength ? 'text-emerald-600 dark:text-emerald-400' : ''
                        }`}
                      >
                        <Check className="w-3 h-3" /> 8+ chars
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 ${
                          strength.hasLetter ? 'text-emerald-600 dark:text-emerald-400' : ''
                        }`}
                      >
                        <Check className="w-3 h-3" /> Letter
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 ${
                          strength.hasNumber ? 'text-emerald-600 dark:text-emerald-400' : ''
                        }`}
                      >
                        <Check className="w-3 h-3" /> Number
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-confirm"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="auth-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="Re-enter your password"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400"
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              <GlowButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={submitting}
                className="w-full mt-1"
              >
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </GlowButton>
            </form>

            {/* Divider */}
            <div className="relative flex items-center py-0.5">
              <div className="flex-grow border-t nx-divider" />
              <span className="shrink mx-3 text-xs text-slate-500 dark:text-slate-400">or</span>
              <div className="flex-grow border-t nx-divider" />
            </div>

            {/* Guest Mode CTA */}
            <GlowButton
              variant="secondary"
              size="lg"
              disabled={submitting}
              onClick={() => void handleGuestDemo()}
              className="w-full"
            >
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
              <span>Continue as Guest</span>
            </GlowButton>

            <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Local-first on-device workspace · Google Drive backup available in Settings
            </p>
          </GlassCard>
        </PageTransition>
      </main>

      <footer className="w-full max-w-5xl mx-auto text-center text-xs text-slate-500 dark:text-slate-500">
        Starter login: <span className="font-mono">{DEMO_ACCOUNT_CREDENTIALS.email}</span> /{' '}
        <span className="font-mono">{DEMO_ACCOUNT_CREDENTIALS.password}</span>
      </footer>
    </div>
  );
};
