import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Compass,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useWorkspace } from '../../store/WorkspaceContext';
import { AvatarPresetId } from '../../types/auth';
import {
  evaluatePasswordStrength,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateRole,
} from '../../utils/validation';
import { AVATAR_PRESETS, AvatarBadge } from '../ui/AvatarBadge';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';

export const AccountProfileSection: React.FC = () => {
  const { user, providerKind, updateProfile, upgradeGuest, replayOnboarding, signOut } = useAuth();
  const { settings, updateSettings, pushToast } = useWorkspace();
  const navigate = useNavigate();

  // Edit Profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [role, setRole] = useState(user?.role ?? '');
  const [avatarId, setAvatarId] = useState<AvatarPresetId>(user?.avatarId ?? 'violet');
  const [profileError, setProfileError] = useState('');

  // Guest Upgrade state
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [upgradeName, setUpgradeName] = useState('');
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [upgradePassword, setUpgradePassword] = useState('');
  const [showUpgradePassword, setShowUpgradePassword] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [busy, setBusy] = useState(false);

  // Logout confirmation for guest users
  const [confirmGuestLogout, setConfirmGuestLogout] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setRole(user.role);
    setAvatarId(user.avatarId);
  }, [user]);

  if (!user) return null;

  const strength = evaluatePasswordStrength(upgradePassword);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateDisplayName(displayName);
    const roleErr = validateRole(role);
    if (nameErr || roleErr) {
      setProfileError(nameErr || roleErr || 'Check your profile details.');
      return;
    }

    setBusy(true);
    setProfileError('');
    try {
      const res = await updateProfile({
        displayName,
        role,
        avatarId,
        dailyFocusGoalMinutes: settings.dailyFocusGoalMinutes,
        profileCompleted: true,
      });
      if (res.ok) {
        updateSettings({ dailyFocusGoalMinutes: res.user.dailyFocusGoalMinutes });
        setEditingProfile(false);
        pushToast({ title: 'Profile updated', description: res.user.displayName, tone: 'success' });
      } else {
        setProfileError(res.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateDisplayName(upgradeName);
    const emailErr = validateEmail(upgradeEmail);
    const passErr = validatePassword(upgradePassword, true);
    if (nameErr || emailErr || passErr) {
      setUpgradeError(nameErr || emailErr || passErr || 'Please complete all fields.');
      return;
    }

    setBusy(true);
    setUpgradeError('');
    try {
      const res = await upgradeGuest({
        displayName: upgradeName,
        email: upgradeEmail,
        password: upgradePassword,
      });
      if (!res.ok) {
        setUpgradeError(res.message);
        return;
      }
      setShowUpgradeForm(false);
      setUpgradePassword('');
      pushToast({
        title: 'Guest account upgraded',
        description: `Signed in as ${res.user.email} with all workspace data preserved.`,
        tone: 'success',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    pushToast({
      title: 'Signed out',
      description: 'You have been signed out of NEXORA.',
      tone: 'neutral',
    });
    navigate('/auth', { replace: true });
  };

  return (
    <GlassCard as="section" variant="spotlight" className="p-5 sm:p-6 space-y-5">
      {/* Header Identity Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <AvatarBadge avatarId={user.avatarId} displayName={user.displayName} size="lg" />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white truncate">
              {user.displayName}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
              {user.role}
              <span aria-hidden="true"> · </span>
              <span>{user.isAnonymous ? 'Guest Mode Session' : user.email}</span>
            </p>
            <p className="text-[11px] font-mono text-purple-600 dark:text-cyan-300 mt-1">
              Auth adapter: {providerKind}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <GlowButton
            variant="secondary"
            size="sm"
            onClick={() => setEditingProfile((v) => !v)}
          >
            <Pencil className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
            <span>{editingProfile ? 'Close Editor' : 'Edit Profile'}</span>
          </GlowButton>

          {!confirmGuestLogout ? (
            <GlowButton
              variant="danger"
              size="sm"
              onClick={() => {
                if (user.isAnonymous) {
                  setConfirmGuestLogout(true);
                } else {
                  void handleLogout();
                }
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </GlowButton>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-300">Leave guest mode?</span>
              <GlowButton variant="danger" size="sm" onClick={() => void handleLogout()}>
                Sign Out
              </GlowButton>
              <GlowButton
                variant="ghost"
                size="sm"
                onClick={() => setConfirmGuestLogout(false)}
              >
                Cancel
              </GlowButton>
            </div>
          )}
        </div>
      </div>

      {/* Guest Mode Account Upgrade Prompt */}
      {user.isAnonymous && (
        <div className="rounded-xl border border-purple-500/35 dark:border-cyan-400/35 bg-purple-500/8 dark:bg-cyan-400/8 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  You&apos;re using NEXORA in Guest Mode
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Upgrade to a named local account to keep your tasks, schedule, and focus streak linked to your credentials.
                </p>
              </div>
            </div>
            <GlowButton
              variant="primary"
              size="sm"
              onClick={() => {
                setShowUpgradeForm((v) => !v);
                setUpgradeError('');
              }}
            >
              <UserCheck className="w-4 h-4" />
              <span>{showUpgradeForm ? 'Hide Upgrade' : 'Upgrade Account'}</span>
            </GlowButton>
          </div>

          {showUpgradeForm && (
            <form onSubmit={(e) => void handleUpgradeSubmit(e)} noValidate className="space-y-3.5 pt-3 border-t nx-divider">
              {upgradeError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-400/45 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{upgradeError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="upgrade-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    id="upgrade-name"
                    type="text"
                    value={upgradeName}
                    onChange={(e) => setUpgradeName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full min-h-[42px] px-3 py-2 text-sm rounded-xl nx-input"
                  />
                </div>
                <div>
                  <label htmlFor="upgrade-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    id="upgrade-email"
                    type="email"
                    value={upgradeEmail}
                    onChange={(e) => setUpgradeEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[42px] px-3 py-2 text-sm rounded-xl nx-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="upgrade-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <input
                    id="upgrade-password"
                    type={showUpgradePassword ? 'text' : 'password'}
                    value={upgradePassword}
                    onChange={(e) => setUpgradePassword(e.target.value)}
                    placeholder="Min. 8 chars with letter and number"
                    className="w-full min-h-[42px] pl-3 pr-10 py-2 text-sm rounded-xl nx-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUpgradePassword((v) => !v)}
                    aria-label={showUpgradePassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    {showUpgradePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {upgradePassword.length > 0 && (
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Strength: <span className="font-medium text-slate-800 dark:text-slate-200">{strength.label}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <GlowButton variant="ghost" size="sm" onClick={() => setShowUpgradeForm(false)}>
                  Cancel
                </GlowButton>
                <GlowButton type="submit" variant="primary" size="sm" disabled={busy}>
                  Save Account &amp; Keep Data
                </GlowButton>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Inline Profile Editor */}
      {editingProfile && (
        <form onSubmit={(e) => void handleSaveProfile(e)} className="space-y-4 pt-4 border-t nx-divider">
          {profileError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{profileError}</p>
          )}

          <div>
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Avatar Preset
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AVATAR_PRESETS.map((preset) => {
                const selected = preset.id === avatarId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAvatarId(preset.id)}
                    className={`relative p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      selected
                        ? 'border-purple-500/60 dark:border-cyan-400/60 bg-purple-500/10 dark:bg-cyan-400/10'
                        : 'nx-input hover:border-cyan-500/40'
                    }`}
                  >
                    <AvatarBadge avatarId={preset.id} displayName={displayName || 'NX'} size="sm" />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      {preset.label.split(' ')[0]}
                    </span>
                    {selected && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full nx-gradient-primary text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="settings-display-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <input
                id="settings-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 text-sm rounded-xl nx-input"
              />
            </div>
            <div>
              <label htmlFor="settings-role" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Role / Discipline
              </label>
              <input
                id="settings-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 text-sm rounded-xl nx-input"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={async () => {
                await replayOnboarding();
                navigate('/onboarding');
              }}
              className="text-xs font-medium text-slate-500 hover:text-purple-600 dark:hover:text-cyan-400 inline-flex items-center gap-1.5 transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Replay Onboarding Tour</span>
            </button>
            <div className="flex items-center gap-2">
              <GlowButton variant="ghost" size="sm" onClick={() => setEditingProfile(false)}>
                Cancel
              </GlowButton>
              <GlowButton type="submit" variant="primary" size="sm" disabled={busy}>
                Save Profile
              </GlowButton>
            </div>
          </div>
        </form>
      )}
    </GlassCard>
  );
};
