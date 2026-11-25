import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useWorkspace } from '../../store/WorkspaceContext';
import { AvatarPresetId } from '../../types/auth';
import { validateDisplayName, validateRole } from '../../utils/validation';
import { AVATAR_PRESETS, AvatarBadge } from '../../components/ui/AvatarBadge';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlowButton } from '../../components/ui/GlowButton';
import { PageTransition } from '../../components/ui/PageTransition';
import { formatDurationCompact } from '../../utils/date';

const ROLE_PRESETS = ['Engineer', 'Designer', 'Founder', 'Product', 'Student', 'Researcher'];
const FOCUS_GOALS = [60, 120, 180, 240, 300];

export const ProfileSetupPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { updateSettings, pushToast } = useWorkspace();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [role, setRole] = useState(user?.role && user.role !== 'Builder' ? user.role : 'Engineer');
  const [avatarId, setAvatarId] = useState<AvatarPresetId>(user?.avatarId ?? 'violet');
  const [dailyGoal, setDailyGoal] = useState<number>(user?.dailyFocusGoalMinutes ?? 180);

  const [errors, setErrors] = useState<{ displayName?: string; role?: string }>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateDisplayName(displayName);
    const roleErr = validateRole(role);
    if (nameErr || roleErr) {
      setErrors({ displayName: nameErr ?? undefined, role: roleErr ?? undefined });
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfile({
        displayName,
        role,
        avatarId,
        dailyFocusGoalMinutes: dailyGoal,
        profileCompleted: true,
      });
      if (res.ok) {
        updateSettings({ dailyFocusGoalMinutes: dailyGoal });
        pushToast({
          title: 'Workspace personalized',
          description: `Daily focus target set to ${formatDurationCompact(dailyGoal)}.`,
          tone: 'success',
        });
        navigate('/', { replace: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || user?.displayName || 'NEXORA User',
        role: role.trim() || 'Builder',
        avatarId,
        dailyFocusGoalMinutes: dailyGoal,
        profileCompleted: true,
      });
      updateSettings({ dailyFocusGoalMinutes: dailyGoal });
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center nx-ambient-backdrop text-slate-900 dark:text-slate-100 px-4 sm:px-6 py-8 pt-safe pb-safe">
      <main className="w-full max-w-2xl mx-auto">
        <PageTransition>
          <GlassCard variant="spotlight" className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b nx-divider">
              <div>
                <p className="text-xs font-semibold nx-gradient-text">Profile Setup</p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1">
                  Personalize your workspace
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Configure your identity and daily deep-work target. You can update these anytime.
                </p>
              </div>

              {/* Live Identity Preview */}
              <div className="flex items-center gap-3 rounded-2xl nx-glass px-4 py-3 shrink-0">
                <AvatarBadge
                  avatarId={avatarId}
                  displayName={displayName || 'NX'}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white truncate max-w-[140px]">
                    {displayName.trim() || 'Your Name'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                    {role.trim() || 'Role'} · <span className="font-mono tabular-nums">{formatDurationCompact(dailyGoal)}</span>
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-6">
              {/* Avatar Preset Grid */}
              <div>
                <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2.5">
                  Avatar Preset
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {AVATAR_PRESETS.map((preset) => {
                    const selected = preset.id === avatarId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarId(preset.id)}
                        aria-pressed={selected}
                        className={`relative p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          selected
                            ? 'border-purple-500/60 dark:border-cyan-400/60 bg-purple-500/10 dark:bg-cyan-400/10'
                            : 'nx-input hover:border-cyan-500/40'
                        }`}
                      >
                        <AvatarBadge
                          avatarId={preset.id}
                          displayName={displayName || 'NX'}
                          size="sm"
                        />
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-full">
                          {preset.label.split(' ')[0]}
                        </span>
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full nx-gradient-primary text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Display Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="profile-display-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Display Name
                  </label>
                  <input
                    id="profile-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (errors.displayName) setErrors((p) => ({ ...p, displayName: undefined }));
                    }}
                    placeholder="Alex Mercer"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400"
                  />
                  {errors.displayName && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                      {errors.displayName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="profile-role-input"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Role / Focus Discipline
                  </label>
                  <input
                    id="profile-role-input"
                    type="text"
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (errors.role) setErrors((p) => ({ ...p, role: undefined }));
                    }}
                    placeholder="e.g., Systems Engineer"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400"
                  />
                  {errors.role && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errors.role}</p>
                  )}
                </div>
              </div>

              {/* Quick Role Selectors */}
              <div className="flex flex-wrap gap-2">
                {ROLE_PRESETS.map((presetRole) => {
                  const active = role === presetRole;
                  return (
                    <button
                      key={presetRole}
                      type="button"
                      onClick={() => {
                        setRole(presetRole);
                        if (errors.role) setErrors((p) => ({ ...p, role: undefined }));
                      }}
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? 'nx-gradient-primary text-white shadow-sm'
                          : 'nx-glass text-slate-700 dark:text-slate-300 hover:border-cyan-400/45'
                      }`}
                    >
                      {presetRole}
                    </button>
                  );
                })}
              </div>

              {/* Daily Focus Goal */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Daily Focus Target
                  </span>
                  <span className="font-mono text-xs tabular-nums text-purple-600 dark:text-cyan-300">
                    {formatDurationCompact(dailyGoal)} / day
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {FOCUS_GOALS.map((mins) => {
                    const active = dailyGoal === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDailyGoal(mins)}
                        className={`min-h-[44px] px-2 py-2 rounded-xl font-mono text-xs tabular-nums font-medium transition-all ${
                          active
                            ? 'nx-glow-button text-white border border-white/15'
                            : 'nx-input text-slate-700 dark:text-slate-300 hover:border-cyan-400/45'
                        }`}
                      >
                        {formatDurationCompact(mins)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t nx-divider flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                <GlowButton
                  variant="ghost"
                  disabled={saving}
                  onClick={() => void handleSkip()}
                >
                  Skip for now
                </GlowButton>

                <GlowButton type="submit" variant="primary" size="lg" disabled={saving}>
                  <span>Enter NEXORA</span>
                  <ArrowRight className="w-4 h-4" />
                </GlowButton>
              </div>
            </form>
          </GlassCard>
        </PageTransition>
      </main>
    </div>
  );
};
